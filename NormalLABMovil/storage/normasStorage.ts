import AsyncStorage from '@react-native-async-storage/async-storage';
import { FormularioNorma, Norma, validarNorma, ErroresNorma } from '../utils/validaciones';

const CLAVE = '@normalab/normas';

export async function cargarNormas(): Promise<Norma[]> {
  const bruto = await AsyncStorage.getItem(CLAVE);
  return bruto ? (JSON.parse(bruto) as Norma[]) : [];
}

export class ErrorDeValidacion extends Error {
  constructor(public errores: ErroresNorma) {
    super('Datos de norma no válidos');
  }
}

/** Valida y guarda. Si algo falla no se almacena ningún dato parcial. */
export async function registrarNorma(f: FormularioNorma): Promise<Norma> {
  const existentes = await cargarNormas();
  const errores = validarNorma(f, existentes);
  if (Object.keys(errores).length > 0) throw new ErrorDeValidacion(errores);

  const vacioANulo = (v: string) => (v.trim() ? v.trim() : undefined);
  const norma: Norma = {
    id: `${Date.now()}`,
    tipo: f.tipo.trim(),
    numero: f.numero.trim(),
    anio: parseInt(f.anio, 10),
    titulo: `${f.tipo.trim()} ${f.numero.trim()} de ${parseInt(f.anio, 10)}`,
    entidad: f.entidad.trim() || 'Sin especificar',
    descripcion: vacioANulo(f.descripcion),
    frecuencia: vacioANulo(f.frecuencia),
    responsable: vacioANulo(f.responsable),
    exigencia: vacioANulo(f.exigencia),
    evidencia: vacioANulo(f.evidencia),
    estadoVigencia: 'Vigente',
    fechaRegistro: new Date().toISOString(),
  };
  await AsyncStorage.setItem(CLAVE, JSON.stringify([norma, ...existentes]));
  return norma;
}
