from typing import Optional

from db.connection import get_cursor
from models.entities import SeguimientoCumplimiento

_SELECT_BASE = """
    SELECT sc.id_seguimiento, sc.id_norma, sc.id_estado_cumplimiento,
           sc.nombre_responsable, sc.fecha_evaluacion,
           sc.acciones_realizadas, sc.id_usuario_registro,
           sc.fecha_registro,
           ec.nombre_estado AS nombre_estado_cumplimiento
    FROM seguimiento_cumplimiento sc
    JOIN estado_cumplimiento ec ON ec.id_estado_cumplimiento = sc.id_estado_cumplimiento
"""


class SeguimientoRepository:

    def obtener_ultimo_por_norma(self, id_norma: int) -> Optional[SeguimientoCumplimiento]:
        with get_cursor() as cur:
            cur.execute(
                _SELECT_BASE + """
                WHERE sc.id_norma = %s
                ORDER BY sc.fecha_evaluacion DESC, sc.id_seguimiento DESC
                LIMIT 1
                """,
                (id_norma,),
            )
            row = cur.fetchone()
            return self._map(row) if row else None

    def listar_historial_por_norma(self, id_norma: int) -> list[SeguimientoCumplimiento]:
        with get_cursor() as cur:
            cur.execute(
                _SELECT_BASE + """
                WHERE sc.id_norma = %s
                ORDER BY sc.fecha_evaluacion DESC, sc.id_seguimiento DESC
                """,
                (id_norma,),
            )
            return [self._map(row) for row in cur.fetchall()]

    def obtener_por_id(self, id_seguimiento: int) -> Optional[SeguimientoCumplimiento]:
        with get_cursor() as cur:
            cur.execute(_SELECT_BASE + " WHERE sc.id_seguimiento = %s", (id_seguimiento,))
            row = cur.fetchone()
            return self._map(row) if row else None

    def contar_por_estado(self, id_norma: int, nombre_estado: str,
                          excluyendo: Optional[int] = None) -> int:
        """Cuántos seguimientos de la norma tienen ese estado (opcionalmente sin contar uno)."""
        with get_cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*) AS n
                FROM seguimiento_cumplimiento sc
                JOIN estado_cumplimiento ec ON ec.id_estado_cumplimiento = sc.id_estado_cumplimiento
                WHERE sc.id_norma = %s AND ec.nombre_estado = %s
                  AND (%s IS NULL OR sc.id_seguimiento <> %s)
                """,
                (id_norma, nombre_estado, excluyendo, excluyendo),
            )
            return cur.fetchone()["n"]

    def eliminar(self, id_seguimiento: int) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute(
                "DELETE FROM seguimiento_cumplimiento WHERE id_seguimiento = %s",
                (id_seguimiento,),
            )

    def registrar(self, seguimiento: SeguimientoCumplimiento) -> SeguimientoCumplimiento:
        with get_cursor(commit=True) as cur:
            cur.execute(
                """
                INSERT INTO seguimiento_cumplimiento
                    (id_norma, id_estado_cumplimiento, nombre_responsable,
                     fecha_evaluacion, acciones_realizadas, id_usuario_registro)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id_seguimiento, fecha_registro
                """,
                (seguimiento.id_norma, seguimiento.id_estado_cumplimiento,
                 seguimiento.nombre_responsable, seguimiento.fecha_evaluacion,
                 seguimiento.acciones_realizadas, seguimiento.id_usuario_registro),
            )
            result = cur.fetchone()
            seguimiento.id_seguimiento = result["id_seguimiento"]
            seguimiento.fecha_registro  = result["fecha_registro"]
            return seguimiento

    @staticmethod
    def _map(row) -> SeguimientoCumplimiento:
        return SeguimientoCumplimiento(
            id_seguimiento=row["id_seguimiento"],
            id_norma=row["id_norma"],
            id_estado_cumplimiento=row["id_estado_cumplimiento"],
            fecha_evaluacion=row["fecha_evaluacion"],
            id_usuario_registro=row["id_usuario_registro"],
            nombre_responsable=row["nombre_responsable"],
            acciones_realizadas=row["acciones_realizadas"],
            fecha_registro=row["fecha_registro"],
            nombre_estado_cumplimiento=row["nombre_estado_cumplimiento"],
        )
