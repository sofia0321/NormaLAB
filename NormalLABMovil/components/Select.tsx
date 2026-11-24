import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colores, radio } from '../theme';
import Texto from './Texto';

interface Props {
  valor: string;
  opciones: readonly string[];
  onChange: (valor: string) => void;
  /** Texto de la opción vacía (p. ej. «— Sin definir —»). Si no se da, no hay opción vacía. */
  vacio?: string;
  error?: boolean;
  etiquetaAccesible?: string;
}

/** Equivale a un <select class="campo">: caja con el valor actual y una lista para elegir. */
export default function Select({ valor, opciones, onChange, vacio, error, etiquetaAccesible }: Props) {
  const [abierto, setAbierto] = useState(false);
  const elegir = (v: string) => { onChange(v); setAbierto(false); };
  const lista = vacio !== undefined ? ['', ...opciones] : [...opciones];

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={etiquetaAccesible} onPress={() => setAbierto(true)}
        style={[styles.caja, error && styles.cajaError]}>
        <Texto style={[styles.valor, !valor && { color: valor === '' && vacio ? colores.texto : colores.textoSuave }]} numberOfLines={1}>
          {valor || vacio || 'Seleccione…'}
        </Texto>
        <Texto style={styles.flecha}>▾</Texto>
      </Pressable>

      <Modal transparent animationType="fade" visible={abierto} onRequestClose={() => setAbierto(false)}>
        <Pressable style={styles.velo} onPress={() => setAbierto(false)}>
          <Pressable style={styles.panel} onPress={() => undefined}>
            <ScrollView>
              {lista.map((op) => {
                const sel = op === valor;
                return (
                  <Pressable key={op || '__vacio'} accessibilityRole="menuitem" onPress={() => elegir(op)}
                    style={[styles.fila, sel && styles.filaSel]}>
                    <Texto style={[styles.filaTexto, sel && { color: colores.primario, fontWeight: 'bold' }]}>{op || vacio}</Texto>
                    {sel ? <Texto style={{ color: colores.primario }}>✓</Texto> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  caja: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderWidth: 1, borderColor: colores.borde, borderRadius: 8,
    paddingVertical: 9, paddingHorizontal: 12, minHeight: 40,
  },
  cajaError: { borderColor: colores.error },
  valor: { fontSize: 14, flex: 1 },
  flecha: { color: colores.textoGris, marginLeft: 8, fontSize: 14 },
  velo: { flex: 1, backgroundColor: 'rgba(15,37,71,0.45)', justifyContent: 'center', padding: 28 },
  panel: { backgroundColor: '#fff', borderRadius: radio, maxHeight: '70%', overflow: 'hidden' },
  fila: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: colores.bordeSuave,
  },
  filaSel: { backgroundColor: colores.primarioClaro },
  filaTexto: { fontSize: 15 },
});
