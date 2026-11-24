import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import MenuLateral, { Seccion } from './components/MenuLateral';
import TopBar, { alturaTopbar } from './components/TopBar';
import CrearNormaScreen from './screens/CrearNormaScreen';
import DashboardScreen from './screens/DashboardScreen';
import ListaNormasScreen from './screens/ListaNormasScreen';
import { colores } from './theme';
import DetalleNormaScreen from './screens/DetalleNormaScreen';
import { Norma } from './utils/validaciones';

type Pantalla = 'dashboard' | 'normas' | 'crear' | 'detalle';

function Aplicacion() {
  const insets = useSafeAreaInsets();
  const [pantalla, setPantalla] = useState<Pantalla>('dashboard');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [normaSeleccionada, setNormaSeleccionada] = useState<Norma | null>(null);

  // El aviso de éxito desaparece solo a los 4 segundos.
  useEffect(() => {
    if (!mensaje) return;
    const t = setTimeout(() => setMensaje(null), 4000);
    return () => clearTimeout(t);
  }, [mensaje]);

  // Botón «atrás» de Android: cierra el menú, vuelve de crear a la lista y de la lista al dashboard.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (menuAbierto) { setMenuAbierto(false); return true; }
      if (pantalla === 'crear') { setPantalla('normas'); return true; }
      if (pantalla === 'normas') { setPantalla('dashboard'); return true; }
      if (pantalla === 'detalle') { setPantalla('normas'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [menuAbierto, pantalla]);

  const seccionActiva: Seccion = pantalla === 'dashboard' ? 'dashboard' : 'normas';
  const ir = (p: Pantalla) => { setPantalla(p); setMenuAbierto(false); };

    return (
    <View style={styles.raiz}>
      <TopBar onMenu={() => setMenuAbierto((a) => !a)} onInicio={() => ir('dashboard')} />
      <View style={{ flex: 1 }}>
        {pantalla === 'dashboard' && <DashboardScreen />}
        {pantalla === 'normas' && (
          <ListaNormasScreen
            mensaje={mensaje}
            onNueva={() => setPantalla('crear')}
            onVerDetalle={(n) => { setNormaSeleccionada(n); setPantalla('detalle'); }}
          />
        )}
        {pantalla === 'crear' && (
          <CrearNormaScreen
            onCancelar={() => setPantalla('normas')}
            onGuardada={(m) => { setMensaje(m); setPantalla('normas'); }}
          />
        )}
        {pantalla === 'detalle' && normaSeleccionada && (
          <DetalleNormaScreen
            norma={normaSeleccionada}
            onVolver={() => setPantalla('normas')}
            onEliminada={(m) => { setMensaje(m); setPantalla('normas'); }}
          />
        )}
      </View>
      <MenuLateral
        abierto={menuAbierto}
        activo={seccionActiva}
        superior={alturaTopbar(insets.top)}
        onSeleccionar={(s) => ir(s)}
        onCerrar={() => setMenuAbierto(false)}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Aplicacion />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ raiz: { flex: 1, backgroundColor: colores.fondo } });
