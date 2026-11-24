import { Text, TextProps } from 'react-native';
import { colores, fuente } from '../theme';

/** Text con la tipografía y el color base de la web (Georgia / #1A2236). */
export default function Texto({ style, ...resto }: TextProps) {
  return <Text {...resto} style={[{ fontFamily: fuente, color: colores.texto }, style]} />;
}
