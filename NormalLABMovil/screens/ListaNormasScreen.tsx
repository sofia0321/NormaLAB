import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Badge from '../components/Badge';
import Boton from '../components/Boton';
import Encabezado from '../components/Encabezado';
import Select from '../components/Select';
import Tarjeta from '../components/Tarjeta';
import Texto from '../components/Texto';
import { TIPOS_NORMA } from '../data/catalogos';
import { cargarNormas } from '../storage/normasStorage';
import { colores, fuente, radio, sombra } from '../theme';
import { Norma } from '../utils/validaciones';


interface Props {
  mensaje: string | null;
  onNueva: () => void;
  onVerDetalle: (norma: Norma) => void;
}

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <View style={styles.fila}>
      <Texto style={styles.filaEtiqueta}>{etiqueta}</Texto>
      <View style={styles.filaValor}>{children}</View>
    </View>
  );
}

export default function ListaNormasScreen({ mensaje, onNueva, onVerDetalle }: Props) {
  const insets = useSafeAreaInsets();
  const [normas, setNormas] = useState<Norma[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');


  useEffect(() => {
    cargarNormas().then(setNormas).catch(() => setError('No fue posible cargar las normas. Intente nuevamente.'));
  }, []);

  const filtradas = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return (normas ?? []).filter(
      (n) =>
        (!tipo || n.tipo === tipo) &&
        (!texto || [n.numero, n.titulo, n.entidad].some((v) => v.toLowerCase().includes(texto))),
    );
  }, [normas, q, tipo]);

  const hayFiltros = !!q.trim() || !!tipo;

  return (
    <ScrollView
      style={styles.fondo}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: insets.bottom + 40 }}
    >
      <Encabezado
        conBarra
        titulo="Normas legales"
        sub="Consulte, registre y gestione el cumplimiento de la normativa SG-SST."
        accion={<Boton variante="primario" etiqueta="+ Nueva norma" onPress={onNueva} />}
      />

      {mensaje ? (
        <View style={styles.exito}>
          <Texto style={styles.exitoTexto}>{mensaje}</Texto>
        </View>
      ) : null}

      <View style={styles.filtros}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar por número, título o entidad…"
          placeholderTextColor={colores.textoSuave}
          returnKeyType="search"
          style={styles.busqueda}
        />
        <Select valor={tipo} opciones={TIPOS_NORMA} vacio="Todos los tipos" onChange={setTipo} etiquetaAccesible="Filtrar por tipo" />
        {hayFiltros ? <Boton variante="texto" etiqueta="Limpiar" onPress={() => { setQ(''); setTipo(''); }} /> : null}
      </View>

      {error ? <Texto style={styles.error}>{error}</Texto> : null}
      {normas === null && !error ? <ActivityIndicator style={{ marginTop: 30 }} color={colores.primario} /> : null}

      {normas !== null ? (
        <>
          <Texto style={styles.conteo}>Mostrando {filtradas.length} de {normas.length} normas</Texto>
          {filtradas.length > 0 ? (
            filtradas.map((n) => (
              <Pressable key={n.id} style={styles.tarjetaNorma} onPress={() => onVerDetalle(n)}>
                <Fila etiqueta="Norma"><Texto style={styles.enlace}>{n.tipo} {n.numero}/{n.anio}</Texto></Fila>
                <Fila etiqueta="Tipo"><Texto style={styles.valor}>{n.tipo}</Texto></Fila>
                <Fila etiqueta="Número / Año"><Texto style={styles.valor}>{n.numero}/{n.anio}</Texto></Fila>
                <Fila etiqueta="Entidad"><Texto style={styles.valor}>{n.entidad}</Texto></Fila>
                <Fila etiqueta="Cumplimiento"><Badge texto="Sin evaluar" tipo="neutral" alinear="flex-end" /></Fila>
              </Pressable>
            ))
          ) : (
            <Tarjeta style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Texto style={styles.vacioGrande}>
                {hayFiltros ? 'No se encontraron normas con los filtros aplicados.' : 'Aún no hay normas registradas.'}
              </Texto>
              <Boton variante="primario" etiqueta="+ Registrar la primera norma" onPress={onNueva} />
            </Tarjeta>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.fondo },
  exito: { backgroundColor: colores.verdeBg, borderRadius: radio, padding: 14, marginBottom: 14 },
  exitoTexto: { color: colores.verde, fontWeight: 'bold', fontSize: 14 },
  filtros: { gap: 8, marginBottom: 8 },
  busqueda: {
    fontFamily: fuente, fontSize: 14, color: colores.texto, backgroundColor: '#fff',
    borderWidth: 1, borderColor: colores.borde, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12,
  },
  conteo: { fontSize: 13, color: colores.textoGris, marginTop: 6, marginBottom: 10 },
  error: { color: colores.errorTexto, fontSize: 13.5, marginVertical: 8 },
  tarjetaNorma: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: colores.bordeSuave, borderRadius: radio,
    paddingVertical: 8, paddingHorizontal: 4, marginBottom: 10, ...sombra,
  },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 5, paddingHorizontal: 12 },
  filaEtiqueta: { fontSize: 12, textTransform: 'uppercase', color: colores.textoGris },
  filaValor: { flex: 1, alignItems: 'flex-end' },
  valor: { fontSize: 14, textAlign: 'right' },
  enlace: { fontSize: 14, fontWeight: 'bold', color: colores.primario, textAlign: 'right' },
  vacioGrande: { color: colores.textoGris, fontSize: 14, textAlign: 'center', marginBottom: 14 },
});
