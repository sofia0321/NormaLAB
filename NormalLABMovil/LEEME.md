# NormaLAB Mobile — Funcionalidad: Crear norma

Proyecto aparte de NormaLAB (no usa su servidor). Reproduce la interfaz de NormaLAB Web
(paleta institucional, tipografía, barra superior con logo, menú, dashboard, lista de
normas y formulario) adaptada al celular. Las normas se guardan en el propio teléfono
con AsyncStorage. Campos, catálogos y reglas de validación son los del formulario web.

## Instalación (sobre un proyecto creado con el comando de la clase)

    npx create-expo-app@latest NormalLABMovil --template blank-typescript
    cd NormalLABMovil
    npx expo install @react-native-async-storage/async-storage react-native-safe-area-context react-native-svg
    npm install -D @types/node tsx      # solo para las pruebas automáticas

Copiar a la raíz del proyecto, reemplazando App.tsx: App.tsx, theme.ts, components/,
screens/, utils/, data/, storage/, tests/ y assets/logo_universidad.png (dentro de la
carpeta assets existente). Si ya tenías una versión anterior, borrar components/Selector.tsx.

Opcional, para verla en el navegador con la tecla `w`:

    npx expo install react-native-web react-dom

## Ejecutar

    npx expo start            # o:  npx expo start --tunnel ngrok
    # Escanear el QR con Expo Go

## Pruebas automáticas

    npx tsc --noEmit                      # revisión de tipos
    npx tsx tests/validaciones.test.ts    # 29 pruebas: reglas de validación
    npx tsx tests/storage.test.ts         #  7 pruebas: flujo de guardado
    npx tsx tests/dashboard.test.ts       #  9 pruebas: dona y próximas revisiones

## Pantallas

    Dashboard        Resumen general: 4 indicadores, dona de cumplimiento, próximas revisiones
    Normas legales   Lista con búsqueda y filtro por tipo + botón «+ Nueva norma»
    Registrar norma  Formulario con validaciones y cuadro «Datos inválidos»

## Estructura

    App.tsx                         barra superior + menú lateral + navegación entre pantallas
    theme.ts                        colores y tipografía copiados de app.css de la web
    screens/                        DashboardScreen, ListaNormasScreen, CrearNormaScreen
    components/                     TopBar, MenuLateral, Tarjeta, Indicador, Dona, Badge, Boton,
                                    CampoTexto, Select, Encabezado, Iconos, Texto, FAB
    utils/validaciones.ts           reglas equivalentes a backend/utils/validators.py
    utils/dashboard.ts              cálculos del dashboard (equivalen a routes/dashboard.py)
    storage/normasStorage.ts        guardar / cargar normas
    data/catalogos.ts               tipos de norma y frecuencias

## Diferencias con la web

- Los indicadores de cumplimiento (% cumplimiento, en proceso, incumplimientos, dona) salen
  en 0 porque esta versión solo registra normas; no hay seguimientos. DashboardScreen
  acepta la propiedad `resumen` para alimentarlos cuando exista ese módulo.
- No se incluye el adjunto de evidencia ni el filtro por período de «Próximas revisiones».
- FAB.tsx (componente de la clase) queda en el proyecto sin usarse: el botón «+ Nueva norma»
  sigue el diseño de la web.
