/*
 * Arma el texto del pedido que se manda por WhatsApp.
 *
 * Vive en un util y no dentro de Cart.jsx porque es el canal PRINCIPAL del
 * pedido: si este texto sale mal, el local prepara mal. Un formato de este
 * tamaño metido en un handler de 60 líneas no se puede testear, y lo que no se
 * testea se rompe cuando alguien agrega un campo.
 *
 * SOBRE LA NEGRITA: los títulos van con *asterisco*, la marca de negrita de
 * WhatsApp, y se VERIFICÓ con un pedido real que renderiza bien (2026-09-30).
 *
 * Vale la aclaración porque antes en este proyecto salió literal: por eso una
 * versión intermedia del formato usaba MAYÚSCULAS en vez de asteriscos. Qué
 * cambió no quedó claro —cliente, versión de WhatsApp, o que el problema de
 * entonces fuera otro—, así que si algún día vuelve a verse sin negrita no hay
 * que investigar de cero: el formato se cambia acá y en un solo lugar.
 */

import { formatearTelefono } from './telefonoCliente';

// Los emojis de número solo llegan hasta el 10. De ahí en adelante se numera
// con dígitos comunes: mejor "11." que un emoji que no existe.
const NUMEROS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

const numeroDeItem = (indice) => NUMEROS[indice] ?? `${indice + 1}.`;

const SEPARADOR = '━━━━━━━━━━━━━━';

// El emoji acompaña la palabra, no la reemplaza: en la cocina se lee a los
// apurones, y cada sistema operativo dibuja los emojis distinto.
const TIPO = {
  delivery: { emoji: '🛵', label: 'Domicilio' },
  pickup: { emoji: '🏃', label: 'Recoger' },
  'dine-in': { emoji: '🪑', label: 'En mesa' },
};

const PAGO = { efectivo: 'Efectivo', transferencia: 'Transferencia' };

/** `* Etiqueta: valor`, o null si no hay valor. Se filtran después. */
const renglon = (etiqueta, valor) =>
  valor === undefined || valor === null || valor === '' ? null : `* ${etiqueta}: ${valor}`;

/**
 * Un ítem del pedido como bloque numerado.
 *
 * Solo se dibujan los renglones que EXISTEN. Un "Adicional: " vacío no es
 * neutro: el que arma el pedido se queda mirándolo preguntándose si se perdió un
 * dato o si el cliente no pidió nada.
 */
const bloqueDeItem = (item, indice, formatearPrecio) => {
  const renglones = [
    renglon('Cantidad', item.quantity),
    // Antes que las salsas y en su propio renglón: sin esto el local no sabe si
    // el jugo va en agua o en leche, que es la diferencia entre prepararlo bien
    // y prepararlo mal.
    renglon('Preparación', item.preparacion),
    // LEGACY: las gaseosas por sabor/tamaño ya no se cargan así, pero los
    // pedidos que todavía lleguen con el dato tienen que decirlo.
    renglon(
      'Presentación',
      item.presentacion ? `${item.presentacion.sabor} · ${item.presentacion.tamano}` : null
    ),
    renglon('Salsa', item.salsas?.length ? item.salsas.join(', ') : null),
    renglon(
      'Adicional',
      item.salsasExtra?.length ? item.salsasExtra.map((extra) => extra.nombre).join(', ') : null
    ),
    renglon('Observación', item.comentario),
    // El subtotal es por RENGLÓN (precio × cantidad), no el precio unitario: es
    // lo que le permite al local verificar que el total cierra.
    renglon('Subtotal', formatearPrecio(item.price * item.quantity)),
  ].filter(Boolean);

  return [`${numeroDeItem(indice)} *${item.name}*`, ...renglones].join('\n');
};

/**
 * El mensaje completo.
 *
 * Es una función pura y recibe `formatearPrecio` en vez de importarlo: así el
 * test fija el formato de la plata sin depender de qué locale tenga instalado
 * quien corre la suite (Intl.NumberFormat no da lo mismo en toda máquina).
 */
export const armarMensajePedido = ({
  orderType,
  items,
  cliente = null,
  sede = null,
  address = null,
  pickup = null,
  mesaNumero = null,
  metodoPago = null,
  subtotal,
  deliveryFee = 0,
  total,
  formatearPrecio,
}) => {
  const tipo = TIPO[orderType] ?? { emoji: '🧾', label: orderType };

  const encabezado = [
    '🍗 *NUEVO PEDIDO – BROASTER TOPASC*',
    '',
    // La sede va primero y no se puede sacar: mientras los locales compartan el
    // mismo número de WhatsApp, es lo ÚNICO que dice para cuál de los dos es el
    // pedido. Sin sede (entrada por QR) no se dibuja el renglón.
    sede ? `🏠 *Sede:* ${sede.nombre}` : null,
    `${tipo.emoji} *Tipo de pedido:* ${tipo.label}`,
    cliente?.nombre ? `👤 *Cliente:* ${cliente.nombre}` : null,
    cliente?.telefono ? `📱 *Teléfono:* ${formatearTelefono(cliente.telefono)}` : null,
    address?.direccion ? `📍 *Dirección:* ${address.direccion}` : null,
    address?.referencia ? `🔖 *Referencia:* ${address.referencia}` : null,
    mesaNumero ? `🪑 *Mesa:* ${mesaNumero}` : null,
    // El código de retiro es lo que el cliente dice en el mostrador para que le
    // encuentren la orden.
    pickup?.codigo ? `🔑 *Código de retiro:* ${pickup.codigo}` : null,
  ].filter((linea) => linea !== null);

  const detalle = items
    .map((item, indice) => bloqueDeItem(item, indice, formatearPrecio))
    .join('\n\n');

  const cierre = [
    // Subtotal y domicilio solo cuando hay envío que cobrar. Sin eso el subtotal
    // es igual al total y mostrar los dos es ruido; CON envío hay que mostrarlos,
    // o los subtotales de los ítems no suman el total y parece un error.
    ...(deliveryFee > 0
      ? [`🧾 *Subtotal:* ${formatearPrecio(subtotal)}`, `🛵 *Domicilio:* ${formatearPrecio(deliveryFee)}`]
      : []),
    `✅ *Total:* ${formatearPrecio(total)}`,
  ];

  const bloques = [
    encabezado.join('\n'),
    `${SEPARADOR}\n${detalle}\n${SEPARADOR}`,
    cierre.join('\n'),
  ];

  if (metodoPago) {
    bloques.push(`💳 *Medio de pago:* ${PAGO[metodoPago] ?? metodoPago}`);
  }

  return bloques.join('\n\n');
};
