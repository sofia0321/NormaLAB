import { ReactNode, useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { colores, fuente } from '../theme';
import Texto from './Texto';

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  obligatorio?: boolean;
  error?: string | null;
  lineas?: number; // >1 => <textarea>
  hijos?: ReactNode;
}

/** Equivale a .campo-grupo: etiqueta gris, caja .campo y mensaje .error-campo. */
export default function CampoTexto({ label, obligatorio, error, lineas, hijos, onFocus, onBlur, ...resto }: Props) {
  const [enfoque, setEnfoque] = useState(false);
  const multi = !!lineas && lineas > 1;
  return (
    <View style={styles.grupo}>
      <Texto style={styles.label}>
        {label}
        {obligatorio ? <Texto style={styles.req}> *</Texto> : null}
      </Texto>
      <TextInput
        {...resto}
        multiline={multi}
        textAlignVertical={multi ? 'top' : 'center'}
        placeholderTextColor={colores.textoSuave}
        onFocus={(e) => { setEnfoque(true); onFocus?.(e); }}
        onBlur={(e) => { setEnfoque(false); onBlur?.(e); }}
        style={[
          styles.input,
          multi && { minHeight: 20 * (lineas as number) + 18 },
          enfoque && styles.enfoque,
          error ? styles.invalido : null,
        ]}
      />
      {hijos}
      {error ? <Texto style={styles.error}>{error}</Texto> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { marginBottom: 18 },
  label: { fontSize: 13.5, color: colores.textoGris, marginBottom: 5 },
  req: { color: colores.error, fontWeight: 'bold', fontSize: 13.5 },
  input: {
    fontFamily: fuente, fontSize: 14, color: colores.texto, backgroundColor: '#fff',
    borderWidth: 1, borderColor: colores.borde, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12,
  },
  enfoque: { borderColor: colores.primario },
  invalido: { borderColor: colores.error },
  error: { fontSize: 12.5, color: colores.errorTexto, marginTop: 4 },
});
