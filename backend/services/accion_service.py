"""RF-012 / RF-013 / RF-017 / RF-018 — Acciones correctivas."""
from datetime import date
from typing import Optional

from models.entities import LogAuditoria
from repositories.accion_repository import AccionRepository
from repositories.norma_repository import NormaRepository
from services.auth_service import AuthService
from services.norma_service import ValidacionError
from utils.validators import validar_guardar

# RF-012: solo se registra sobre normas en estos estados de cumplimiento.
ESTADOS_NORMA_ELEGIBLES = ("No Cumple", "En Proceso")
# Estados de avance que el usuario puede elegir ('Vencida' se calcula por fecha, no se elige).
ESTADOS_AVANCE = ("Pendiente", "En Proceso", "Cerrada")


class FechaVencidaError(ValidacionError):
    """RF-012: fecha límite ya vencida; se permite continuar solo con confirmación explícita."""


class AccionService:

    def __init__(self, auth_service: AuthService):
        self._repo = AccionRepository()
        self._normas = NormaRepository()
        self._auditoria = None
        self._auth = auth_service

    # lazy para evitar import circular y mantener el patrón de los otros servicios
    def _audit(self, log: LogAuditoria) -> None:
        if self._auditoria is None:
            from repositories.auditoria_repository import AuditoriaRepository
            self._auditoria = AuditoriaRepository()
        self._auditoria.registrar(log)

    # ---- RF-013 -----------------------------------------------------------
    def consultar(self, id_estado=None, responsable=None, id_norma=None) -> list[dict]:
        return self._repo.listar(id_estado=id_estado, responsable=responsable or None,
                                 id_norma=id_norma)

    def obtener(self, id_accion: int) -> Optional[dict]:
        return self._repo.obtener_por_id(id_accion)

    def de_norma(self, id_norma: int) -> list[dict]:
        return self._repo.listar(id_norma=id_norma)

    @staticmethod
    def norma_admite_acciones(estado_cumplimiento: Optional[str]) -> bool:
        return estado_cumplimiento in ESTADOS_NORMA_ELEGIBLES

    # ---- Validaciones comunes ---------------------------------------------
    @staticmethod
    def _validar_campos(descripcion, responsable, articulo, accion) -> None:
        errores = validar_guardar([
            (descripcion, "desc", "Descripción de la acción", True),
            (responsable, "texto", "Responsable", True),
            (articulo, "desc", "Artículo relacionado", False),
        ], accion=accion)
        if errores:
            raise ValidacionError("\n".join(errores))

    @staticmethod
    def _parsear_fecha(texto: str) -> date:
        try:
            return date.fromisoformat((texto or "").strip())
        except ValueError:
            raise ValidacionError("La fecha límite es obligatoria y debe ser una fecha válida.")

    # ---- RF-012 -----------------------------------------------------------
    def registrar(self, id_norma: Optional[int], descripcion: str, responsable: str,
                  fecha_limite: str, articulo: str = "",
                  confirmar_vencida: bool = False) -> dict:
        self._auth.verificar_permiso_escritura()
        descripcion, responsable, articulo = (descripcion or "").strip(), (responsable or "").strip(), (articulo or "").strip()
        self._validar_campos(descripcion, responsable, articulo, "guardar")
        fecha = self._parsear_fecha(fecha_limite)

        norma = self._normas.obtener_por_id(id_norma) if id_norma else None
        if not norma:
            raise ValidacionError("Seleccione una norma válida que exista en el sistema.")
        if not self.norma_admite_acciones(norma.ultimo_estado_cumplimiento):
            raise ValidacionError(
                "No es posible registrar una acción correctiva sobre una norma en estado "
                f"'{norma.ultimo_estado_cumplimiento or 'Sin evaluar'}'. Solo se permite cuando la "
                "norma está en 'No Cumple' o 'En Proceso'.")
        if fecha < date.today() and not confirmar_vencida:
            raise FechaVencidaError(
                "La fecha límite ingresada ya está vencida. Confirme explícitamente para continuar.")

        usuario = self._auth.obtener_usuario_actual()
        id_pendiente = self._repo.id_estado("Pendiente")
        creada = self._repo.crear(norma.id_norma, descripcion, articulo or None, responsable,
                                  fecha, id_pendiente, usuario.id_usuario)
        self._audit(LogAuditoria(
            id_log=None, id_usuario=usuario.id_usuario, tipo_operacion="CREACION",
            entidad_afectada="accion_correctiva", id_entidad_afectada=creada["id_accion"],
            descripcion_registro=f"Acción correctiva {creada['codigo']} — {norma.nombre_tipo_norma} {norma.numero}/{norma.anio}",
            detalle={"codigo": creada["codigo"], "id_norma": norma.id_norma, "responsable": responsable,
                     "fecha_limite": str(fecha), "estado": "Pendiente",
                     "fecha_vencida_confirmada": bool(fecha < date.today())},
        ))
        return creada

    # ---- RF-018 -----------------------------------------------------------
    def editar(self, id_accion: int, descripcion: str, responsable: str, fecha_limite: str,
               id_estado: Optional[int], articulo: str = "") -> None:
        self._auth.verificar_permiso_escritura()
        actual = self._repo.obtener_por_id(id_accion)
        if not actual:
            raise ValidacionError("La acción correctiva que intenta editar no existe.")
        if actual["estado"] == "Cerrada":
            raise ValidacionError(
                "No es posible editar una acción correctiva en estado 'Cerrada': hace parte del "
                "historial formal de cumplimiento del SG-SST y su integridad debe preservarse.")

        descripcion, responsable, articulo = (descripcion or "").strip(), (responsable or "").strip(), (articulo or "").strip()
        self._validar_campos(descripcion, responsable, articulo, "actualizar")
        fecha = self._parsear_fecha(fecha_limite)
        ids_validos = {self._repo.id_estado(n): n for n in ESTADOS_AVANCE}
        if id_estado not in ids_validos:
            raise ValidacionError("Seleccione un estado de avance válido.")
        nuevo_estado = ids_validos[id_estado]
        fecha_cierre = date.today() if nuevo_estado == "Cerrada" else None

        antes = {"descripcion": actual["descripcion"], "responsable": actual["nombre_responsable"],
                 "fecha_limite": actual["fecha_compromiso"], "estado": actual["estado"],
                 "articulo": actual["articulo_relacionado_texto"]}
        despues = {"descripcion": descripcion, "responsable": responsable, "fecha_limite": fecha,
                   "estado": nuevo_estado, "articulo": articulo or None}
        txt = lambda v: None if v is None else str(v)  # noqa: E731
        cambios = {k: {"antes": txt(antes[k]), "despues": txt(despues[k])}
                   for k in despues if txt(antes[k]) != txt(despues[k])}

        usuario = self._auth.obtener_usuario_actual()
        self._repo.actualizar(id_accion, descripcion, articulo or None, responsable, fecha,
                              id_estado, fecha_cierre)
        self._audit(LogAuditoria(
            id_log=None, id_usuario=usuario.id_usuario, tipo_operacion="EDICION",
            entidad_afectada="accion_correctiva", id_entidad_afectada=id_accion,
            descripcion_registro=f"Actualización de acción correctiva {actual['codigo']} — {actual['norma']}",
            detalle={"codigo": actual["codigo"], "campos_modificados": cambios},
        ))

    # ---- RF-017 -----------------------------------------------------------
    def eliminar(self, id_accion: int) -> None:
        self._auth.verificar_permiso_escritura()
        actual = self._repo.obtener_por_id(id_accion)
        if not actual:
            raise ValidacionError("La acción correctiva que intenta eliminar no existe.")
        if actual["estado"] == "Cerrada":
            raise ValidacionError(
                "No es posible eliminar una acción correctiva en estado 'Cerrada': hace parte del "
                "historial formal de cumplimiento del SG-SST y su integridad debe preservarse.")
        usuario = self._auth.obtener_usuario_actual()
        self._repo.eliminar(id_accion)   # se audita solo si la eliminación tuvo éxito
        self._audit(LogAuditoria(
            id_log=None, id_usuario=usuario.id_usuario, tipo_operacion="ELIMINACION",
            entidad_afectada="accion_correctiva", id_entidad_afectada=id_accion,
            descripcion_registro=f"Eliminación de acción correctiva {actual['codigo']} — {actual['norma']}",
            detalle={"codigo": actual["codigo"], "descripcion": actual["descripcion"],
                     "responsable": actual["nombre_responsable"], "estado": actual["estado"],
                     "fecha_limite": str(actual["fecha_compromiso"])},
        ))
