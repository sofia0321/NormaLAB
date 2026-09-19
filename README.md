# NormaLAB

Sistema de gestión del módulo **Normas legales** (matriz legal). Este
repositorio amplía el proyecto de clase original agregando el CRUD
completo de Normas legales, adaptado de la versión de referencia
"Sistema" (normalab_v5), y organizando el proyecto en
**Frontend / Backend / MVC**, con una **base de datos externa**
(PostgreSQL). El Frontend está hecho en **HTML, CSS y JavaScript
planos** (sin frameworks ni pasos de compilación) para que coincida
con las tecnologías que se usan en clase; el Backend es una API REST
en **Express (Node.js)**, también JavaScript plano. La estructura se
mantuvo simple a propósito: **máximo 3 carpetas por lado**.

> Esta es una versión reducida a un solo módulo (Normas legales), con
> comentarios extensos en el código para que el equipo pueda entender
> qué hace cada parte. Si más adelante quieren agregar Dashboard o
> Seguimiento de cumplimiento, la misma idea (una función de Model, un
> Controller, una ruta, y en el Frontend una función en `api.js` +
> algo de HTML/CSS/JS) se puede repetir para cada módulo nuevo.

## Estructura del proyecto

```
NormaLAB/
├── frontend/                 Sitio web en HTML/CSS/JS puro (sin build, sin npm)
│   ├── index.html            La única página: estructura de la pantalla
│   ├── css/style.css         Todos los estilos (colores, tamaños, layout)
│   └── js/
│       ├── api.js            Único archivo que llama fetch() hacia el Backend
│       └── app.js            Lógica de la pantalla: eventos, dibujar la lista, el modal
├── backend/                  API REST en Express, organizada en MVC
│   ├── src/
│   │   ├── models/           Acceso a datos (SQL) + conexión a la BD — capa "Model"
│   │   ├── controllers/      Lógica de cada endpoint (incluye validación) — capa "Controller"
│   │   └── routes/           Definición de rutas Express — capa "Router/View" de la API
│   └── db/schema.sql         Script para crear el esquema en la BD externa (se ejecuta a mano)
└── README.md                  este archivo
```

La "V" de MVC en un backend tipo API REST son las respuestas JSON que
arman los controllers (no hay plantillas HTML del lado del servidor);
la interfaz real ("View" visual) es el Frontend, que es HTML/CSS/JS
normal — lo mismo que se usa en clase con el profesor, sin ningún
framework de por medio.

## Qué había en el proyecto de clase y qué se agregó

**Ya existía (rama `develop` del repo original, sin fusionar a
`main`):** un backend Express de un solo archivo (`app.js`) con CRUD
básico de `normas` (nombre, descripción, estado) sobre SQLite
embebido, y un Frontend hecho con Expo/React Native (una plantilla sin
pantallas propias todavía).

**Se agregó / cambió en esta versión:**

- **Normas legales**: CRUD completo con los campos de la matriz legal
  (tipo de norma, número, año, entidad emisora, título, descripción,
  exigencia legal, estado de vigencia, fecha de vigencia,
  responsable/cargo), con búsqueda por texto y filtro por estado de
  vigencia.
- Backend reorganizado en **MVC** (3 carpetas: `models/`,
  `controllers/`, `routes/`) y migrado de SQLite embebido a
  **PostgreSQL externo**.
- **Frontend reescrito en HTML, CSS y JavaScript puro** (se quitó
  Expo/React Native): una sola página (`index.html`) conectada 100% al
  backend — nada de datos "quemados" en el código, todo se lee y se
  escribe contra la base de datos.
- Código con comentarios explicando el flujo completo: click en la UI
  → función en `js/api.js` → `fetch()` → ruta Express → controller →
  model → consulta SQL en PostgreSQL → respuesta JSON → de vuelta a la
  pantalla.

El CRUD de `normas` que ya existía en clase no se eliminó: se amplió
(mismos verbos HTTP, mismo estilo de validación) para soportar los
campos completos de la matriz legal.

## 1. Base de datos externa (PostgreSQL)

La base de datos **no vive dentro del proyecto**: es un servidor
PostgreSQL aparte al que el Backend se conecta por red. Puede ser:

- PostgreSQL instalado en tu propio computador o en el servidor del
  laboratorio.
