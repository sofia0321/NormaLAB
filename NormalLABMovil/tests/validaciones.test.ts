/// <reference types="node" />
// Ejecutar con:  npx tsx tests/validaciones.test.ts
// Sin configuración adicional: usa solo el módulo 'node:assert'.
import assert from 'node:assert/strict';
import {
  FormularioNorma, Norma, validarCampo, validarNorma, valAnio, valDescripcion, valNumero, valTexto,
} from '../utils/validaciones';

let pasadas = 0;
function caso(nombre: string, fn: () => void) {
  try { fn(); pasadas++; console.log(`PASS ${nombre}`); }
  catch (e) { console.log(`FAIL ${nombre}\n     ${(e as Error).message}`); process.exitCode = 1; }
}

const valido: FormularioNorma = {
  tipo: 'Resolución', numero: '0312', anio: '2019', entidad: 'Ministerio de Trabajo',
  descripcion: 'Estándares mínimos del SG-SST', frecuencia: 'Anual', responsable: 'Ana Gómez',
  exigencia: 'Implementar el sistema', evidencia: 'Acta de reunión',
};
const existente = (o: Partial<Norma> = {}): Norma => ({
  id: '1', tipo: 'Resolución', numero: '0312', anio: 2019, titulo: 'Resolución 0312 de 2019',
  entidad: 'x', estadoVigencia: 'Vigente', fechaRegistro: '2026-01-01', ...o,
});

// ---- Número ----
caso('número: obligatorio', () => assert.match(valNumero('', 'Número de norma')!, /obligatorio/));
caso('número: solo dígitos', () => assert.match(valNumero('12a', 'Número de norma')!, /solo permite números/));
caso('número: conserva ceros a la izquierda', () => assert.equal(valNumero('0312', 'Número de norma'), null));
caso('número: rechaza símbolos', () => assert.notEqual(valNumero('12-3', 'Número de norma'), null));

// ---- Año ----
caso('año: obligatorio', () => assert.match(valAnio('', 'Año')!, /obligatorio/));
caso('año: no numérico', () => assert.match(valAnio('abcd', 'Año')!, /solo permite números/));
caso('año: menor a 1900', () => assert.match(valAnio('1899', 'Año')!, /menor a 1900/));
caso('año: 1900 es válido', () => assert.equal(valAnio('1900', 'Año', 2026), null));
caso('año: el actual es válido', () => assert.equal(valAnio('2026', 'Año', 2026), null));
caso('año: futuro rechazado', () => assert.match(valAnio('2027', 'Año', 2026)!, /mayor a 2026/));

// ---- Texto (entidad, responsable) ----
caso('texto: vacío permitido si es opcional', () => assert.equal(valTexto('', 'Responsable'), null));
caso('texto: vacío rechazado si es obligatorio', () => assert.match(valTexto('', 'Responsable', true)!, /obligatorio/));
caso('texto: rechaza números', () => assert.match(valTexto('Maria123', 'Responsable')!, /Retire los números/));
caso('texto: acepta tildes, ñ, puntos y paréntesis', () =>
  assert.equal(valTexto("Ministerio de Educación (M.E.N.), Ñandú-O'Brien", 'Entidad emisora'), null));
caso('texto: rechaza símbolos y los lista', () => {
  const e = valTexto('Ana @ Pérez #', 'Responsable')!;
  assert.match(e, /Caracteres no permitidos: @ #/);
});

// ---- Descripción ----
caso('descripción: opcional vacía', () => assert.equal(valDescripcion('', 'Descripción'), null));
caso('descripción: acepta números y signos comunes', () =>
  assert.equal(valDescripcion('Art. 2.2.4.6.8: 100% de cobertura; ver anexo #3', 'Descripción'), null));
caso('descripción: rechaza < > " { | }', () => {
  for (const c of ['<', '>', '"', '{', '|', '}']) assert.notEqual(valDescripcion(`texto ${c} texto`, 'Descripción'), null, c);
});

// ---- Catálogos ----
caso('tipo: debe pertenecer al catálogo', () => {
  assert.equal(validarCampo('tipo', 'Ley'), null);
  assert.equal(validarCampo('tipo', 'Inventado'), 'Seleccione un tipo de norma válido.');
  assert.equal(validarCampo('tipo', ''), 'Seleccione un tipo de norma válido.');
});
caso('frecuencia: opcional, pero si viene debe ser válida', () => {
  assert.equal(validarCampo('frecuencia', ''), null);
  assert.equal(validarCampo('frecuencia', 'Mensual'), null);
  assert.equal(validarCampo('frecuencia', 'Diaria'), 'Seleccione una frecuencia válida.');
});

// ---- Formulario completo ----
caso('formulario válido: sin errores', () => assert.deepEqual(validarNorma(valido, []), {}));
caso('formulario mínimo (tipo, número, año) es válido', () =>
  assert.deepEqual(validarNorma({ ...valido, entidad: '', descripcion: '', frecuencia: '', responsable: '', exigencia: '', evidencia: '' }, []), {}));
caso('formulario vacío: marca tipo, número y año', () => {
  const e = validarNorma({ ...valido, tipo: '', numero: '', anio: '' }, []);
  assert.deepEqual(Object.keys(e).sort(), ['anio', 'numero', 'tipo']);
});
caso('espacios alrededor se ignoran', () =>
  assert.deepEqual(validarNorma({ ...valido, numero: '  0312  ', anio: ' 2019 ' }, []), {}));

// ---- Duplicados (tipo + número + año) ----
caso('duplicada: mismo tipo, número y año', () =>
  assert.equal(validarNorma(valido, [existente()]).general, 'Ya existe una norma registrada con el mismo tipo, número y año.'));
caso('no duplicada: otro tipo', () => assert.equal(validarNorma(valido, [existente({ tipo: 'Decreto' })]).general, undefined));
caso('no duplicada: otro año', () => assert.equal(validarNorma(valido, [existente({ anio: 2020 })]).general, undefined));
caso('no duplicada: "012" y "12" son números distintos', () =>
  assert.equal(validarNorma({ ...valido, numero: '12' }, [existente({ numero: '012' })]).general, undefined));
caso('con errores de campo no se evalúa el duplicado', () =>
  assert.equal(validarNorma({ ...valido, numero: 'x' }, [existente()]).general, undefined));

console.log(`\n${pasadas} pruebas OK`);
