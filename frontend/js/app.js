let catalogos = { tiposNorma: [], entidadesEmisoras: [], estadosVigencia: [] };
let normaEnEdicion = null; // null = el formulario está en modo "crear"

const elLista = document.getElementById('lista-normas');
const elMensajeError = document.getElementById('mensaje-error');
const elFondoModal = document.getElementById('fondo-modal');
const elModalTitulo = document.getElementById('modal-titulo');
const elFormNorma = document.getElementById('form-norma');
const elListaErrores = document.getElementById('lista-errores');
const elFiltroTexto = document.getElementById('filtro-texto');
const elFiltroEstado = document.getElementById('filtro-estado');
const elSelectTipoNorma = document.getElementById('idTipoNorma');
const elSelectEstadoVigencia = document.getElementById('idEstadoVigencia');


async function cargarCatalogos() {
  catalogos = await obtenerCatalogos();

  llenarSelect(elFiltroEstado, catalogos.estadosVigencia, 'id_estado_vigencia', 'nombre_estado', 'Todos');
  llenarSelect(elSelectTipoNorma, catalogos.tiposNorma, 'id_tipo_norma', 'nombre_tipo', 'Selecciona...');
  llenarSelect(elSelectEstadoVigencia, catalogos.estadosVigencia, 'id_estado_vigencia', 'nombre_estado', 'Selecciona...');
}


async function cargarNormas() {
  ocultarError();
  elLista.innerHTML = '<p class="cargando">Cargando normas...</p>';
  try {
    const normas = await listarNormas({
      texto: elFiltroTexto.value.trim(),
      idEstadoVigencia: elFiltroEstado.value,
    });
    renderizarNormas(normas);
  } catch (err) {
    mostrarError(err.message);
    elLista.innerHTML = '';
  }
}


document.getElementById('btn-nueva-norma').addEventListener('click', () => abrirModal(null));
document.getElementById('btn-cerrar-modal').addEventListener('click', cerrarModal);
document.getElementById('btn-cancelar').addEventListener('click', cerrarModal);

elFondoModal.addEventListener('click', (evento) => {
  if (evento.target === elFondoModal) cerrarModal();
});

let temporizadorBusqueda = null;
elFiltroTexto.addEventListener('input', () => {
  clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(cargarNormas, 300);
});
elFiltroEstado.addEventListener('change', cargarNormas);

elFormNorma.addEventListener('submit', async (evento) => {
  evento.preventDefault(); // evita que el navegador recargue la página
  ocultarErroresFormulario();

  const idNorma = document.getElementById('idNorma').value;
  const datos = {
    idTipoNorma: Number(elSelectTipoNorma.value) || null,
    numero: document.getElementById('numero').value.trim(),
    anio: document.getElementById('anio').value,
    nombreEntidadEmisora: document.getElementById('nombreEntidadEmisora').value.trim(),
    titulo: document.getElementById('titulo').value.trim(),
    descripcion: document.getElementById('descripcion').value.trim(),
    exigenciaLegal: document.getElementById('exigenciaLegal').value.trim(),
    idEstadoVigencia: Number(elSelectEstadoVigencia.value) || null,
    fechaVigencia: document.getElementById('fechaVigencia').value || null,
    responsableCargo: document.getElementById('responsableCargo').value.trim(),
  };

  try {
    if (idNorma) {
      await actualizarNorma(idNorma, datos);
    } else {
      await crearNorma(datos);
    }
    cerrarModal();
    await cargarNormas(); // refresca la lista para mostrar el cambio
  } catch (err) {
    mostrarErroresFormulario(err.errores && err.errores.length ? err.errores : [err.message]);
  }
});

function editarNorma(norma) {
  abrirModal(norma);
}

async function eliminarNormaConfirmando(idNorma, titulo) {
  const confirmado = confirm(`¿Eliminar la norma "${titulo}"? Esta acción no se puede deshacer.`);
  if (!confirmado) return;

  try {
    await eliminarNorma(idNorma);
    await cargarNormas();
  } catch (err) {
    mostrarError(err.message);
  }
}

function llenarSelect(elSelect, opciones, campoId, campoNombre, textoPrimeraOpcion) {
  elSelect.innerHTML = `<option value="">${textoPrimeraOpcion}</option>`;
  for (const opcion of opciones) {
    const elOption = document.createElement('option');
    elOption.value = opcion[campoId];
    elOption.textContent = opcion[campoNombre];
    elSelect.appendChild(elOption);
  }
}

