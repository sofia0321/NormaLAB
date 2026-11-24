import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Boton from '../components/Boton';
import CampoTexto from '../components/CampoTexto';
import Encabezado from '../components/Encabezado';
import Select from '../components/Select';
import Tarjeta from '../components/Tarjeta';
import Texto from '../components/Texto';
import { FRECUENCIAS, TIPOS_NORMA } from '../data/catalogos';
import { ErrorDeValidacion, actualizarNorma, registrarNorma } from '../storage/normasStorage';
import { colores } from '../theme';
import { ErroresNorma, FormularioNorma, Norma } from '../utils/validaciones';

interface Props {
  normaEditar?: Norma;
  onCancelar: () => void;
  onGuardada: (mensaje: string) => void;
}

// Igual que el <select> de la web, el tipo arranca con la primera opción seleccionada.
const INICIAL: FormularioNorma = {
  tipo: TIPOS_NORMA[0], numero: '', anio: '', entidad: '', descripcion: '',
  frecuencia: '', responsable: '', exigencia: '', evidencia: '',
};

// Convierte una norma guardada en los textos que espera el formulario.
function desdeNorma(n: Norma): FormularioNorma {
  return {
    tipo: n.tipo, numero: n.numero, anio: String(n.anio),
    entidad: n.entidad === 'Sin especificar' ? '' : n.entidad,
    descripcion: n.descripcion ?? '', frecuencia: n.frecuencia ?? '',
    responsable: n.responsable ?? '', exigencia: n.exigencia ?? '', evidencia: n.evidencia ?? '',
  };
}

export default function CrearNormaScreen({ normaEditar, onCancelar, onGuardada }: Props) {
  const insets = useSafeAreaInsets();
  const [valores, setValores] = useState<FormularioNorma>(normaEditar ? desdeNorma(normaEditar) : INICIAL);
  const [errores, setErrores] = useState<ErroresNorma>({});
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo: keyof FormularioNorma, v: string) => {
    setValores((prev) => ({ ...prev, [campo]: v }));
    if (errores[campo] || errores.general) setErrores((prev) => ({ ...prev, [campo]: undefined, general: undefined }));
  };

  const guardar = async () => {
    if (guardando) return;
    setGuardando(true);
    setIntento(true);
    try {
      const norma = normaEditar
        ? await actualizarNorma(normaEditar.id, valores)
        : await registrarNorma(valores);
      onGuardada(`Norma «${norma.titulo}» ${normaEditar ? 'actualizada' : 'registrada'} correctamente.`);
    } catch (e) {
      if (e instanceof ErrorDeValidacion) setErrores(e.errores);
      else setErrores({ general: 'No fue posible guardar: la operación fue cancelada y no se almacenó ningún dato.' });
      setGuardando(false);
    }
  };

  const mensajes = Object.values(errores).filter(Boolean) as string[];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colores.fondo }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: insets.bottom + 40 }}
      >
        <Encabezado
          conBarra
          titulo={normaEditar ? 'Editar norma' : 'Registrar nueva norma'}
          sub={normaEditar
            ? 'Modifique los campos que necesite. Los campos con * son obligatorios.'
            : 'Complete los campos requeridos para registrar la norma. Los campos con * son obligatorios.'}
        />

        {intento && mensajes.length > 0 ? (
          <View style={styles.alerta}>
            <Texto style={styles.alertaTitulo}>Datos inválidos — no se pudo guardar</Texto>
            {mensajes.map((m, i) => (
              <Texto key={i} style={styles.alertaItem}>• {m.replace('\n', ' ')}</Texto>
            ))}
          </View>
        ) : null}

        <Tarjeta style={{ paddingVertical: 18 }}>
          <View style={styles.grupo}>
            <Texto style={styles.label}>Tipo de norma <Texto style={styles.req}>*</Texto></Texto>
            <Select valor={valores.tipo} opciones={TIPOS_NORMA} error={!!errores.tipo}
              onChange={(v) => cambiar('tipo', v)} etiquetaAccesible="Tipo de norma" />
            {errores.tipo ? <Texto style={styles.error}>{errores.tipo}</Texto> : null}
          </View>

          <CampoTexto label="Número" obligatorio value={valores.numero} placeholder="Ej: 0312" keyboardType="number-pad"
            maxLength={30} error={errores.numero} onChangeText={(v) => cambiar('numero', v)} />
          <CampoTexto label="Año" obligatorio value={valores.anio} placeholder="Ej: 2019" keyboardType="number-pad"
            maxLength={4} error={errores.anio} onChangeText={(v) => cambiar('anio', v)} />
          <CampoTexto label="Entidad emisora" value={valores.entidad} placeholder="Ej: Ministerio de Trabajo"
            maxLength={250} error={errores.entidad} onChangeText={(v) => cambiar('entidad', v)} />
          <CampoTexto label="Descripción / objeto de la norma" lineas={3} value={valores.descripcion}
            placeholder="Estándares mínimos del Sistema de Gestión de Seguridad y Salud en el Trabajo…"
            error={errores.descripcion} onChangeText={(v) => cambiar('descripcion', v)} />

          <View style={styles.grupo}>
            <Texto style={styles.label}>Frecuencia de seguimiento</Texto>
            <Select valor={valores.frecuencia} opciones={FRECUENCIAS} vacio="— Sin definir —" error={!!errores.frecuencia}
              onChange={(v) => cambiar('frecuencia', v)} etiquetaAccesible="Frecuencia de seguimiento" />
            {errores.frecuencia ? <Texto style={styles.error}>{errores.frecuencia}</Texto> : null}
          </View>

          <CampoTexto label="Responsable" value={valores.responsable} placeholder="Nombre o cargo del responsable"
            maxLength={200} error={errores.responsable} onChangeText={(v) => cambiar('responsable', v)} />
          <CampoTexto label="Exigencia legal" lineas={4} value={valores.exigencia} placeholder="¿Qué exige la norma a la institución?"
            error={errores.exigencia} onChangeText={(v) => cambiar('exigencia', v)} />
          <CampoTexto label="Registros de evidencia" lineas={2} value={valores.evidencia} placeholder="Describa evidencias o adjunte archivo."
            error={errores.evidencia} onChangeText={(v) => cambiar('evidencia', v)} />

          <View style={styles.pie}>
            <Boton etiqueta="✕ Cancelar" onPress={onCancelar} />
            <Boton
              variante="primario"
              etiqueta={guardando ? 'Guardando…' : normaEditar ? '💾 Guardar cambios' : '💾 Guardar norma'}
              onPress={guardar}
              deshabilitado={guardando}
            />
          </View>
        </Tarjeta>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  grupo: { marginBottom: 18 },
  label: { fontSize: 13.5, color: colores.textoGris, marginBottom: 5 },
  req: { color: colores.error, fontWeight: 'bold', fontSize: 13.5 },
  error: { fontSize: 12.5, color: colores.errorTexto, marginTop: 4 },
  alerta: {
    backgroundColor: colores.alertaBg, borderWidth: 1, borderColor: colores.alertaBorde,
    borderRadius: 10, paddingVertical: 14, paddingHorizontal: 18, marginBottom: 16,
  },
  alertaTitulo: { color: colores.alertaTexto, fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  alertaItem: { color: colores.alertaTexto, fontSize: 14, marginTop: 4, lineHeight: 20 },
  pie: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 10, borderTopWidth: 1, borderTopColor: colores.borde,
    marginTop: 6, paddingTop: 18, flexWrap: 'wrap',
  },
});