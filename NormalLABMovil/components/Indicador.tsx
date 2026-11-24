import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colores, radio, sombra } from '../theme';
import Texto from './Texto';

export type ColorIndicador = 'azul' | 'verde' | 'naranja' | 'rojo';

const paleta: Record<ColorIndicador, { c: string; cs: string }> = {
  azul: { c: '#1A4E8C', cs: '#E8F0FC' },
  verde: { c: '#0E7C4A', cs: '#E6F9F0' },
  naranja: { c: '#E39A12', cs: '#FFF4E6' },
  rojo: { c: '#C0392B', cs: '#FEE8E8' },
};

interface Props { color: ColorIndicador; icono: (color: string) => ReactNode; valor: string; etiqueta: string }

/** Equivale a .indicador (tarjeta con borde superior de color, ícono circular, valor y etiqueta). */
export default function Indicador({ color, icono, valor, etiqueta }: Props) {
  const p = paleta[color];
  return (
    <View style={[styles.caja, { borderTopColor: p.c }]}>
      <View style={[styles.icono, { backgroundColor: p.cs }]}>{icono(p.c)}</View>
      <Texto style={styles.valor}>{valor}</Texto>
      <Texto style={styles.etiqueta}>{etiqueta}</Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: colores.blanco, borderWidth: 1,
    borderColor: colores.bordeSuave, borderTopWidth: 5, borderRadius: radio, padding: 14, ...sombra,
  },
  icono: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  valor: { fontSize: 26, fontWeight: 'bold', marginTop: 10 },
  etiqueta: { color: colores.textoGris, fontSize: 13 },
});