function renderizarNormas(normas) {
  if (normas.length === 0) {
    elLista.innerHTML = '<p class="sin-resultados">No hay normas que coincidan con los filtros.</p>';
    return;
  }

  elLista.innerHTML = '';
  for (const norma of normas) {
    elLista.appendChild(crearTarjetaNorma(norma));
  }
}

function crearTarjetaNorma(norma) {
  const articulo = document.createElement('article');
  articulo.className = 'tarjeta-norma';

  const encabezado = document.createElement('div');
  encabezado.className = 'tarjeta-norma-encabezado';
  encabezado.innerHTML = `
    <strong>${escaparHtml(norma.nombreTipoNorma)} ${escaparHtml(norma.numero)} / ${norma.anio}</strong>
    ${crearPastillaEstado(norma.nombreEstadoVigencia)}
  `;

  const cuerpo = document.createElement('div');
  cuerpo.innerHTML = `
    <p><strong>${escaparHtml(norma.titulo)}</strong></p>
    <p class="meta">${escaparHtml(norma.nombreEntidadEmisora)}${norma.responsableCargo ? ' · Responsable: ' + escaparHtml(norma.responsableCargo) : ''}</p>
  `;

  const acciones = document.createElement('div');
  acciones.className = 'tarjeta-acciones';

  const linkEditar = document.createElement('a');
  linkEditar.textContent = 'Editar';
  linkEditar.addEventListener('click', () => editarNorma(norma));

  const linkEliminar = document.createElement('a');
  linkEliminar.className = 'eliminar';
  linkEliminar.textContent = 'Eliminar';
  linkEliminar.addEventListener('click', () => eliminarNormaConfirmando(norma.idNorma, norma.titulo));

  acciones.append(linkEditar, linkEliminar);
  articulo.append(encabezado, cuerpo, acciones);
  return articulo;
}

function crearPastillaEstado(nombreEstado) {
  const clases = {
    Vigente: 'pastilla-vigente',
    Derogada: 'pastilla-derogada',
    Modificada: 'pastilla-modificada',
  };
  const clase = clases[nombreEstado] || 'pastilla-default';
  return `<span class="pastilla ${clase}">${escaparHtml(nombreEstado || 'Sin definir')}</span>`;
}

function abrirModal(norma) {
  normaEnEdicion = norma;
  ocultarErroresFormulario();
  elFormNorma.reset();

  document.getElementById('idNorma').value = norma ? norma.idNorma : '';
  elModalTitulo.textContent = norma ? 'Editar norma' : 'Nueva norma';

  if (norma) {
    elSelectTipoNorma.value = norma.idTipoNorma;
    document.getElementById('numero').value = norma.numero;
    document.getElementById('anio').value = norma.anio;
    document.getElementById('nombreEntidadEmisora').value = norma.nombreEntidadEmisora || '';
    document.getElementById('titulo').value = norma.titulo;
    document.getElementById('descripcion').value = norma.descripcion || '';
    document.getElementById('exigenciaLegal').value = norma.exigenciaLegal || '';
    elSelectEstadoVigencia.value = norma.idEstadoVigencia;
    document.getElementById('fechaVigencia').value = norma.fechaVigencia ? norma.fechaVigencia.slice(0, 10) : '';
    document.getElementById('responsableCargo').value = norma.responsableCargo || '';
  }

  elFondoModal.classList.remove('oculto');
}

function cerrarModal() {
  elFondoModal.classList.add('oculto');
  normaEnEdicion = null;
}

function mostrarError(mensaje) {
  elMensajeError.textContent = mensaje;
  elMensajeError.hidden = false;
}

function ocultarError() {
  elMensajeError.hidden = true;
}

function mostrarErroresFormulario(errores) {
  elListaErrores.innerHTML = errores.map((e) => `<li>${escaparHtml(e)}</li>`).join('');
  elListaErrores.hidden = false;
}

function ocultarErroresFormulario() {
  elListaErrores.hidden = true;
  elListaErrores.innerHTML = '';
}

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

(async function iniciar() {
  try {
    await cargarCatalogos();
    await cargarNormas();
  } catch (err) {
    mostrarError(err.message);
    elLista.innerHTML = '';
  }
})();