/// <reference types="node" />
// Ejecutar con:  npx tsx tests/storage.test.ts
// Simula AsyncStorage en memoria para probar el flujo de guardado sin necesitar un celular.
import assert from 'node:assert/strict';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Module = require('node:module');
const memoria = new Map<string, string>();
const almacenFalso = {
  getItem: async (k: string) => memoria.get(k) ?? null,
  setItem: async (k: string, v: string) => { memoria.set(k, v); },
};
const original = Module._load;
Module._load = function (request: string, ...resto: unknown[]) {
  if (request === '@react-native-async-storage/async-storage') {
    return { __esModule: true, default: almacenFalso };
  }
  return original.call(this, request, ...resto);
};

let pasadas = 0;
async function caso(nombre: string, fn: () => Promise<void>) {
  try { await fn(); pasadas++; console.log(`PASS ${nombre}`); }
  catch (e) { console.log(`FAIL ${nombre}\n     ${(e as Error).message}`); process.exitCode = 1; }
}

const base = {
  tipo: 'Ley', numero: '1562', anio: '2012', entidad: '', descripcion: '',
  frecuencia: '', responsable: '', exigencia: '', evidencia: '',
};

(async () => {
  const { cargarNormas, registrarNorma, ErrorDeValidacion } = await import('../storage/normasStorage');

  await caso('al inicio no hay normas', async () => assert.deepEqual(await cargarNormas(), []));

  await caso('registrar con datos mínimos: título, vigente y entidad por defecto', async () => {
    const n = await registrarNorma(base);
    assert.equal(n.titulo, 'Ley 1562 de 2012');
    assert.equal(n.estadoVigencia, 'Vigente');
    assert.equal(n.entidad, 'Sin especificar');
    assert.equal(n.frecuencia, undefined);
    assert.equal((await cargarNormas()).length, 1);
  });

  await caso('duplicada: se rechaza y no se almacena nada', async () => {
    await assert.rejects(registrarNorma(base), (e: unknown) =>
      e instanceof ErrorDeValidacion && /mismo tipo, número y año/.test(e.errores.general ?? ''));
    assert.equal((await cargarNormas()).length, 1);
  });

  await caso('datos inválidos: se rechaza y no se almacena nada', async () => {
    await assert.rejects(registrarNorma({ ...base, numero: 'abc', anio: '1800' }), ErrorDeValidacion);
    assert.equal((await cargarNormas()).length, 1);
  });

  await caso('mismo número en otro tipo sí se permite; la más nueva va primero', async () => {
    await registrarNorma({ ...base, tipo: 'Decreto', entidad: 'Presidencia de la República', frecuencia: 'Anual' });
    const lista = await cargarNormas();
    assert.equal(lista.length, 2);
    assert.equal(lista[0].titulo, 'Decreto 1562 de 2012');
    assert.equal(lista[0].frecuencia, 'Anual');
  });

  await caso('los textos se guardan sin espacios sobrantes', async () => {
    const n = await registrarNorma({ ...base, numero: ' 77 ', responsable: '  Ana Gómez  ' });
    assert.equal(n.numero, '77');
    assert.equal(n.responsable, 'Ana Gómez');
  });

  await caso('persistencia: lo guardado sobrevive a una nueva lectura', async () => {
    const crudo = JSON.parse(memoria.get('@normalab/normas') as string);
    assert.equal(crudo.length, 3);
  });

  console.log(`\n${pasadas} pruebas OK`);
})();
