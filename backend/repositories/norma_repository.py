from typing import Optional

from db.connection import get_cursor
from models.entities import Norma

_SELECT_BASE = """
    SELECT n.id_norma, n.id_tipo_norma, n.numero, n.anio, n.id_entidad_emisora,
           n.titulo, n.descripcion, n.articulos_que_aplican, n.exigencia_legal,
           n.registros_evidencia_tipo, n.id_estado_vigencia, n.fecha_vigencia,
           n.id_frecuencia_seguimiento, n.responsable_cargo, n.id_usuario_responsable,
           n.fecha_registro, n.fecha_ultima_evaluacion,
           t.nombre_tipo AS nombre_tipo_norma,
           e.nombre AS nombre_entidad_emisora,
           v.nombre_estado AS nombre_estado_vigencia,
           f.nombre_frecuencia AS nombre_frecuencia_seguimiento,
           ultimo.nombre_estado_cumplimiento AS ultimo_estado_cumplimiento
    FROM norma n
    JOIN tipo_norma t ON t.id_tipo_norma = n.id_tipo_norma
    JOIN entidad_emisora e ON e.id_entidad = n.id_entidad_emisora
    JOIN estado_vigencia v ON v.id_estado_vigencia = n.id_estado_vigencia
    LEFT JOIN frecuencia_seguimiento f ON f.id_frecuencia = n.id_frecuencia_seguimiento
    LEFT JOIN LATERAL (
        SELECT ec.nombre_estado AS nombre_estado_cumplimiento
        FROM seguimiento_cumplimiento sc
        JOIN estado_cumplimiento ec ON ec.id_estado_cumplimiento = sc.id_estado_cumplimiento
        WHERE sc.id_norma = n.id_norma
        ORDER BY sc.fecha_evaluacion DESC, sc.id_seguimiento DESC
        LIMIT 1
    ) ultimo ON TRUE
"""