- Un contenedor Docker separado (`docker run -e POSTGRES_PASSWORD=... -p 5432:5432 postgres:16`).
- Un servicio gratuito en la nube (Supabase, Railway, Neon,
  ElephantSQL, etc.) — cualquiera te da host, puerto, usuario,
  contraseña y nombre de base de datos.

Pasos:

1. Crea la base de datos y un usuario (ejemplo con `psql`, ajusta el
   host/usuario/clave a tu proveedor). **Importante:** el usuario que
   crea las tablas (al correr `schema.sql`) debe ser el MISMO usuario
   que el backend usa para conectarse (el de `backend/.env`); si usas
   otro usuario/rol para crear las tablas (por ejemplo el superusuario
   `postgres` en pgAdmin) vas a necesitar un `GRANT` extra o vas a ver
   errores de "permiso denegado" (código `42501`) al usar la API.

   ```sql
   CREATE ROLE normalab_app LOGIN PASSWORD 'elige_una_clave_segura';
   CREATE DATABASE normalab OWNER normalab_app;
   ```

2. Carga el esquema (tablas, catálogos y datos de ejemplo) una sola
   vez, conectado como ese mismo usuario/rol:

   ```bash
   psql "postgresql://normalab_app:tu_clave@HOST:5432/normalab" -f backend/db/schema.sql
   ```

   (`backend/db/schema.sql` es un script SQL normal; ábrelo también con
   pgAdmin, DBeaver o el editor SQL de tu proveedor en la nube si lo
   prefieres — solo asegúrate de estar conectado con el mismo usuario
   que quedará en `backend/.env`.)

   Si de todas formas terminas con las tablas creadas por otro usuario
   (por ejemplo `postgres`) y el backend usa otro (por ejemplo
   `normalab_app`), corrige los permisos conectándote a la base de
   datos correcta y ejecutando:

   ```sql
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO normalab_app;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO normalab_app;
   ```

## 2. Backend (Express, API REST)

```bash
cd backend
npm install
cp .env.example .env
```

Edita `backend/.env` con los datos reales de tu base de datos externa
(host, puerto, usuario, contraseña, nombre de la BD). Luego:

```bash
npm start
```

Si la conexión es correcta verás:

```
Conexión a la base de datos externa verificada correctamente.
Backend de NormaLAB escuchando en http://localhost:3000
```

Prueba rápida: `curl http://localhost:3000/api/health` debe responder
`{"estado":"ok", ...}` y `curl http://localhost:3000/api/normas` debe
devolver la lista de normas guardadas en la base de datos.

### Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Verifica que el backend está corriendo |
| GET | `/api/catalogos` | Tipos de norma, entidades emisoras, estados de vigencia |
| GET/POST | `/api/normas` | Listar (con filtros `texto`, `idEstadoVigencia`, `idTipoNorma`) / crear norma |
| GET/PUT/DELETE | `/api/normas/:id` | Obtener, editar o eliminar una norma |

## 3. Frontend (HTML + CSS + JavaScript)

El Frontend **no necesita `npm install`**: no tiene dependencias, no
hay paso de compilación, es HTML/CSS/JS que el navegador entiende
directamente. Solo hace falta abrir `frontend/index.html` con el
Backend ya corriendo (paso 2).

La forma más confiable de abrirlo es con un servidor local (algunos
navegadores bloquean `fetch()` si abres el `.html` directo con doble
clic, por el protocolo `file://`):

- **Con la extensión "Live Server" de VS Code** (la que agrega el
  botón "Go Live" abajo a la derecha): clic derecho sobre
  `frontend/index.html` → **Open with Live Server**. Se abre solo en
  el navegador, normalmente en `http://127.0.0.1:5500`.
- **O con Python**, desde la carpeta `frontend/`:

  ```bash
  cd frontend
  python -m http.server 8081
  ```

  y luego abrir `http://localhost:8081` en el navegador.

Si tu Backend no corre en `localhost:3000`, cambia la constante
`API_URL` al principio de `frontend/js/api.js` (como no hay `.env` en
un proyecto sin build, esa URL se escribe directo en el código).

La página debe mostrar **Normas legales**, con la lista de normas,
filtros de búsqueda y el botón "+ Nueva norma", todo con datos reales
traídos del backend.

