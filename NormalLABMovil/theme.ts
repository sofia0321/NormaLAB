// Paleta institucional UNIMAYOR — tomada de frontend/static/css/app.css de NormaLAB Web.
import { Platform, ViewStyle } from 'react-native';

export const colores = {
  primario: '#1A4E8C',
  primarioOscuro: '#0F3266',
  primarioClaro: '#E8F0FC',
  sidebar: '#0F2547',
  sidebarHover: '#172D5A',
  sidebarTexto: '#9BB3D0',
  sidebarPie: '#5A7299',
  sidebarLinea: '#1A3A6A',
  dorado: '#FFC107',
  fondo: '#F0F4FA',
  blanco: '#FFFFFF',
  borde: '#D1DCF0',
  bordeSuave: '#E8EDF8',
  texto: '#1A2236',
  textoGris: '#6B7A99',
  textoSuave: '#9FAABE',
  verdeBg: '#E6F9F0',
  verde: '#0E7C4A',
  naranjaBg: '#FFF4E6',
  naranja: '#C47D0A',
  rojoBg: '#FEE8E8',
  rojo: '#C0392B',
  grisBg: '#EEF1F8',
  gris: '#5A6680',
  error: '#E53935',
  errorTexto: '#C62828',
  alertaBg: '#FEF3F2',
  alertaBorde: '#F5C2C7',
  alertaTexto: '#842029',
};

// La web usa Georgia (serif). En Android no existe Georgia: se usa la serif del sistema.
export const fuente = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, "Times New Roman", serif',
}) as string;

export const radio = 10;

export const sombra: ViewStyle = {
  shadowColor: '#0F2547',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
};

export const ALTURA_TOPBAR = 58; // --topbar-h en pantallas pequeñas
export const VERSION_APP = 'v1.0.0-móvil';
export const NOMBRE_APP = 'NormaLAB';
