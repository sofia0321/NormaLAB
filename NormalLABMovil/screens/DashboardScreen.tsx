import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Boton from '../components/Boton';
import Dona from '../components/Dona';
import Encabezado from '../components/Encabezado';
import { IconoAlerta, IconoCheck, IconoDocumento, IconoReloj } from '../components/Iconos';
import Indicador from '../components/Indicador';
import Tarjeta from '../components/Tarjeta';
import Texto from '../components/Texto';
import { cargarNormas } from '../storage/normasStorage';
import { colores } from '../theme';
import { calcularDashboard, proximasRevisiones, ResumenCumplimiento, SIN_RESUMEN } from '../utils/dashboard';
import { Norma } from '../utils/validaciones';

interface Props {
  /** Conteo por estado de cumplimiento. Esta versión móvil no registra seguimientos, así que por defecto es 0. */
  resumen?: ResumenCumplimiento;
}

export default function DashboardScreen({ resumen = SIN_RESUMEN }: Props) {
  const insets = useSafeAreaInsets();
  const [normas, setNormas] = useState<Norma[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setError(null);
    cargarNormas().then(setNormas).catch(() => setError('No fue posible cargar los indicadores. Intente nuevamente.'));
  }, []);
  useEffect(cargar, [cargar]);

  const d = calcularDashboard(normas ?? [], resumen);
  const revisiones = proximasRevisiones(normas ?? []);

  return (
    <ScrollView style={styles.fondo} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: insets.bottom + 40 }}>
      <Encabezado
        titulo="Resumen general"
        sub="Indicadores de la matriz legal y del estado de cumplimiento."
        accion={<Boton etiqueta="↻ Actualizar" onPress={cargar} />}
      />

      {error ? <Texto style={styles.error}>{error}</Texto> : null}
      {normas === null && !error ? <ActivityIndicator style={{ marginVertical: 30 }} color={colores.primario} /> : null}

      {normas !== null ? (
        <>
          <View style={styles.indicadores}>
            <Indicador color="azul" icono={(c) => <IconoDocumento size={22} color={c} />} valor={String(d.total)} etiqueta="Normas registradas" />
            <Indicador color="verde" icono={(c) => <IconoCheck size={22} color={c} />} valor={`${d.porcentaje}%`} etiqueta="% de cumplimiento" />
            <Indicador color="naranja" icono={(c) => <IconoReloj size={22} color={c} />} valor={String(d.enProceso)} etiqueta="En proceso" />
            <Indicador color="rojo" icono={(c) => <IconoAlerta size={22} color={c} />} valor={String(d.noCumple)} etiqueta="Incumplimientos" />
          </View>

          <Tarjeta titulo="Distribución del estado de cumplimiento">
            {d.segmentos.length > 0 ? (
              <Dona segmentos={d.segmentos} evaluadas={d.evaluadas} total={d.total} />
            ) : (
              <Texto style={styles.vacio}>
                Sin datos de cumplimiento aún. Esta versión móvil solo incluye el registro de normas.
              </Texto>
            )}
          </Tarjeta>

          <Tarjeta titulo="Próximas revisiones">
            {revisiones.length > 0 ? (
              <View style={{ gap: 6 }}>
                {revisiones.map((r) => (
                  <View key={r.id} style={[styles.rev, r.clase === 'pendiente' && styles.revPendiente, r.clase === 'vencida' && styles.revVencida]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Texto style={styles.revTitulo} numberOfLines={1}>{r.titulo}</Texto>
                      <Texto style={styles.revMeta}>{r.meta}</Texto>
                    </View>
                    <Texto style={[styles.revFecha, r.clase !== 'normal' && { color: '#9A3412' }]}>{r.etiqueta}</Texto>
                  </View>
                ))}
              </View>
            ) : (
              <Texto style={styles.vacio}>No hay revisiones próximas en los siguientes 3 meses.</Texto>
            )}
          </Tarjeta>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.fondo },
  indicadores: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  vacio: { color: colores.textoGris, fontSize: 14, lineHeight: 21 },
  error: { color: colores.errorTexto, fontSize: 13.5, marginBottom: 8 },
  rev: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 12,
    borderRadius: 8, backgroundColor: '#F8F9FC', borderLeftWidth: 3, borderLeftColor: colores.primario,
  },
  revPendiente: { backgroundColor: '#FEF9EC', borderLeftColor: '#E39A12' },
  revVencida: { backgroundColor: colores.rojoBg, borderLeftColor: colores.rojo },
  revTitulo: { fontSize: 14 },
  revMeta: { fontSize: 12, color: colores.textoGris },
  revFecha: { fontSize: 12.5, fontWeight: 'bold', color: '#B45309' },
});
