import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALTURA_TOPBAR, colores, NOMBRE_APP } from '../theme';
import Texto from './Texto';

/** Altura total de la barra (incluye el área segura superior y el borde dorado). */
export function alturaTopbar(insetSuperior: number) {
  return insetSuperior + ALTURA_TOPBAR + 3;
}

/** Equivale a .topbar: fondo azul marino, borde inferior dorado, hamburguesa + logo + nombre. */
export default function TopBar({ onMenu, onInicio }: { onMenu: () => void; onInicio: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.barra, { paddingTop: insets.top }]}>
      <View style={styles.fila}>
        <Pressable onPress={onMenu} accessibilityRole="button" accessibilityLabel="Abrir menú" hitSlop={8} style={styles.hamburguesa}>
          <View style={styles.raya} /><View style={styles.raya} /><View style={styles.raya} />
        </Pressable>
        <Pressable onPress={onInicio} style={styles.marca} accessibilityRole="link">
          <View style={styles.logoCaja}>
            <Image source={require('../assets/logo_universidad.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <Texto style={styles.nombre}>{NOMBRE_APP}</Texto>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barra: { backgroundColor: colores.sidebar, borderBottomWidth: 3, borderBottomColor: colores.dorado, paddingHorizontal: 12 },
  fila: { height: ALTURA_TOPBAR, flexDirection: 'row', alignItems: 'center', gap: 14 },
  hamburguesa: { padding: 8 },
  raya: { width: 22, height: 2, backgroundColor: '#fff', marginVertical: 2.5, borderRadius: 2 },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoCaja: { backgroundColor: '#fff', borderRadius: 6, padding: 3 },
  logo: { height: 32, width: 26 },
  nombre: { color: '#fff', fontSize: 20, fontWeight: 'bold', letterSpacing: 0.3 },
});
