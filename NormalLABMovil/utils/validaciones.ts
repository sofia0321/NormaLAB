// Reglas de validación equivalentes a las del formulario web de NormaLAB
// (backend/utils/validators.py), con los mismos mensajes en español.
import { FRECUENCIAS, TIPOS_NORMA } from '../data/catalogos';

export interface Norma {
  id: string;
  tipo: string;
  numero: string;
  anio: number;
  titulo: string;
  entidad: string;
  descripcion?: string;
  frecuencia?: string;
  responsable?: string;
  exigencia?: string;
  evidencia?: string;
  estadoVigencia: string;
  fechaRegistro: string;
}

export interface FormularioNorma {
  tipo: string;
  numero: string;
  anio: string;
  entidad: string;
  descripcion: string;
  frecuencia: string;
  responsable: string;
  exigencia: string;
  evidencia: string;
}

export type CampoNorma = keyof FormularioNorma | 'general';
export type ErroresNorma = Partial<Record<CampoNorma, string>>;

const PRE = 'No es posible guardar.';
const SOLO_TEXTO = /^[A-Za-záéíóúüÁÉÍÓÚÜñÑ\s.,\-'()]+$/;
const PROHIBIDOS_DESC = /[<>"{|}]/;

export function valNumero(v: string, nombre: string): string | null {
  if (!v) return `${PRE} El campo '${nombre}' es obligatorio y solo permite números.`;
  if (!/^[0-9]+$/.test(v)) {
    return `${PRE} El campo '${nombre}' solo permite números.\nEl valor '${v.slice(0, 20)}' contiene caracteres no permitidos.`;
  }
  return null;
}

export function valAnio(v: string, nombre: string, hoy = new Date().getFullYear()): string | null {
  if (!v) return `${PRE} El campo '${nombre}' es obligatorio.`;
  if (!/^[0-9]+$/.test(v)) {
    return `${PRE} El campo '${nombre}' solo permite números.\nIngrese el año en formato numérico (p. ej. ${hoy}).`;
  }
  const anio = parseInt(v, 10);
  if (anio < 1900) return `${PRE} El campo '${nombre}' no puede ser menor a 1900.`;
  if (anio > hoy) return `${PRE} El campo '${nombre}' no puede ser mayor a ${hoy}.`;
  return null;
}

export function valTexto(v: string, nombre: string, obligatorio = false): string | null {
  if (!v) return obligatorio ? `${PRE} El campo '${nombre}' es obligatorio.` : null;
  if (/[0-9]/.test(v)) {
    return `${PRE} El campo '${nombre}' solo permite letras y espacios.\nRetire los números ingresados.`;
  }
  if (!SOLO_TEXTO.test(v)) {
    const invalidos = [...new Set([...v].filter((c) => !SOLO_TEXTO.test(c)))].join(' ');
    return `${PRE} El campo '${nombre}' solo permite letras y espacios.\nCaracteres no permitidos: ${invalidos}`;
  }
  return null;
}

export function valDescripcion(v: string, nombre: string, obligatorio = false): string | null {
  if (!v) return obligatorio ? `${PRE} El campo '${nombre}' es obligatorio.` : null;
  if (PROHIBIDOS_DESC.test(v)) return `${PRE} El campo '${nombre}' contiene caracteres no permitidos.`;
  return null;
}

/** Valida un solo campo (para dar retroalimentación al salir de él). */
export function validarCampo(campo: keyof FormularioNorma, v: string): string | null {
  const valor = v.trim();
  switch (campo) {
    case 'tipo':
      return (TIPOS_NORMA as readonly string[]).includes(valor) ? null : 'Seleccione un tipo de norma válido.';
    case 'numero':
      return valNumero(valor, 'Número de norma');
    case 'anio':
      return valAnio(valor, 'Año');
    case 'entidad':
      return valTexto(valor, 'Entidad emisora');
    case 'responsable':
      return valTexto(valor, 'Responsable');
    case 'descripcion':
      return valDescripcion(valor, 'Descripción');
    case 'exigencia':
      return valDescripcion(valor, 'Exigencia legal');
    case 'evidencia':
      return valDescripcion(valor, 'Registros de evidencia');
    case 'frecuencia':
      return !valor || (FRECUENCIAS as readonly string[]).includes(valor)
        ? null
        : 'Seleccione una frecuencia válida.';
  }
}

const CAMPOS: (keyof FormularioNorma)[] = [
  'tipo', 'numero', 'anio', 'entidad', 'responsable', 'descripcion', 'exigencia', 'evidencia', 'frecuencia',
];

/** Valida todo el formulario y la regla de unicidad (tipo + número + año). */
export function validarNorma(f: FormularioNorma, existentes: Norma[]): ErroresNorma {
  const errores: ErroresNorma = {};
  for (const campo of CAMPOS) {
    const e = validarCampo(campo, f[campo]);
    if (e) errores[campo] = e;
  }
  if (Object.keys(errores).length === 0) {
    const duplicada = existentes.some(
      (n) => n.tipo === f.tipo.trim() && n.numero === f.numero.trim() && n.anio === parseInt(f.anio, 10),
    );
    if (duplicada) errores.general = 'Ya existe una norma registrada con el mismo tipo, número y año.';
  }
  return errores;
}
