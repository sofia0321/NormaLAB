from datetime import date
from typing import Optional

from db.connection import get_cursor

_SELECT = """
    SELECT ac.id_accion, ac.codigo, ac.id_norma, ac.descripcion,
           ac.articulo_relacionado_texto, ac.nombre_responsable,
           ac.fecha_apertura, ac.fecha_compromiso, ac.fecha_cierre,
           ac.id_estado_accion, ea.nombre_estado AS estado,
           t.nombre_tipo || ' ' || n.numero || '/' || n.anio AS norma,
           (ea.nombre_estado <> 'Cerrada' AND ac.fecha_compromiso < CURRENT_DATE) AS vencida
    FROM accion_correctiva ac
    JOIN estado_accion_correctiva ea ON ea.id_estado_accion = ac.id_estado_accion
    JOIN norma n ON n.id_norma = ac.id_norma
    JOIN tipo_norma t ON t.id_tipo_norma = n.id_tipo_norma
"""


class AccionRepository:

    def listar(self, id_estado: Optional[int] = None, responsable: Optional[str] = None,
               id_norma: Optional[int] = None) -> list[dict]:
        """RF-013: filtros combinables por estado, responsable y norma. Vencidas NO se excluyen."""
        cond, par = [], []
        if id_estado:
            cond.append("ac.id_estado_accion = %s"); par.append(id_estado)
        if responsable:
            cond.append("ac.nombre_responsable ILIKE %s"); par.append(f"%{responsable}%")
        if id_norma:
            cond.append("ac.id_norma = %s"); par.append(id_norma)
        sql = _SELECT + (" WHERE " + " AND ".join(cond) if cond else "")
        sql += " ORDER BY (ea.nombre_estado = 'Cerrada'), ac.fecha_compromiso, ac.id_accion"
        with get_cursor() as cur:
            cur.execute(sql, tuple(par))
            return [dict(r) for r in cur.fetchall()]

    def obtener_por_id(self, id_accion: int) -> Optional[dict]:
        with get_cursor() as cur:
            cur.execute(_SELECT + " WHERE ac.id_accion = %s", (id_accion,))
            row = cur.fetchone()
            return dict(row) if row else None

    def id_estado(self, nombre: str) -> Optional[int]:
        with get_cursor() as cur:
            cur.execute("SELECT id_estado_accion FROM estado_accion_correctiva WHERE nombre_estado = %s",
                        (nombre,))
            row = cur.fetchone()
            return row["id_estado_accion"] if row else None

    def crear(self, id_norma: int, descripcion: str, articulo: Optional[str],
              responsable: str, fecha_compromiso: date, id_estado: int, id_usuario: int) -> dict:
        """Una sola transacción: si algo falla no queda ningún dato parcial (RF-012)."""
        with get_cursor(commit=True) as cur:
            cur.execute("SELECT nextval(pg_get_serial_sequence('accion_correctiva','id_accion')) AS id")
            nuevo_id = cur.fetchone()["id"]
            codigo = f"AC-{nuevo_id:04d}"
            cur.execute(
                """
                INSERT INTO accion_correctiva
                    (id_accion, codigo, id_norma, articulo_relacionado_texto, descripcion,
                     id_estado_accion, nombre_responsable, fecha_compromiso, id_usuario_registro)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (nuevo_id, codigo, id_norma, articulo, descripcion, id_estado,
                 responsable, fecha_compromiso, id_usuario))
        return {"id_accion": nuevo_id, "codigo": codigo}

    def actualizar(self, id_accion: int, descripcion: str, articulo: Optional[str],
                   responsable: str, fecha_compromiso: date, id_estado: int,
                   fecha_cierre: Optional[date]) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute(
                """
                UPDATE accion_correctiva
                   SET descripcion = %s, articulo_relacionado_texto = %s, nombre_responsable = %s,
                       fecha_compromiso = %s, id_estado_accion = %s, fecha_cierre = %s
                 WHERE id_accion = %s
                """,
                (descripcion, articulo, responsable, fecha_compromiso, id_estado,
                 fecha_cierre, id_accion))

    def eliminar(self, id_accion: int) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute("DELETE FROM accion_correctiva WHERE id_accion = %s", (id_accion,))

    def contar_abiertas_por_norma(self, id_norma: int) -> int:
        """Acciones 'Pendiente' o 'En Proceso' (bloquean eliminar la norma, RF-016)."""
        with get_cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*) AS n FROM accion_correctiva ac
                JOIN estado_accion_correctiva ea ON ea.id_estado_accion = ac.id_estado_accion
                WHERE ac.id_norma = %s AND ea.nombre_estado IN ('Pendiente', 'En Proceso')
                """, (id_norma,))
            return cur.fetchone()["n"]
