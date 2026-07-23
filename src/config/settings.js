/* ============================================================
   BROASTER TOPASC — Configuración
   Variables que se pueden cambiar fácilmente
   ============================================================ */

// Horarios de operación
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

// Imagen por defecto cuando un producto o salsa se crea sin foto
export const PLACEHOLDER_PRODUCTO =
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop';
export const PLACEHOLDER_SALSA =
  'https://images.unsplash.com/photo-1623340158501-ba1fd069b06b?w=80&h=80&fit=crop';
