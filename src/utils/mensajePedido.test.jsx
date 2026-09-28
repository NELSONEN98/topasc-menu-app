import { describe, expect, test } from 'vitest';
import { armarMensajePedido } from './mensajePedido';

// Formateador fijo y no el real: Intl.NumberFormat no da el mismo separador en
// toda máquina, y acá lo que se testea es el FORMATO del mensaje, no el locale.
const formatearPrecio = (precio) => `$${precio.toLocaleString('es-CO')}`;

const SALCHI = {
  name: 'SalchiTopasc personal',
  quantity: 1,
  price: 22000,
};

const ALITAS = {
  name: 'Alitas BBQ',
  quantity: 2,
  price: 11000,
};

const armar = (extra = {}) =>
  armarMensajePedido({
    orderType: 'delivery',
    items: [SALCHI],
    cliente: { nombre: 'Juan Pérez', telefono: '3000000000' },
    sede: { nombre: 'Sede Morichal' },
    address: { direccion: 'Barrio Manzanares, casa 10' },
    metodoPago: 'efectivo',
    subtotal: 22000,
    deliveryFee: 0,
    total: 22000,
    formatearPrecio,
    ...extra,
  });

describe('armarMensajePedido — encabezado', () => {
  test('abre con el título del negocio', () => {
    expect(armar()).toMatch(/^🍗 \*NUEVO PEDIDO – BROASTER TOPASC\*/);
  });

  test('la sede va en el texto', () => {
    // Mientras los locales compartan el número de WhatsApp, esto es lo ÚNICO que
    // dice para cuál de los dos es el pedido. No se puede perder.
    expect(armar()).toContain('🏠 *Sede:* Sede Morichal');
  });

  test('sin sede (entrada por QR) no se dibuja el renglón', () => {
    expect(armar({ sede: null })).not.toContain('*Sede:*');
  });

  test('nombre y teléfono del cliente', () => {
    const mensaje = armar();

    expect(mensaje).toContain('👤 *Cliente:* Juan Pérez');
    // El teléfono sale formateado, que es como el local lo lee y lo dicta.
    expect(mensaje).toContain('📱 *Teléfono:* 300 000 0000');
  });

  test('la dirección y su referencia', () => {
    const mensaje = armar({
      address: { direccion: 'Barrio Manzanares, casa 10', referencia: 'portón verde' },
    });

    expect(mensaje).toContain('📍 *Dirección:* Barrio Manzanares, casa 10');
    expect(mensaje).toContain('🔖 *Referencia:* portón verde');
  });

  test('sin referencia no queda un renglón vacío', () => {
    // Un "Referencia:" en blanco deja al que reparte mirándolo, sin saber si se
    // perdió un dato o si el cliente no puso nada.
    expect(armar()).not.toContain('*Referencia:*');
  });
});

describe('armarMensajePedido — tipo de pedido', () => {
  test('domicilio', () => {
    expect(armar()).toContain('🛵 *Tipo de pedido:* Domicilio');
  });

  test('recoger incluye el código de retiro', () => {
    const mensaje = armar({
      orderType: 'pickup',
      address: null,
      pickup: { nombre: 'Juan Pérez', codigo: 'A34' },
    });

    expect(mensaje).toContain('🏃 *Tipo de pedido:* Recoger');
    // Es lo que el cliente dice en el mostrador para que le encuentren la orden.
    expect(mensaje).toContain('🔑 *Código de retiro:* A34');
  });

  test('en mesa incluye el número', () => {
    const mensaje = armar({
      orderType: 'dine-in',
      address: null,
      cliente: null,
      mesaNumero: '5',
    });

    expect(mensaje).toContain('🪑 *Tipo de pedido:* En mesa');
    expect(mensaje).toContain('🪑 *Mesa:* 5');
  });

  test('en mesa no inventa cliente ni teléfono', () => {
    // No se piden en ese flujo: el cliente está sentado en una mesa conocida.
    const mensaje = armar({ orderType: 'dine-in', address: null, cliente: null, mesaNumero: '5' });

    expect(mensaje).not.toContain('*Cliente:*');
    expect(mensaje).not.toContain('*Teléfono:*');
  });
});

