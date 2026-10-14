import json
from typing import Optional

from db.connection import get_cursor
from models.entities import LogAuditoria


class AuditoriaRepository:

    def registrar(self, log: LogAuditoria) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute(
                """
                INSERT INTO log_auditoria (id_usuario, tipo_operacion, entidad_afectada,
                                            id_entidad_afectada, descripcion_registro, detalle)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (log.id_usuario, log.tipo_operacion, log.entidad_afectada,
                 log.id_entidad_afectada, log.descripcion_registro, json.dumps(log.detalle or {})),
            )

    def listar(self, id_usuario: Optional[int] = None,
                tipo_operacion: Optional[str] = None,
                entidad_afectada: Optional[str] = None,
                limite: int = 200) -> list[dict]:
        """RF-021: filtrado combinable por usuario, tipo de operación y entidad afectada."""
        condiciones, parametros = [], []
        if id_usuario:
            condiciones.append("l.id_usuario = %s")
            parametros.append(id_usuario)
        if tipo_operacion:
            condiciones.append("l.tipo_operacion = %s")
            parametros.append(tipo_operacion)
        if entidad_afectada:
            condiciones.append("l.entidad_afectada = %s")
            parametros.append(entidad_afectada)

        sql = """
            SELECT l.id_log, l.tipo_operacion, l.entidad_afectada,
                   l.id_entidad_afectada, l.descripcion_registro, l.detalle, l.fecha_hora,
                   u.nombre_usuario, u.nombre_completo, r.nombre_rol
            FROM log_auditoria l
            JOIN usuario u ON u.id_usuario = l.id_usuario
            JOIN rol r ON r.id_rol = u.id_rol
        """
        if condiciones:
            sql += " WHERE " + " AND ".join(condiciones)
        sql += " ORDER BY l.fecha_hora DESC LIMIT %s"
        parametros.append(limite)

        with get_cursor() as cur:
            cur.execute(sql, tuple(parametros))
            return [dict(row) for row in cur.fetchall()]