## Cómo queda todo conectado

```
Frontend (HTML + CSS + JS) — frontend/index.html
      │  fetch() en frontend/js/api.js, a API_URL
      ▼
Backend (Express, MVC)  ── backend/.env (host, puerto, usuario, clave)
      │  routes -> controllers -> models -> pool de conexiones (pg)
      ▼
PostgreSQL EXTERNO (no está dentro del proyecto)
```

Todas las operaciones de la pantalla de Normas legales (listar,
crear, editar, eliminar, buscar y filtrar) llaman al backend por HTTP
y el backend consulta/inserta/actualiza/elimina directamente en la
base de datos externa — no hay datos de prueba fijos en el Frontend.

## Qué hace cada archivo del Frontend

- **`index.html`** — solo la ESTRUCTURA de la página: qué elementos
  existen (título, filtros, lista de normas, el formulario dentro del
  modal). No tiene lógica ni estilos, solo etiquetas HTML con `id`
  para que `js/app.js` los pueda encontrar.
- **`css/style.css`** — todo el ESTILO visual (colores, espaciados,
  cómo se ve la pastilla de color de cada estado, cómo se ve el modal
  encima de la página).
- **`js/api.js`** — el único archivo que sabe hacer `fetch()`. Tiene
  una función por cada endpoint del backend (`listarNormas`,
  `crearNorma`, `actualizarNorma`, `eliminarNorma`,
  `obtenerCatalogos`).
- **`js/app.js`** — el COMPORTAMIENTO: qué pasa cuando cargas la
  página, cuando escribes en el buscador, cuando das clic en "+ Nueva
  norma", "Editar", "Eliminar" o "Guardar". Llama a las funciones de
  `api.js` y luego actualiza el HTML con lo que respondió el backend
  (crea los elementos con `document.createElement`, les pone texto, y
  los agrega a la página).

## Dónde quedó cada cosa en el Backend (3 carpetas MVC)

- `models/db.js` — conexión (pool) a la base de datos externa.
- `models/normaModel.js`, `models/catalogoModel.js` — las consultas
  SQL.
- `controllers/normasController.js` — recibe la petición, valida los
  datos (función `validarDatosNorma()`) y llama al Model
  correspondiente.
- `controllers/catalogosController.js` — junta los 3 catálogos en una
  sola respuesta.
- `routes/normas.routes.js`, `routes/catalogos.routes.js` — las URLs y
  qué Controller atiende cada una.
- `errorHandler.js` y `app.js` — archivos sueltos de soporte (manejo
  de errores y configuración de Express), fuera de las 3 carpetas.

## Comentarios en el código

Se agregaron comentarios en los archivos clave para explicar el
"por qué", no solo el "qué":

- `backend/src/models/normaModel.js` y `catalogoModel.js`: qué hace
  cada consulta SQL y por qué se usan parámetros (`$1, $2...`) en vez
  de concatenar texto (previene inyección SQL).
- `backend/src/controllers/normasController.js`: cómo se traduce
  entre los nombres de columnas de la base de datos (snake_case) y los
  nombres que usa el frontend (camelCase), qué código HTTP se devuelve
  en cada caso (200, 201, 400, 404, 409, 500), y cómo funciona la
  validación de datos.
- `backend/src/errorHandler.js`: cómo se traducen los códigos de error
  de PostgreSQL (`23505` dato duplicado, `23503` referencia inválida,
  `42501` permisos) a mensajes en español que entiende cualquiera del
  equipo.
- `frontend/js/api.js`: por qué es el único archivo que llama
  `fetch()`.
- `frontend/js/app.js`: comentario de cabecera explicando las 4 partes
  del archivo (estado, carga de datos, manejadores de eventos,
  dibujado) y el recorrido completo de una petición.

## Notas

- `backend/.env` está en `.gitignore`: no se sube al repositorio
  porque tiene credenciales locales. Cada quien usa su propia copia a
  partir de `.env.example`.
- `backend/db/schema.sql` incluye una norma de ejemplo para poder
  probar la app apenas se instala; se puede editar o eliminar desde la
  propia aplicación.
- La carpeta `frontend/equipo/` tiene los nombres del equipo; no forma
  parte del código de la aplicación.
