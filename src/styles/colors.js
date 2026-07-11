/* ============================================================
   BROASTER TOPASC — Color System
   Todas las variables centralizadas en un archivo
   ============================================================ */

export const colors = {
  // Brand colors
  primary: '#E11E2B',      // Rojo principal Broaster
  success: '#25D366',      // Verde WhatsApp

  // Neutral colors
  darkText: '#241C15',     // Marrón oscuro para textos
  lightText: '#fff',       // Blanco
  darkGray: '#4B4B4B',     // Gris oscuro

  // Background colors
  bgLight: '#FBF6EE',      // Beige claro principal
  bgWhite: '#fff',         // Blanco puro

  // Accent colors
  accentYellow: '#FFE9A8', // Amarillo suave (loader)
  accentYellowLight: '#FFF3D6', // Amarillo más claro (stepper bg)

  // Border colors
  borderLight: '#F0E6D6',  // Borde claro
};

export const shadows = {
  sm: '0 1px 4px rgba(0, 0, 0, 0.05)',
  md: '0 4px 12px rgba(0, 0, 0, 0.08)',
  lg: '0 30px 60px rgba(0, 0, 0, 0.25)',
};

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  xxl: '2.5rem',
};

export const typography = {
  // Luckiest Guy — Display titles
  displayLarge: {
    fontFamily: "'Luckiest Guy', cursive",
    fontSize: '2.875rem',
    fontWeight: 400,
    lineHeight: 0.95,
    letterSpacing: '0.5px',
  },

  // Poppins — Headers
  headerLarge: {
    fontFamily: "'Poppins', sans-serif",
    fontSize: '1.0625rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },

  headerMedium: {
    fontFamily: "'Poppins', sans-serif",
    fontSize: '0.84375rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },

  // Inter — Body text
  body: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.8125rem',
    fontWeight: 500,
    lineHeight: 1.4,
  },

  bodySm: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: 1.4,
  },
};

export const borderRadius = {
  sm: '0.625rem',
  md: '0.875rem',
  lg: '1rem',
  xl: '1.125rem',
  full: '9999px',
};
