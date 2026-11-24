import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colores, radio, sombra } from '../theme';
import Texto from './Texto';

interface Props { titulo?: string; children: ReactNode; style?: ViewStyle }

/** Equivale a .tarjeta (con su <h2> opcional). */
export default function Tarjeta({ titulo, children, style }: Props) {
  return (
    <View style={[styles.tarjeta, style]}>
      {titulo ? <Texto style={styles.titulo}>{titulo}</Texto> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.blanco, borderWidth: 1, borderColor: colores.bordeSuave,
    borderRadius: radio, paddingVertical: 20, paddingHorizontal: 18, marginBottom: 18, ...sombra,
  },
  titulo: { fontSize: 16, fontWeight: 'bold', marginBottom: 14, lineHeight: 20 },
});
