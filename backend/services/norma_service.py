import json
from datetime import date
from typing import Optional

from db.connection import get_cursor
from models.entities import LogAuditoria, Norma
from repositories.auditoria_repository import AuditoriaRepository
from repositories.norma_repository import NormaRepository
from services.auth_service import AuthService


class ValidacionError(Exception):
    pass


class NormaService:

    def __init__(self, auth_service: AuthService):
        self._repo = NormaRepository()
        self._auditoria_repo = AuditoriaRepository()
        self._auth = auth_service

    def buscar(self, texto: Optional[str] = None, id_estado_vigencia: Optional[int] = None,
               id_tipo_norma: Optional[int] = None,
               id_estado_cumplimiento: Optional[int] = None) -> list[Norma]:
        return self._repo.listar(filtro_texto=texto, id_estado_vigencia=id_estado_vigencia,
                                  id_tipo_norma=id_tipo_norma,
                                  id_estado_cumplimiento=id_estado_cumplimiento)

    def buscar_sin_cumplimiento(self) -> list[Norma]:
        return self._repo.listar_sin_cumplimiento()

    def buscar_no_cumple(self) -> list[Norma]:
        return self._repo.listar_no_cumple()

    def matriz_expandida(self) -> list[dict]:
        return self._repo.matriz_expandida()

    def obtener_por_id(self, id_norma: int) -> Optional[Norma]:
        return self._repo.obtener_por_id(id_norma)

    def contar_total(self) -> int:
        return self._repo.contar_total()

    def resumen_cumplimiento(self) -> dict:
        return self._repo.resumen_cumplimiento()

    def proximas_revisiones(self, dias: int = 30) -> list[dict]:
        return self._repo.proximas_revisiones(dias)

    def registrar(self, norma: Norma) -> Norma:
        self._auth.verificar_permiso_escritura()
        self._validar(norma)
        norma_creada = self._repo.crear(norma)
        usuario = self._auth.obtener_usuario_actual()
        self._auditoria_repo.registrar(LogAuditoria(
            id_log=None, id_usuario=usuario.id_usuario, tipo_operacion="CREACION",
            entidad_afectada="norma", id_entidad_afectada=norma_creada.id_norma,
            descripcion_registro=f"Nueva norma registrada — {norma_creada.nombre_tipo_norma} {norma_creada.numero}/{norma_creada.anio}: {norma_creada.titulo[:60]}",
        ))
        return norma_creada

    def editar(self, norma: Norma) -> None:
        self._auth.verificar_permiso_escritura()
        self._validar(norma)
        anterior = self._repo.obtener_por_id(norma.id_norma)
        if not anterior:
            raise ValidacionError(f"No existe una norma con id {norma.id_norma}.")

        usuario = self._auth.obtener_usuario_actual()
        with get_cursor(commit=True) as cur:
            cur.execute(
                "SELECT COALESCE(MAX(numero_version), 0) + 1 AS siguiente FROM version_norma WHERE id_norma = %s",
                (norma.id_norma,),
            )
            siguiente_version = cur.fetchone()["siguiente"]
            cur.execute(
                """
                INSERT INTO version_norma (id_norma, numero_version, contenido_anterior)
                VALUES (%s, %s, %s)
                """,
                (norma.id_norma, siguiente_version,
                 json.dumps(self._serializar(anterior), default=str)),
            )

        self._repo.actualizar(norma)
        cambios = self._diferencias(anterior, norma)
        self._auditoria_repo.registrar(LogAuditoria(
            id_log=None, id_usuario=usuario.id_usuario, tipo_operacion="EDICION",
            entidad_afectada="norma", id_entidad_afectada=norma.id_norma,
            descripcion_registro=f"Actualización de norma — {norma.nombre_tipo_norma} {norma.numero}/{norma.anio}: {norma.titulo[:60]}",
            # RF-006: qué campos se modificaron (antes → después), además de quién y cuándo.
            detalle={"version_anterior": siguiente_version - 1, "campos_modificados": cambios},
        ))

    def historial_versiones(self, id_norma: int) -> list[dict]:
        with get_cursor() as cur:
            cur.execute(
                """
                SELECT v.numero_version, v.contenido_anterior, v.fecha_version
                FROM version_norma v
                WHERE v.id_norma = %s
                ORDER BY v.numero_version DESC
                """,
                (id_norma,),
            )
            return [dict(row) for row in cur.fetchall()]

    def eliminar(self, id_norma: int) -> None:
        self._auth.verificar_permiso_escritura()
        norma = self._repo.obtener_por_id(id_norma)
        if not norma:
            raise ValidacionError(f"No existe una norma con id {id_norma}.")
        usuario = self._auth.obtener_usuario_actual()
        # Primero se elimina y SOLO si tuvo éxito se audita: el log es inmutable, así que
        # no puede quedar un registro de una eliminación que en realidad falló.
        self._repo.eliminar(id_norma)
        self._auditoria_repo.registrar(LogAuditoria(
            id_log=None, id_usuario=usuario.id_usuario, tipo_operacion="ELIMINACION",
            entidad_afectada="norma", id_entidad_afectada=id_norma,
            descripcion_registro=f"Eliminación: {norma.nombre_tipo_norma} {norma.numero}/{norma.anio} — {norma.titulo}",
            detalle={"datos_eliminados": self._serializar(norma)},
        ))

    @staticmethod
    def _validar(norma: Norma) -> None:
        from utils.validators import validar_guardar
        import re

        errores_raw = validar_guardar([
            (str(norma.numero or ""),    "alfanum", "Número de norma", True),
            (str(norma.anio or ""),      "anio",    "Año",            True),
            (str(norma.titulo or ""),    "desc",    "Título",         True),
        ], accion="guardar")

        if norma.responsable_cargo:
            v = norma.responsable_cargo.strip()
            if any(c.isdigit() for c in v):
                errores_raw.append(
                    "No es posible guardar. El campo 'Responsable' solo permite letras y espacios. "
                    "Retire los números ingresados.")

        if errores_raw:
            raise ValidacionError("\n".join(errores_raw))

    @staticmethod
    def _serializar(norma: Norma) -> dict:
        return {
            "numero": norma.numero, "anio": norma.anio, "titulo": norma.titulo,
            "descripcion": norma.descripcion, "id_estado_vigencia": norma.id_estado_vigencia,
            "id_tipo_norma": norma.id_tipo_norma, "id_entidad_emisora": norma.id_entidad_emisora,
            "fecha_vigencia": norma.fecha_vigencia,
            "id_frecuencia_seguimiento": norma.id_frecuencia_seguimiento,
            "exigencia_legal": norma.exigencia_legal,
            "responsable_cargo": norma.responsable_cargo,
            "registros_evidencia_tipo": norma.registros_evidencia_tipo,
        }

    @classmethod
    def _diferencias(cls, antes: Norma, despues: Norma) -> dict:
        """Campos cuyo valor cambió: {campo: {"antes": ..., "despues": ...}} (valores como texto)."""
        a, d = cls._serializar(antes), cls._serializar(despues)
        texto = lambda v: None if v is None else str(v)  # noqa: E731 (JSON-safe: fechas, etc.)
        return {k: {"antes": texto(a[k]), "despues": texto(d[k])}
                for k in d if texto(a.get(k)) != texto(d[k])}
