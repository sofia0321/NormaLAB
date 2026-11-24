import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colores } from '../theme';
import Texto from './Texto';

interface Props {
  etiqueta: string;
  onPress?: () => void;
  variante?: 'normal' | 'primario' | 'suave' | 'texto';
  pequeno?: boolean;
  deshabilitado?: boolean;
  style?: ViewStyle;
}

/** Equivale a .btn / .btn-primario / .btn-suave / .btn-texto de la web. */
export default function Boton({ etiqueta, onPress, variante = 'normal', pequeno, deshabilitado, style }: Props) {
  const v = estilos[variante];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={deshabilitado}
      onPress={onPress}
      style={({ pressed }) => [
        base.btn,
        pequeno && base.pequeno,
        v.caja,
        { opacity: deshabilitado ? 0.6 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Texto style={[base.texto, pequeno && { fontSize: 13 }, { color: v.color }]}>{etiqueta}</Texto>
    </Pressable>
  );
}

const base = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1,
  },
  pequeno: { paddingVertical: 6, paddingHorizontal: 12 },
  texto: { fontSize: 14 },
});

const estilos = {
  normal: { caja: { backgroundColor: colores.blanco, borderColor: colores.borde } as ViewStyle, color: colores.texto },
  primario: { caja: { backgroundColor: colores.primario, borderColor: colores.primario } as ViewStyle, color: '#fff' },
  suave: { caja: { backgroundColor: colores.primarioClaro, borderColor: 'transparent' } as ViewStyle, color: colores.primario },
  texto: { caja: { backgroundColor: 'transparent', borderColor: 'transparent' } as ViewStyle, color: colores.textoGris },
};
