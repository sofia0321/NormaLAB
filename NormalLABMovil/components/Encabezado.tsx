import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colores } from '../theme';
import Texto from './Texto';

interface Props { titulo: string; sub?: string; conBarra?: boolean; accion?: ReactNode }

/** Equivale a .encabezado: <h1> (con barra azul opcional) + subtítulo + acciones. */
export default function Encabezado({ titulo, sub, conBarra, accion }: Props) {
  return (
    <View style={styles.encabezado}>
      <View style={conBarra ? styles.barra : undefined}>
        <Texto style={styles.h1}>{titulo}</Texto>
      </View>
      {sub ? <Texto style={[styles.sub, conBarra && { paddingLeft: 17 }]}>{sub}</Texto> : null}
      {accion ? <View style={styles.accion}>{accion}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  encabezado: { marginBottom: 20 },
  barra: { borderLeftWidth: 5, borderLeftColor: colores.primario, paddingLeft: 12 },
  h1: { fontSize: 21, fontWeight: 'bold', lineHeight: 27 },
  sub: { color: colores.textoGris, marginTop: 6, fontSize: 14, lineHeight: 21 },
  accion: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
});
