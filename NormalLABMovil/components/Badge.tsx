import { StyleSheet, View } from 'react-native';
import { colores } from '../theme';
import Texto from './Texto';

export type TipoBadge = 'ok' | 'warn' | 'err' | 'neutral';

const paleta: Record<TipoBadge, { bg: string; fg: string }> = {
  ok: { bg: colores.verdeBg, fg: colores.verde },
  warn: { bg: colores.naranjaBg, fg: colores.naranja },
  err: { bg: colores.rojoBg, fg: colores.rojo },
  neutral: { bg: colores.grisBg, fg: colores.gris },
};

/** Equivale a .badge .badge-ok/-warn/-err/-neutral. */
export default function Badge({ texto, tipo = 'neutral', alinear = 'flex-start' }: { texto: string; tipo?: TipoBadge; alinear?: 'flex-start' | 'flex-end' }) {
  const p = paleta[tipo];
  return (
    <View style={[styles.badge, { backgroundColor: p.bg, alignSelf: alinear }]}>
      <Texto style={[styles.texto, { color: p.fg }]}>{texto}</Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, alignSelf: 'flex-start' },
  texto: { fontSize: 12.5, fontWeight: 'bold' },
});
