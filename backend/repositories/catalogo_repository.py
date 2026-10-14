from db.connection import get_cursor


class CatalogoRepository:

    def _listar(self, tabla: str, columna_id: str, columna_nombre: str) -> list[tuple[int, str]]:
        with get_cursor() as cur:
            cur.execute(f"SELECT {columna_id}, {columna_nombre} FROM {tabla} ORDER BY {columna_nombre}")
            return [(row[columna_id], row[columna_nombre]) for row in cur.fetchall()]

    def tipos_norma(self):
        return self._listar("tipo_norma", "id_tipo_norma", "nombre_tipo")

    def entidades_emisoras(self):
        return self._listar("entidad_emisora", "id_entidad", "nombre")

    def estados_vigencia(self):
        return self._listar("estado_vigencia", "id_estado_vigencia", "nombre_estado")

    def frecuencias_seguimiento(self):
        """Solo devuelve las 3 frecuencias permitidas: Mensual, Trimestral, Anual."""
        with get_cursor() as cur:
            cur.execute(
                """SELECT id_frecuencia, nombre_frecuencia
                   FROM frecuencia_seguimiento
                   WHERE nombre_frecuencia IN ('Mensual', 'Trimestral', 'Anual')
                   ORDER BY CASE nombre_frecuencia
                       WHEN 'Mensual'    THEN 1
                       WHEN 'Trimestral' THEN 2
                       WHEN 'Anual'      THEN 3
                   END"""
            )
            return [(row["id_frecuencia"], row["nombre_frecuencia"])
                    for row in cur.fetchall()]

    def estados_cumplimiento(self):
        """Solo devuelve los 3 estados permitidos: Cumple, No Cumple, En Proceso."""
        with get_cursor() as cur:
            cur.execute(
                """SELECT id_estado_cumplimiento, nombre_estado
                   FROM estado_cumplimiento
                   WHERE nombre_estado IN ('Cumple', 'No Cumple', 'En Proceso')
                   ORDER BY nombre_estado"""
            )
            return [(row["id_estado_cumplimiento"], row["nombre_estado"])
                    for row in cur.fetchall()]

    def estados_accion_correctiva(self):
        return self._listar("estado_accion_correctiva", "id_estado_accion", "nombre_estado")

    def crear_entidad_emisora_si_no_existe(self, nombre: str) -> int:
        with get_cursor(commit=True) as cur:
            cur.execute("SELECT id_entidad FROM entidad_emisora WHERE nombre = %s", (nombre,))
            fila = cur.fetchone()
            if fila:
                return fila["id_entidad"]
            cur.execute(
                "INSERT INTO entidad_emisora (nombre) VALUES (%s) RETURNING id_entidad", (nombre,)
            )
            return cur.fetchone()["id_entidad"]