describe('armarMensajePedido — los ítems', () => {
  test('van numerados con emoji', () => {
    const mensaje = armar({ items: [SALCHI, ALITAS], subtotal: 44000, total: 44000 });

    expect(mensaje).toContain('1️⃣ *SalchiTopasc personal*');
    expect(mensaje).toContain('2️⃣ *Alitas BBQ*');
  });

  test('pasado el décimo se numera con dígitos', () => {
    // Los emojis de número llegan hasta el 10: mejor "11." que un emoji que no
    // existe.
    const once = Array.from({ length: 11 }, (_, i) => ({ ...SALCHI, name: `Item ${i + 1}` }));
    const mensaje = armar({ items: once, subtotal: 1, total: 1 });

    expect(mensaje).toContain('🔟 *Item 10*');
    expect(mensaje).toContain('11. *Item 11*');
  });

  test('el subtotal es precio × cantidad, no el precio unitario', () => {
    // Es lo que le permite al local verificar que el total cierra. Poner el
    // precio unitario en un renglón que dice "Subtotal" haría que las cuentas no
    // den y parezca un error del sistema.
    const mensaje = armar({ items: [ALITAS], subtotal: 22000, total: 22000 });

    expect(mensaje).toContain('* Cantidad: 2');
    expect(mensaje).toContain('* Subtotal: $22.000');
  });

  test('la preparación del jugo va en su propio renglón', () => {
    // Sin esto el local no sabe si el jugo va en agua o en leche, que es la
    // diferencia entre prepararlo bien y prepararlo mal.
    const mensaje = armar({
      items: [{ name: 'Jugo de Mango', quantity: 1, price: 10000, preparacion: 'En leche' }],
    });

    expect(mensaje).toContain('* Preparación: En leche');
  });

  test('salsas, adicionales y observación', () => {
    const mensaje = armar({
      items: [
        {
          ...SALCHI,
          salsas: ['BBQ', 'Rosada'],
          salsasExtra: [{ nombre: 'Queso' }, { nombre: 'Miel mostaza' }],
          comentario: 'Sin cebolla',
        },
      ],
    });

    expect(mensaje).toContain('* Salsa: BBQ, Rosada');
    expect(mensaje).toContain('* Adicional: Queso, Miel mostaza');
    expect(mensaje).toContain('* Observación: Sin cebolla');
  });

  test('un ítem sin extras solo muestra cantidad y subtotal', () => {
    const mensaje = armar();

    expect(mensaje).not.toContain('* Salsa:');
    expect(mensaje).not.toContain('* Adicional:');
    expect(mensaje).not.toContain('* Observación:');
  });

  test('"Sin salsas" se muestra tal cual', () => {
    // Es una elección explícita del cliente, no un dato faltante: el local tiene
    // que verla para no agregar salsa por costumbre.
    const mensaje = armar({ items: [{ ...SALCHI, salsas: ['Sin salsas'] }] });

    expect(mensaje).toContain('* Salsa: Sin salsas');
  });
});

describe('armarMensajePedido — el cierre', () => {
  test('con envío se desglosa subtotal y domicilio', () => {
    // Con envío hay que mostrarlos: si no, los subtotales de los ítems no suman
    // el total y parece un error.
    const mensaje = armar({ subtotal: 22000, deliveryFee: 8000, total: 30000 });

    expect(mensaje).toContain('🧾 *Subtotal:* $22.000');
    expect(mensaje).toContain('🛵 *Domicilio:* $8.000');
    expect(mensaje).toContain('✅ *Total:* $30.000');
  });

  test('sin envío no repite el mismo número dos veces', () => {
    const mensaje = armar();

    expect(mensaje).not.toContain('*Subtotal:*');
    expect(mensaje).toContain('✅ *Total:* $22.000');
  });

  test('un envío gratis (0) no dibuja el renglón', () => {
    // 0 es "el local lo regaló", y mostrarlo como renglón sugiere que falta
    // cobrarlo.
    expect(armar({ deliveryFee: 0 })).not.toContain('*Domicilio:*');
  });

  test('el medio de pago va al final', () => {
    expect(armar()).toMatch(/💳 \*Medio de pago:\* Efectivo$/);
    expect(armar({ metodoPago: 'transferencia' })).toContain('💳 *Medio de pago:* Transferencia');
  });

  test('sin medio de pago (mesa) no queda un renglón colgado', () => {
    expect(armar({ metodoPago: null })).not.toContain('*Medio de pago:*');
  });
});

describe('armarMensajePedido — estructura completa', () => {
  test('el detalle va encerrado entre separadores', () => {
    const mensaje = armar();
    const separadores = mensaje.match(/━━━━━━━━━━━━━━/g);

    expect(separadores).toHaveLength(2);
  });

  test('los ítems se separan con una línea en blanco entre sí', () => {
    const mensaje = armar({ items: [SALCHI, ALITAS], subtotal: 44000, total: 44000 });

    expect(mensaje).toContain('\n\n2️⃣ *Alitas BBQ*');
  });
});
