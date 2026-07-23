/* ============================================================
   BROASTER TOPASC — Configuración
   Variables que se pueden cambiar fácilmente
   ============================================================ */

// Horario de respaldo: el horario real vive en la tabla `horariosAtencion` y se
// edita por día desde el admin. Esto solo se muestra mientras la query carga.
export const BUSINESS_HOURS = {
  openTime: '11:00',
  closeTime: '22:00',
};

// Valor de domicilio por tipo de orden
export const DELIVERY_FEES = {
  delivery: 10000,      // Domicilio: $10.000
  pickup: 0,            // Recoger: gratis
  dineIn: 0,            // Pedir a la mesa: gratis
};

// Moneda y formato
export const CURRENCY = {
  code: 'COP',
  symbol: '$',
  locale: 'es-CO',
};

// Nombre del negocio
export const BUSINESS_NAME = 'Topasc';

// Número de WhatsApp para contacto (sin +, sin espacios)
export const WHATSAPP_NUMBER = '573206873870';

// Cantidad de productos por página en el menú del cliente
export const ITEMS_PER_PAGE = 6;

// Filas por página en las tablas del admin (pantalla más grande que el menú)
export const ADMIN_ITEMS_PER_PAGE = 8;

// Imagen por defecto cuando un producto se crea sin foto.
// Las salsas no llevan imagen.
export const PLACEHOLDER_PRODUCTO =
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop';
