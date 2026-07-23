import { CURRENCY } from '../config/settings';

// Formateadores compartidos por la vista de pedidos activos y la tabla de
// completados, para que las dos muestren la plata y la hora igual.

export const TIPO_LABEL = {
  delivery: '🛵 Domicilio',
  pickup: '🏃 Recoger',
  'dine-in': '🪑 En mesa',
};

export const PAGO_LABEL = {
  efectivo: '💵 Efectivo',
  transferencia: '📱 Transferencia',
};

export const ESTADO_LABEL = {
  recibido: 'Recibido',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

export const formatearPrecio = (precio) =>
  new Intl.NumberFormat(CURRENCY.locale, {
    style: 'currency',
    currency: CURRENCY.code,
    minimumFractionDigits: 0,
  }).format(precio);

export const formatearHora = (ts) =>
  new Date(ts).toLocaleTimeString(CURRENCY.locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

// En el historial la hora sola no alcanza: hay que saber de qué día es.
export const formatearFecha = (ts) =>
  new Date(ts).toLocaleDateString(CURRENCY.locale, {
    day: '2-digit',
    month: '2-digit',
  });

// Texto corto de a quién va el pedido, según el tipo.
export const destinoDePedido = (pedido) => {
  if (pedido.tipoPedido === 'dine-in') return `Mesa ${pedido.mesaNumero}`;
  if (pedido.tipoPedido === 'delivery') return pedido.direccionEntrega || 'Sin dirección';
  return pedido.clienteNombre || 'Sin nombre';
};

export const contarItems = (pedido) =>
  pedido.items.reduce((total, item) => total + item.cantidad, 0);
