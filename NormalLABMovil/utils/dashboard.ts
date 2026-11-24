// Cálculos del dashboard. Equivalen a routes/dashboard.py de NormaLAB Web.
import { Norma } from './validaciones';

export interface ResumenCumplimiento {
  cumple: number;
  enProceso: number;
  noCumple: number;
  noAplica: number;
}

export const COLORES_CUMPLIMIENTO: Record<string, string> = {
  Cumple: '#0E7C4A',
  'En Proceso': '#E39A12',
  'No Cumple': '#C0392B',
  'No Aplica': '#8A94A8',
};

export interface Segmento {
  etiqueta: string;
  valor: number;
  color: string;
  dash: [number, number]; // [largo del trazo, resto de la circunferencia]
  offset: number;
  pct: number;
}

const RADIO = 70;

/** Porción de la dona por cada estado (misma matemática que _segmentos_dona). */
export function segmentosDona(datos: [string, number][]): Segmento[] {
  const total = datos.reduce((a, [, v]) => a + v, 0);
  if (!total) return [];
  const circ = 2 * Math.PI * RADIO;
  let acumulado = 0;
  return datos.map(([etiqueta, valor]) => {
    const largo = (circ * valor) / total;
    const seg: Segmento = {
      etiqueta, valor, color: COLORES_CUMPLIMIENTO[etiqueta] ?? '#9CA3AF',
      dash: [Number(largo.toFixed(2)), Number((circ - largo).toFixed(2))],
      offset: Number((-acumulado).toFixed(2)),
      pct: Math.round((valor * 100) / total),
    };
    acumulado += largo;
    return seg;
  });
}

export const SIN_RESUMEN: ResumenCumplimiento = { cumple: 0, enProceso: 0, noCumple: 0, noAplica: 0 };

export interface DatosDashboard {
  total: number;
  porcentaje: number;
  enProceso: number;
  noCumple: number;
  evaluadas: number;
  segmentos: Segmento[];
}

export function calcularDashboard(normas: Norma[], r: ResumenCumplimiento = SIN_RESUMEN): DatosDashboard {
  const evaluadas = r.cumple + r.enProceso + r.noCumple + r.noAplica;
  const datos = ([
    ['Cumple', r.cumple], ['En Proceso', r.enProceso], ['No Cumple', r.noCumple], ['No Aplica', r.noAplica],
  ] as [string, number][]).filter(([, v]) => v > 0);
  return {
    total: normas.length,
    porcentaje: evaluadas ? Math.round((r.cumple / evaluadas) * 100) : 0,
    enProceso: r.enProceso,
    noCumple: r.noCumple,
    evaluadas,
    segmentos: segmentosDona(datos),
  };
}

export interface Revision {
  id: string;
  titulo: string;
  meta: string;
  etiqueta: string;
  clase: 'normal' | 'pendiente' | 'vencida';
}

/**
 * Próximas revisiones. Igual que la web: toda norma con frecuencia de seguimiento y sin
 * evaluación previa aparece como «Sin evaluar» (clase pendiente). Máximo 10.
 */
export function proximasRevisiones(normas: Norma[]): Revision[] {
  return normas
    .filter((n) => !!n.frecuencia)
    .slice(0, 10)
    .map((n) => ({
      id: n.id, titulo: n.titulo, meta: `${n.tipo} ${n.numero} · ${n.frecuencia}`,
      etiqueta: 'Sin evaluar', clase: 'pendiente' as const,
    }));
}
