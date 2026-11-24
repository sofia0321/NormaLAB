import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colores, VERSION_APP } from '../theme';
import { IconoDashboard, IconoNormas } from './Iconos';
import Texto from './Texto';

export type Seccion = 'dashboard' | 'normas';

interface Props {
  abierto: boolean;
  activo: Seccion;
  superior: number; // altura de la TopBar: el menú nace justo debajo
  onSeleccionar: (s: Seccion) => void;
  onCerrar: () => void;
}

const ITEMS: { id: Seccion; etiqueta: string; icono: (c: string) => ReactNode }[] = [
  { id: 'dashboard', etiqueta: 'Dashboard', icono: (c) => <IconoDashboard color={c} /> },
  { id: 'normas', etiqueta: 'Normas legales', icono: (c) => <IconoNormas color={c} /> },
];

/** Equivale a .sidebar en pantallas pequeñas: panel azul marino que se abre desde la izquierda. */
export default function MenuLateral({ abierto, activo, superior, onSeleccionar, onCerrar }: Props) {
  if (!abierto) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { top: superior }]} pointerEvents="box-none">
      <Pressable style={styles.velo} onPress={onCerrar} accessibilityLabel="Cerrar menú" />
      <View style={styles.panel}>
        <View style={{ paddingTop: 16 }}>
          {ITEMS.map((it) => {
            const sel = it.id === activo;
            const color = sel ? '#fff' : colores.sidebarTexto;
            return (
              <Pressable key={it.id} accessibilityRole="button" onPress={() => onSeleccionar(it.id)}
                style={[styles.item, sel && styles.itemActivo]}>
                {it.icono(color)}
                <Texto style={[styles.itemTexto, { color }, sel && { fontWeight: 'bold' }]}>{it.etiqueta}</Texto>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.pie}><Texto style={styles.pieTexto}>{VERSION_APP}</Texto></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  velo: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15,37,71,0.35)' },
  panel: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 230, backgroundColor: colores.sidebar,
    justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 15,
    shadowOffset: { width: 8, height: 0 }, elevation: 12,
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 20,
    marginVertical: 2, marginHorizontal: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: 'transparent',
  },
  itemActivo: { backgroundColor: colores.primario, borderLeftColor: colores.dorado },
  itemTexto: { fontSize: 15 },
  pie: { paddingVertical: 12, paddingHorizontal: 22, borderTopWidth: 1, borderTopColor: colores.sidebarLinea },
  pieTexto: { fontSize: 11, color: colores.sidebarPie },
});
