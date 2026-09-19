const API_URL = 'http://localhost:3000/api';


async function solicitar(ruta, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      headers: { 'Content-Type': 'application/json', ...(opciones.headers || {}) },
    });
  } catch (err) {
    throw new Error(
      `No se pudo conectar con el backend en ${API_URL}. Verifica que el servidor Express ` +
        'esté corriendo (npm start en la carpeta backend).'
    );
  }

  const texto = await respuesta.text();
  const cuerpo = texto ? JSON.parse(texto) : null;

  if (!respuesta.ok) {
    const error = new Error(cuerpo?.mensaje || 'Error en la petición');
    error.errores = cuerpo?.errores; // lista de errores de validación, si vienen
    error.status = respuesta.status;
    throw error;
  }
  return cuerpo;
}

function obtenerCatalogos() {
  return solicitar('/catalogos');
}

function listarNormas(filtros = {}) {
  const params = new URLSearchParams();
  if (filtros.texto) params.set('texto', filtros.texto);
  if (filtros.idEstadoVigencia) params.set('idEstadoVigencia', filtros.idEstadoVigencia);
  const query = params.toString();
  return solicitar(`/normas${query ? `?${query}` : ''}`);
}


function crearNorma(datos) {
  return solicitar('/normas', { method: 'POST', body: JSON.stringify(datos) });
}

function actualizarNorma(idNorma, datos) {
  return solicitar(`/normas/${idNorma}`, { method: 'PUT', body: JSON.stringify(datos) });
}

function eliminarNorma(idNorma) {
  return solicitar(`/normas/${idNorma}`, { method: 'DELETE' });
}