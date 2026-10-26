"""RF-014 / RF-015 — Consulta y filtrado del log de auditoría (solo lectura)."""
from typing import Optional

from models.entities import LogAuditoria
from repositories.auditoria_repository import AuditoriaRepository

# RF-015: filtro por tipo de operación (crear, editar, eliminar, exportar).
TIPOS_OPERACION = {
    "CREACION": "Creación",
    "EDICION": "Edición",
    "ELIMINACION": "Eliminación",
    "EXPORTACION": "Exportación",
}


class AuditoriaService:

    def __init__(self):
        self._repo = AuditoriaRepository()

    def consultar(self, tipo_operacion: Optional[str] = None, limite: int = 500) -> list[dict]:
        if tipo_operacion and tipo_operacion not in TIPOS_OPERACION:
            raise ValueError("Tipo de operación no válido.")
        return self._repo.listar(tipo_operacion=tipo_operacion or None, limite=limite)

    def registrar(self, log: LogAuditoria) -> None:
        self._repo.registrar(log)

    def historial_de(self, entidad: str, id_entidad: int) -> list[dict]:
        return self._repo.listar_por_entidad(entidad, id_entidad)
