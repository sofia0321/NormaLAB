# NormaLAB Web

Versión web de NormaLAB (Institución Universitaria Colegio Mayor del Cauca)
con **tres módulos**:

| Módulo | Ruta | Qué hace |
|---|---|---|
| Dashboard | `/` | Indicadores (normas registradas, % de cumplimiento, en proceso, incumplimientos), gráfico de dona del estado de cumplimiento y próximas revisiones con filtro Desde/Hasta (mes/año). |
| Normas legales | `/normas/` | Consulta con búsqueda y filtros, matriz completa (`/normas/matriz`), registrar, editar (con versionado), ver detalle, eliminar y adjuntar evidencia (PDF, Word, Excel, imagen). |
| Cumplimiento | `/cumplimiento/` | Buscar norma por tipo/año, registrar seguimiento (estado, responsable evaluador, fecha, acciones realizadas), ver y eliminar historial. |

Se retiraron Acciones correctivas, Reportes, Log de auditoría, Configuración y
Login. La auditoría **sigue registrándose** en `log_auditoria` en cada
operación de escritura, aunque ya no tenga pantalla.

## Arquitectura

Se conserva la arquitectura en capas de la versión de escritorio. Solo cambia
la capa de presentación: Tkinter → Flask + HTML/CSS.

```
app.py                 Punto de entrada Flask (CSRF, filtros, errores)
routes/                Presentación web (antes ui/screens/)
  dashboard.py         ← dashboard_screen.py
  normas.py            ← normas_screen.py
  cumplimiento.py      ← cumplimiento_screen.py
templates/             Vistas HTML (Jinja2)
static/                CSS, JS y logo institucional
services/              Lógica de negocio (sin cambios)
repositories/          Acceso a datos (sin cambios, salvo búsqueda; ver abajo)
models/                Entidades (sin cambios)
db/                    Conexión y schema.sql (único script de base de datos)
utils/validators.py    Reglas de validación (trasladadas desde ui/components)
scripts/               Importador de la matriz legal desde Excel
uploads/               Archivos de evidencia adjuntos
```

## Puesta en marcha rápida en Windows

1. Instale **PostgreSQL** (https://www.postgresql.org/download/windows/) y
   **Python** (https://www.python.org/downloads/, marcando *Add Python to PATH*).
2. Doble clic en **`crear_base_datos.bat`**: pide la contraseña del usuario
   `postgres`, crea la base `normalab` con `db/schema.sql` y guarda la
   configuración en `config_local.bat` (no comparta ese archivo).
3. Doble clic en **`iniciar.bat`**: instala las dependencias la primera vez y
   abre la aplicación en http://127.0.0.1:5000.

## Puesta en marcha manual

Usa **la misma base de datos PostgreSQL** de la versión de escritorio; no
requiere cambios de esquema. Si es una instalación nueva, solo se necesita
**un script**:

```bash
createdb normalab
psql -d normalab -f db/schema.sql
```

`schema.sql` ya trae los catálogos finales (estados Cumple / No Cumple /
En Proceso y frecuencias Mensual / Trimestral / Anual), por eso ya no se
incluyen los antiguos scripts de migración.

Instalar y ejecutar:

```bash
pip install -r requirements.txt

# Linux / macOS
export NORMALAB_DB_HOST=localhost
export NORMALAB_DB_NAME=normalab
export NORMALAB_DB_USER=normalab_app
export NORMALAB_DB_PASSWORD=tu_clave
export NORMALAB_SECRET_KEY=una_clave_larga_y_aleatoria

# Windows (PowerShell)
$env:NORMALAB_DB_PASSWORD="tu_clave"   # y así con las demás

python app.py          # desarrollo → http://127.0.0.1:5000
```

Para dejarla publicada en un servidor de la institución (accesible desde otros
equipos de la red):

```bash
waitress-serve --host=0.0.0.0 --port=8000 app:app
```

y luego abrir `http://IP-DEL-SERVIDOR:8000` en el navegador.

### Variables de entorno

| Variable | Por defecto | Uso |
|---|---|---|
| `NORMALAB_DB_HOST` / `_PORT` / `_NAME` / `_USER` / `_PASSWORD` | localhost / 5432 / normalab / normalab_app / — | Conexión PostgreSQL |
| `NORMALAB_SECRET_KEY` | (clave de ejemplo) | Firma de la sesión y del token CSRF. **Cámbiela en producción.** |
| `NORMALAB_UPLOAD_DIR` | `uploads/` | Carpeta de evidencias adjuntas |
| `NORMALAB_HOST` / `NORMALAB_PORT` | 127.0.0.1 / 5000 | Solo para `python app.py` |
| `NORMALAB_DEBUG` | — | `1` para modo depuración |

## Cambios respecto a la versión de escritorio

1. **Nueva capa web** (`routes/`, `templates/`, `static/`) con el mismo diseño
   institucional: barra superior azul con logo y línea dorada, menú lateral,
   tipografía Georgia, badges de estado y tarjetas. Es responsive: en celular
   el menú se vuelve desplegable y las tablas se muestran como tarjetas.
2. **Validaciones idénticas**: `utils/validators.py` es el mismo archivo
   `ui/components/validators.py` sin la clase `CampoValidado` (dependía de
   Tkinter). El servidor valida siempre; el navegador repite las reglas en
   vivo (`static/js/app.js`) para marcar en rojo el campo con error.
3. **Evidencias**: el botón *Adjuntar* sube el archivo a `uploads/` (máx. 25 MB)
   y puede abrirse desde el detalle de la norma. Antes solo se guardaba el
   nombre del archivo.
4. **Corrección: vigencia por defecto.** Al registrar una norma, la versión de
   escritorio tomaba el primer estado de vigencia en orden alfabético, que es
   *Derogada*. Ahora las normas nuevas quedan *Vigente*. Si su base ya tiene
   normas registradas desde el escritorio, puede corregirlas así (revise antes
   que ninguna esté derogada de verdad):
   ```sql
   UPDATE norma SET id_estado_vigencia =
       (SELECT id_estado_vigencia FROM estado_vigencia WHERE nombre_estado = 'Vigente')
   WHERE id_estado_vigencia =
       (SELECT id_estado_vigencia FROM estado_vigencia WHERE nombre_estado = 'Derogada');
   ```
5. **Búsqueda más robusta** (`repositories/norma_repository.py`): se usa
   `plainto_tsquery` en lugar de `to_tsquery`, para que escribir símbolos como
   `&`, `:` o `!` en el buscador no produzca un error de PostgreSQL. También
   busca coincidencias parciales en el título.
6. **Pool de conexiones con hilos** (`db/connection.py`):
   `ThreadedConnectionPool`, necesario porque el servidor web atiende varias
   peticiones a la vez.
7. **Eliminar norma**: como el módulo de Acciones correctivas ya no existe,
   eliminar una norma ya no se bloquea por tener acciones asociadas. El cuadro
   de confirmación avisa cuántos seguimientos y acciones se borrarán con ella.
8. **Seguridad básica**: todos los formularios llevan token CSRF y los nombres
   de archivo subidos se sanean.

## Pruebas realizadas

Se probó contra PostgreSQL 16 con el `schema.sql` original: registrar (con
adjunto), validar campos, detectar duplicados (tipo + número + año), editar
(genera versión en `version_norma`), eliminar, registrar y eliminar
seguimientos, filtros del dashboard y de la matriz, y registro de auditoría.
Se revisó en navegador de escritorio (1366 px) y celular (390 px).