class NormaRepository:

    def listar(self, filtro_texto: Optional[str] = None,
               id_estado_vigencia: Optional[int] = None,
               id_tipo_norma: Optional[int] = None,
               id_estado_cumplimiento: Optional[int] = None) -> list[Norma]:
        condiciones, parametros = [], []
        if filtro_texto:
            condiciones.append(
                "(to_tsvector('spanish', n.titulo) @@ plainto_tsquery('spanish', %s) "
                "OR n.titulo ILIKE %s OR n.numero ILIKE %s OR e.nombre ILIKE %s)"
            )
            # plainto_tsquery evita errores de sintaxis con caracteres especiales
            # escritos en el buscador web (equivale a unir palabras con &).
            parametros.extend([filtro_texto, f"%{filtro_texto}%", f"%{filtro_texto}%",
                               f"%{filtro_texto}%"])
        if id_estado_vigencia:
            condiciones.append("n.id_estado_vigencia = %s")
            parametros.append(id_estado_vigencia)
        if id_tipo_norma:
            condiciones.append("n.id_tipo_norma = %s")
            parametros.append(id_tipo_norma)
        if id_estado_cumplimiento:
            condiciones.append(
                "ultimo.nombre_estado_cumplimiento = ("
                "SELECT nombre_estado FROM estado_cumplimiento WHERE id_estado_cumplimiento = %s)"
            )
            parametros.append(id_estado_cumplimiento)

        sql = _SELECT_BASE
        if condiciones:
            sql += " WHERE " + " AND ".join(condiciones)
        sql += " ORDER BY n.fecha_registro DESC"

        with get_cursor() as cur:
            cur.execute(sql, tuple(parametros))
            return [self._map(row) for row in cur.fetchall()]

    def obtener_por_id(self, id_norma: int) -> "Norma | None":
        with get_cursor() as cur:
            cur.execute(_SELECT_BASE + " WHERE n.id_norma = %s", (id_norma,))
            row = cur.fetchone()
            return self._map(row) if row else None

    def listar_sin_cumplimiento(self) -> list[Norma]:
        sql = _SELECT_BASE + """
            WHERE (ultimo.nombre_estado_cumplimiento IS NULL
                   OR ultimo.nombre_estado_cumplimiento != 'Cumple')
            ORDER BY n.fecha_registro DESC
        """
        with get_cursor() as cur:
            cur.execute(sql)
            return [self._map(row) for row in cur.fetchall()]
    def listar_no_cumple(self) -> list[Norma]:
        """Normas cuyo último seguimiento tiene estado 'No Cumple' (sin distinción de mayúsculas)."""
        sql = _SELECT_BASE + """
            WHERE LOWER(ultimo.nombre_estado_cumplimiento) = 'no cumple'
            ORDER BY n.fecha_registro DESC
        """
        with get_cursor() as cur:
            cur.execute(sql)
            return [self._map(row) for row in cur.fetchall()]


    def matriz_expandida(self) -> list[dict]:
        """
        Consulta para la Matriz Legal Expandida.
        Retorna TODOS los campos de la norma más datos de sub-módulos.
        """
        sql = """
            SELECT
                n.id_norma,
                t.nombre_tipo AS tipo,
                n.numero,
                n.anio,
                t.nombre_tipo || ' ' || n.numero || '/' || n.anio AS norma,
                e.nombre AS entidad_emisora,
                n.descripcion,
                n.exigencia_legal,
                n.registros_evidencia_tipo,
                COALESCE(f.nombre_frecuencia, '') AS frecuencia,
                COALESCE(n.responsable_cargo, '') AS responsable,
                COALESCE(ultimo_sc.nombre_estado, 'Sin evaluar') AS cumplimiento,
                ultimo_sc.fecha_evaluacion AS fecha_evaluacion,
                COALESCE(ultimo_sc.acciones_realizadas, '') AS acciones_realizadas,
                COALESCE(
                    (SELECT STRING_AGG(
                         a.numero_articulo || ': ' || SUBSTRING(a.descripcion, 1, 60),
                         E'\\n' ORDER BY a.numero_articulo)
                     FROM articulo_aplicable a WHERE a.id_norma = n.id_norma),
                    ''
                ) AS articulos,
                COALESCE(
                    (SELECT STRING_AGG(
                         ac.codigo || ' (' || eac.nombre_estado || ')',
                         E'\\n' ORDER BY ac.fecha_apertura)
                     FROM accion_correctiva ac
                     JOIN estado_accion_correctiva eac ON eac.id_estado_accion = ac.id_estado_accion
                     WHERE ac.id_norma = n.id_norma AND eac.nombre_estado != 'Cerrada'),
                    ''
                ) AS acciones_abiertas
            FROM norma n
            JOIN tipo_norma t ON t.id_tipo_norma = n.id_tipo_norma
            JOIN entidad_emisora e ON e.id_entidad = n.id_entidad_emisora
            LEFT JOIN frecuencia_seguimiento f ON f.id_frecuencia = n.id_frecuencia_seguimiento
            LEFT JOIN LATERAL (
                SELECT ec.nombre_estado, sc.fecha_evaluacion, sc.acciones_realizadas
                FROM seguimiento_cumplimiento sc
                JOIN estado_cumplimiento ec ON ec.id_estado_cumplimiento = sc.id_estado_cumplimiento
                WHERE sc.id_norma = n.id_norma
                ORDER BY sc.fecha_evaluacion DESC, sc.id_seguimiento DESC
                LIMIT 1
            ) ultimo_sc ON TRUE
            ORDER BY n.fecha_registro DESC
        """
        with get_cursor() as cur:
            cur.execute(sql)
            return [dict(row) for row in cur.fetchall()]

    def crear(self, norma: Norma) -> Norma:
        with get_cursor(commit=True) as cur:
            cur.execute(
                """
                INSERT INTO norma (id_tipo_norma, numero, anio, id_entidad_emisora, titulo,
                                    descripcion, articulos_que_aplican, exigencia_legal,
                                    registros_evidencia_tipo, id_estado_vigencia, fecha_vigencia,
                                    id_frecuencia_seguimiento, responsable_cargo,
                                    id_usuario_responsable)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id_norma, fecha_registro
                """,
                (norma.id_tipo_norma, norma.numero, norma.anio, norma.id_entidad_emisora,
                 norma.titulo, norma.descripcion, norma.articulos_que_aplican,
                 norma.exigencia_legal, norma.registros_evidencia_tipo,
                 norma.id_estado_vigencia, norma.fecha_vigencia,
                 norma.id_frecuencia_seguimiento, norma.responsable_cargo,
                 norma.id_usuario_responsable),
            )
            result = cur.fetchone()
            norma.id_norma = result["id_norma"]
            norma.fecha_registro = result["fecha_registro"]
            return norma

    def actualizar(self, norma: Norma) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute(
                """
                UPDATE norma
                SET id_tipo_norma = %s, numero = %s, anio = %s, id_entidad_emisora = %s,
                    titulo = %s, descripcion = %s, articulos_que_aplican = %s,
                    exigencia_legal = %s, registros_evidencia_tipo = %s,
                    id_estado_vigencia = %s, fecha_vigencia = %s,
                    id_frecuencia_seguimiento = %s, responsable_cargo = %s,
                    id_usuario_responsable = %s
                WHERE id_norma = %s
                """,
                (norma.id_tipo_norma, norma.numero, norma.anio, norma.id_entidad_emisora,
                 norma.titulo, norma.descripcion, norma.articulos_que_aplican,
                 norma.exigencia_legal, norma.registros_evidencia_tipo,
                 norma.id_estado_vigencia, norma.fecha_vigencia,
                 norma.id_frecuencia_seguimiento, norma.responsable_cargo,
                 norma.id_usuario_responsable, norma.id_norma),
            )

    def contar_registros_asociados(self, id_norma: int) -> dict:
        """Devuelve conteo de registros asociados para mostrar en confirmación de eliminación."""
        with get_cursor() as cur:
            cur.execute("""
                SELECT
                    (SELECT COUNT(*) FROM articulo_aplicable WHERE id_norma = %s) AS articulos,
                    (SELECT COUNT(*) FROM seguimiento_cumplimiento WHERE id_norma = %s) AS seguimientos,
                    (SELECT COUNT(*) FROM accion_correctiva WHERE id_norma = %s) AS acciones
            """, (id_norma, id_norma, id_norma))
            row = cur.fetchone()
            return {"articulos": row["articulos"], "seguimientos": row["seguimientos"],
                    "acciones": row["acciones"]}

    def eliminar(self, id_norma: int) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute("DELETE FROM norma WHERE id_norma = %s", (id_norma,))

    def actualizar_fecha_ultima_evaluacion(self, id_norma: int, fecha) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute(
                "UPDATE norma SET fecha_ultima_evaluacion = %s WHERE id_norma = %s",
                (fecha, id_norma),
            )

    def contar_total(self) -> int:
        with get_cursor() as cur:
            cur.execute("SELECT COUNT(*) AS total FROM norma")
            return cur.fetchone()["total"]

    def resumen_cumplimiento(self) -> dict:
        sql = """
            SELECT ec.nombre_estado, COUNT(*) AS cantidad
            FROM norma n
            JOIN LATERAL (
                SELECT sc.id_estado_cumplimiento
                FROM seguimiento_cumplimiento sc
                WHERE sc.id_norma = n.id_norma
                ORDER BY sc.fecha_evaluacion DESC, sc.id_seguimiento DESC
                LIMIT 1
            ) ultimo ON TRUE
            JOIN estado_cumplimiento ec ON ec.id_estado_cumplimiento = ultimo.id_estado_cumplimiento
            GROUP BY ec.nombre_estado
        """
        with get_cursor() as cur:
            cur.execute(sql)
            return {row["nombre_estado"]: row["cantidad"] for row in cur.fetchall()}

    def proximas_revisiones(self, dias: int = 30) -> list[dict]:
        sql = """
            SELECT n.id_norma,
                   n.titulo,
                   n.numero,
                   t.nombre_tipo,
                   n.fecha_ultima_evaluacion,
                   f.nombre_frecuencia,
                   CASE f.nombre_frecuencia
                       WHEN 'Permanente' THEN CURRENT_DATE
                       WHEN 'Mensual'    THEN
                           CASE WHEN n.fecha_ultima_evaluacion IS NULL
                                THEN CURRENT_DATE
                                ELSE n.fecha_ultima_evaluacion + INTERVAL '1 month'
                           END
                       ELSE
                           CASE WHEN n.fecha_ultima_evaluacion IS NULL
                                THEN CURRENT_DATE
                                ELSE (n.fecha_ultima_evaluacion + CASE f.nombre_frecuencia
                                          WHEN 'Trimestral' THEN INTERVAL '3 months'
                                          WHEN 'Semestral'  THEN INTERVAL '6 months'
                                          WHEN 'Anual'      THEN INTERVAL '1 year'
                                          ELSE INTERVAL '999 years'
                                      END)
                           END
                   END AS proxima_revision
            FROM norma n
            JOIN tipo_norma t ON t.id_tipo_norma = n.id_tipo_norma
            INNER JOIN frecuencia_seguimiento f
                    ON f.id_frecuencia = n.id_frecuencia_seguimiento
            WHERE f.nombre_frecuencia IN
                  ('Mensual','Trimestral','Semestral','Anual','Permanente')
              AND (
                   -- Mensual y Permanente: siempre visibles
                   f.nombre_frecuencia IN ('Mensual', 'Permanente')
                   OR
                   -- Anual/Trimestral/Semestral: solo cuando falten <= 30 días
                   (CASE
                       WHEN n.fecha_ultima_evaluacion IS NULL
                           THEN CURRENT_DATE
                       ELSE (n.fecha_ultima_evaluacion + CASE f.nombre_frecuencia
                                  WHEN 'Trimestral' THEN INTERVAL '3 months'
                                  WHEN 'Semestral'  THEN INTERVAL '6 months'
                                  WHEN 'Anual'      THEN INTERVAL '1 year'
                                  ELSE INTERVAL '999 years'
                             END)
                    END) <= CURRENT_DATE + (%s * INTERVAL '1 day')
              )
            ORDER BY proxima_revision ASC NULLS FIRST
            LIMIT 15
        """
        with get_cursor() as cur:
            cur.execute(sql, (dias,))
            return [dict(row) for row in cur.fetchall()]

    @staticmethod
    def _map(row) -> Norma:
        return Norma(
            id_norma=row["id_norma"], id_tipo_norma=row["id_tipo_norma"],
            numero=row["numero"], anio=row["anio"],
            id_entidad_emisora=row["id_entidad_emisora"], titulo=row["titulo"],
            descripcion=row["descripcion"], articulos_que_aplican=row["articulos_que_aplican"],
            exigencia_legal=row["exigencia_legal"],
            registros_evidencia_tipo=row["registros_evidencia_tipo"],
            id_estado_vigencia=row["id_estado_vigencia"], fecha_vigencia=row["fecha_vigencia"],
            id_frecuencia_seguimiento=row["id_frecuencia_seguimiento"],
            responsable_cargo=row["responsable_cargo"],
            id_usuario_responsable=row["id_usuario_responsable"],
            fecha_registro=row["fecha_registro"],
            fecha_ultima_evaluacion=row["fecha_ultima_evaluacion"],
            nombre_tipo_norma=row["nombre_tipo_norma"],
            nombre_entidad_emisora=row["nombre_entidad_emisora"],
            nombre_estado_vigencia=row["nombre_estado_vigencia"],
            nombre_frecuencia_seguimiento=row["nombre_frecuencia_seguimiento"],
            ultimo_estado_cumplimiento=row["ultimo_estado_cumplimiento"],
        )
