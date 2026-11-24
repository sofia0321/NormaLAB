import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Badge from '../components/Badge';
import Boton from '../components/Boton';
import Encabezado from '../components/Encabezado';
import Tarjeta from '../components/Tarjeta';
import Texto from '../components/Texto';
import { eliminarNorma } from '../storage/normasStorage';
import { colores, radio } from '../theme';
import { Norma } from '../utils/validaciones';

interface Props {
  norma: Norma;
  onVolver: () => void;
  onEliminada: (mensaje: string) => void;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor?: string | number }) {
  return (
    <View style={styles.dato}>
      <Texto style={styles.etiqueta}>{etiqueta}</Texto>
      <Texto style={styles.valor}>{valor ? String(valor) : 'No especificado'}</Texto>
    </View>
  );
}

export default function DetalleNormaScreen({ norma, onVolver, onEliminada }: Props) {
  const insets = useSafeAreaInsets();

  const confirmarEliminar = () => {
    Alert.alert(
      'Eliminar norma',
      `¿Seguro que desea eliminar ${norma.titulo}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarNorma(norma.id);
              onEliminada(`Se eliminó ${norma.titulo}.`);
            } catch {
              Alert.alert('Error', 'No fue posible eliminar la norma. Intente nuevamente.');
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.fondo}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: insets.bottom + 40 }}
    >
      <Encabezado conBarra titulo={norma.titulo} sub={`Registrada el ${new Date(norma.fechaRegistro).toLocaleDateString('es-CO')}`} />

      <Tarjeta>
        <Dato etiqueta="Tipo" valor={norma.tipo} />
        <Dato etiqueta="Número / Año" valor={`${norma.numero}/${norma.anio}`} />
        <Dato etiqueta="Entidad" valor={norma.entidad} />
        <View style={styles.dato}>
          <Texto style={styles.etiqueta}>Vigencia</Texto>
          <Badge texto={norma.estadoVigencia} tipo="neutral" alinear="flex-start" />
        </View>
        <Dato etiqueta="Descripción" valor={norma.descripcion} />
        <Dato etiqueta="Frecuencia" valor={norma.frecuencia} />
        <Dato etiqueta="Responsable" valor={norma.responsable} />
        <Dato etiqueta="Exigencia" valor={norma.exigencia} />
        <Dato etiqueta="Evidencia" valor={norma.evidencia} />
      </Tarjeta>

      <View style={styles.acciones}>
        <Boton variante="texto" etiqueta="← Volver a la lista" onPress={onVolver} />
        <Pressable style={styles.botonEliminar} onPress={confirmarEliminar}>
          <Texto style={styles.textoEliminar}>Eliminar norma</Texto>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.fondo },
  dato: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colores.bordeSuave },
  etiqueta: { fontSize: 12, textTransform: 'uppercase', color: colores.textoGris, marginBottom: 2 },
  valor: { fontSize: 14 },
  acciones: { marginTop: 18, gap: 10 },
  botonEliminar: {
    borderWidth: 1, borderColor: colores.errorTexto, borderRadius: radio,
    paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff',
  },
  textoEliminar: { color: colores.errorTexto, fontWeight: 'bold', fontSize: 14 },
});