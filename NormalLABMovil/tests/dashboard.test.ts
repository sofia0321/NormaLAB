/// <reference types="node" />
// Ejecutar con:  npx tsx tests/dashboard.test.ts
import assert from 'node:assert/strict';
import { calcularDashboard, proximasRevisiones, segmentosDona, SIN_RESUMEN } from '../utils/dashboard';
import { Norma } from '../utils/validaciones';

let pasadas = 0;
function caso(nombre: string, fn: () => void) {
  try { fn(); pasadas++; console.log(`PASS ${nombre}`); }
  catch (e) { console.log(`FAIL ${nombre}\n     ${(e as Error).message}`); process.exitCode = 1; }
}

const norma = (o: Partial<Norma>): Norma => ({
  id: '1', tipo: 'Ley', numero: '1', anio: 2020, titulo: 'Ley 1 de 2020', entidad: 'x',
  estadoVigencia: 'Vigente', fechaRegistro: '2026-01-01', ...o,
});
const CIRC = 2 * Math.PI * 70;

caso('dona: sin datos no hay segmentos', () => assert.deepEqual(segmentosDona([]), []));
caso('dona: un solo estado ocupa toda la circunferencia', () => {
  const [s] = segmentosDona([['Cumple', 5]]);
  assert.equal(s.pct, 100);
  assert.ok(Math.abs(s.dash[0] - CIRC) < 0.02);
  assert.equal(s.offset, 0);
});
caso('dona: los segmentos suman la circunferencia y se encadenan', () => {
  const segs = segmentosDona([['Cumple', 2], ['En Proceso', 1], ['No Cumple', 1]]);
  const suma = segs.reduce((a, s) => a + s.dash[0], 0);
  assert.ok(Math.abs(suma - CIRC) < 0.05, `suma=${suma}`);
  assert.equal(segs[0].offset, 0);
  assert.ok(Math.abs(segs[1].offset + segs[0].dash[0]) < 0.02);
  assert.ok(Math.abs(segs[2].offset + segs[0].dash[0] + segs[1].dash[0]) < 0.05);
});
caso('dona: porcentajes y colores por estado', () => {
  const segs = segmentosDona([['Cumple', 1], ['No Cumple', 3]]);
  assert.deepEqual(segs.map((s) => s.pct), [25, 75]);
  assert.equal(segs[0].color, '#0E7C4A');
  assert.equal(segs[1].color, '#C0392B');
});

caso('dashboard: total de normas y resto en cero sin seguimientos', () => {
  const d = calcularDashboard([norma({}), norma({ id: '2' })]);
  assert.equal(d.total, 2);
  assert.equal(d.porcentaje, 0);
  assert.equal(d.noCumple, 0);
  assert.deepEqual(d.segmentos, []);
});
caso('dashboard: % de cumplimiento sobre las evaluadas', () => {
  const d = calcularDashboard([], { cumple: 3, enProceso: 1, noCumple: 1, noAplica: 0 });
  assert.equal(d.evaluadas, 5);
  assert.equal(d.porcentaje, 60);
  assert.equal(d.segmentos.length, 3);
});
caso('dashboard: estados en cero no generan segmento', () => {
  const d = calcularDashboard([], { ...SIN_RESUMEN, cumple: 2 });
  assert.deepEqual(d.segmentos.map((s) => s.etiqueta), ['Cumple']);
});

caso('revisiones: solo normas con frecuencia, marcadas «Sin evaluar»', () => {
  const r = proximasRevisiones([
    norma({ id: 'a', frecuencia: 'Anual' }), norma({ id: 'b' }), norma({ id: 'c', frecuencia: 'Mensual', tipo: 'Decreto', numero: '77' }),
  ]);
  assert.deepEqual(r.map((x) => x.id), ['a', 'c']);
  assert.equal(r[1].meta, 'Decreto 77 · Mensual');
  assert.ok(r.every((x) => x.etiqueta === 'Sin evaluar' && x.clase === 'pendiente'));
});
caso('revisiones: máximo 10', () => {
  const muchas = Array.from({ length: 14 }, (_, i) => norma({ id: String(i), frecuencia: 'Anual' }));
  assert.equal(proximasRevisiones(muchas).length, 10);
});

console.log(`\n${pasadas} pruebas OK`);
