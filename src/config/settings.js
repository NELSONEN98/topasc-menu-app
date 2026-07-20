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

// Cantidad de productos por página
export const ITEMS_PER_PAGE = 6;
