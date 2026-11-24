// Íconos copiados de los <svg> de la web (viewBox 24x24, trazo 1.8).
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colores } from '../theme';

interface P { size?: number; color?: string }

function Base({ size = 20, color = colores.texto, children }: P & { children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export const IconoDashboard = (p: P) => (
  <Base {...p}>
    <Rect x="3" y="3" width="7" height="9" rx="1.5" />
    <Rect x="14" y="3" width="7" height="5" rx="1.5" />
    <Rect x="14" y="12" width="7" height="9" rx="1.5" />
    <Rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Base>
);
export const IconoNormas = (p: P) => (
  <Base {...p}>
    <Path d="M6 3h9l4 4v14H6z" />
    <Path d="M14 3v5h5M9 12h7M9 16h7" />
  </Base>
);
export const IconoDocumento = (p: P) => (
  <Base {...p}>
    <Path d="M6 3h9l4 4v14H6z" />
    <Path d="M9 12h7M9 16h7" />
  </Base>
);
export const IconoCheck = (p: P) => (
  <Base {...p}>
    <Circle cx="12" cy="12" r="9" />
    <Path d="M8 12.5l2.7 2.7L16.5 9" />
  </Base>
);
export const IconoReloj = (p: P) => (
  <Base {...p}>
    <Circle cx="12" cy="12" r="9" />
    <Path d="M12 7v5l3 2" />
  </Base>
);
export const IconoAlerta = (p: P) => (
  <Base {...p}>
    <Path d="M12 3l9.5 17h-19z" />
    <Path d="M12 10v4M12 17.2v.1" />
  </Base>
);
