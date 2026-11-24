import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { colores, fuente } from '../theme';
import { Segmento } from '../utils/dashboard';
import Texto from './Texto';

interface Props { segmentos: Segmento[]; evaluadas: number; total: number }

/** Gráfico de dona + leyenda (equivale a .dona y .leyenda de la web). */
export default function Dona({ segmentos, evaluadas, total }: Props) {
  return (
    <View style={styles.contenedor}>
      <Svg width={210} height={210} viewBox="0 0 200 200" accessibilityLabel="Gráfico de dona del estado de cumplimiento">
        <Circle cx={100} cy={100} r={70} fill="none" stroke="#EEF1F8" strokeWidth={30} />
        {segmentos.map((s) => (
          <Circle key={s.etiqueta} cx={100} cy={100} r={70} fill="none" stroke={s.color} strokeWidth={30}
            strokeDasharray={s.dash} strokeDashoffset={s.offset} rotation={-90} origin="100, 100" />
        ))}
        <SvgText x={100} y={106} textAnchor="middle" fontSize={30} fontWeight="bold" fill={colores.texto} fontFamily={fuente}>
          {String(evaluadas)}
        </SvgText>
        <SvgText x={100} y={128} textAnchor="middle" fontSize={11} fill={colores.textoGris} fontFamily={fuente}>
          normas evaluadas
        </SvgText>
      </Svg>

      <View style={styles.leyenda}>
        {segmentos.map((s) => (
          <View key={s.etiqueta} style={styles.fila}>
            <View style={[styles.punto, { backgroundColor: s.color }]} />
            <Texto style={styles.etiqueta}>{s.etiqueta}</Texto>
            <Texto style={styles.valor}>{s.valor}</Texto>
            <Texto style={styles.pct}>{s.pct}%</Texto>
          </View>
        ))}
        {total > evaluadas ? (
          <View style={styles.fila}>
            <View style={[styles.punto, { backgroundColor: '#CBD3E1' }]} />
            <Texto style={styles.etiqueta}>Sin evaluar</Texto>
            <Texto style={styles.valor}>{total - evaluadas}</Texto>
            <Texto style={styles.pct}> </Texto>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignItems: 'center', gap: 18 },
  leyenda: { alignSelf: 'stretch' },
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colores.bordeSuave,
  },
  punto: { width: 12, height: 12, borderRadius: 3 },
  etiqueta: { fontSize: 14, flex: 1 },
  valor: { fontWeight: 'bold', fontSize: 14 },
  pct: { width: 42, textAlign: 'right', color: colores.textoGris, fontSize: 13 },
});
