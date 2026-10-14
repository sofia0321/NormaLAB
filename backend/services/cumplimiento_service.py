from datetime import date
from typing import Optional

from models.entities import LogAuditoria, SeguimientoCumplimiento
from repositories.auditoria_repository import AuditoriaRepository
from repositories.norma_repository import NormaRepository
from repositories.seguimiento_repository import SeguimientoRepository
from services.auth_service import AuthService
from services.norma_service import ValidacionError


class CumplimientoService:

    def __init__(self, auth_service: AuthService):
        self._repo = SeguimientoRepository()
        self._norma_repo = NormaRepository()
        self._auditoria_repo = AuditoriaRepository()
        self._auth = auth_service

    def obtener_ultimo(self, id_norma: int) -> Optional[SeguimientoCumplimiento]:
        return self._repo.obtener_ultimo_por_norma(id_norma)

    def historial(self, id_norma: int) -> list[SeguimientoCumplimiento]:
        return self._repo.listar_historial_por_norma(id_norma)

    def eliminar_seguimiento(self, id_seguimiento: int) -> None:
        self._auth.verificar_permiso_escritura()
        usuario = self._auth.obtener_usuario_actual()
        self._auditoria_repo.registrar(LogAuditoria(
            id_log=None, id_usuario=usuario.id_usuario, tipo_operacion="ELIMINACION",
            entidad_afectada="seguimiento_cumplimiento",
            id_entidad_afectada=id_seguimiento,
            descripcion_registro="Eliminación de seguimiento de cumplimiento registrado en el sistema.",
        ))
        self._repo.eliminar(id_seguimiento)

    def _nombre_norma(self, id_norma: int) -> str:
        try:
            from repositories.norma_repository import NormaRepository
            norma = NormaRepository().obtener_por_id(id_norma)
            if norma:
                return f"{norma.nombre_tipo_norma} {norma.numero}/{norma.anio}"
        except Exception:
            pass
        return f"norma #{id_norma}"

    def registrar_seguimiento(self, seguimiento: SeguimientoCumplimiento) -> SeguimientoCumplimiento:
        self._auth.verificar_permiso_escritura()
        if not seguimiento.fecha_evaluacion:
            seguimiento.fecha_evaluacion = date.today()

        usuario = self._auth.obtener_usuario_actual()
        seguimiento.id_usuario_registro = usuario.id_usuario
        creado = self._repo.registrar(seguimiento)
        self._norma_repo.actualizar_fecha_ultima_evaluacion(
            seguimiento.id_norma, seguimiento.fecha_evaluacion
        )
        self._auditoria_repo.registrar(LogAuditoria(
            id_log=None, id_usuario=usuario.id_usuario, tipo_operacion="EDICION",
            entidad_afectada="seguimiento_cumplimiento", id_entidad_afectada=creado.id_seguimiento,
            descripcion_registro=f"Seguimiento de cumplimiento — {self._nombre_norma(seguimiento.id_norma)}",
        ))
        return creado
