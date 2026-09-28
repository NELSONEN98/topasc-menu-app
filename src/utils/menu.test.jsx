import { describe, expect, test } from 'vitest';
import { itemsVisibles, idsOcultosPorPromo, promosQueOcultan } from './menu';

const HOY = '2026-09-18';

const SALCHIPAPA = { _id: 'item_salchi', nombre: 'Salchipapa Sencilla', precio: 18000 };
const PAPA_LOCA = { _id: 'item_loca', nombre: 'Papa Loca', precio: 22000 };
const JUGO = { _id: 'item_jugo', nombre: 'Jugo de Mango', precio: 7000 };

const promo = (campos = {}) => ({
  _id: 'item_promo',
  nombre: '2x1 en Salchipapas',
  precio: 30000,
  esPromo: true,
  ...campos,
});

describe('itemsVisibles — una promo vigente tapa lo que reemplaza', () => {
  test('el producto tapado no llega al menú', () => {
    // La razón de ser de toda la feature: mientras corre el 2x1, la salchipapa
    // suelta no se puede pedir al precio de siempre.
    const menu = itemsVisibles(
      [SALCHIPAPA, PAPA_LOCA, promo({ ocultaItemIds: ['item_salchi'] })],
      HOY
    );

    expect(menu.map((i) => i._id)).toEqual(['item_loca', 'item_promo']);
  });

  test('tapa varios de una', () => {
    const menu = itemsVisibles(
      [SALCHIPAPA, PAPA_LOCA, JUGO, promo({ ocultaItemIds: ['item_salchi', 'item_loca'] })],
      HOY
    );

    expect(menu.map((i) => i._id)).toEqual(['item_jugo', 'item_promo']);
  });

  test('sin productos elegidos no tapa nada: es opcional', () => {
    const items = [SALCHIPAPA, PAPA_LOCA, promo()];

    // Y devuelve EL MISMO array, no una copia: es el caso normal (la mayoría de
    // los días no hay nada tapado) y un array nuevo por render recalcularía
    // todos los useMemo que dependen de esto.
    expect(itemsVisibles(items, HOY)).toBe(items);
  });
});

describe('itemsVisibles — una promo que no está corriendo no tapa nada', () => {
  test('todavía no arrancó', () => {
    // Si tapara desde antes, el producto desaparecería del menú días antes de
    // que la promo exista para el cliente.
    const menu = itemsVisibles(
      [SALCHIPAPA, promo({ ocultaItemIds: ['item_salchi'], vigenteDesde: '2026-09-20' })],
      HOY
    );

    expect(menu.map((i) => i._id)).toContain('item_salchi');
  });

  test('ya venció', () => {
    // El otro extremo, y el peor: el producto quedaría escondido para siempre
    // por una promo que nadie ve, sin ninguna pista del motivo.
    const menu = itemsVisibles(
      [SALCHIPAPA, promo({ ocultaItemIds: ['item_salchi'], vigenteHasta: '2026-09-17' })],
      HOY
    );

    expect(menu.map((i) => i._id)).toContain('item_salchi');
  });

  test('el último día de vigencia todavía tapa', () => {
    // Los extremos son inclusive, igual que en estaVigente.
    const menu = itemsVisibles(
      [SALCHIPAPA, promo({ ocultaItemIds: ['item_salchi'], vigenteHasta: HOY })],
      HOY
    );

    expect(menu.map((i) => i._id)).not.toContain('item_salchi');
  });

  test('la promo está apagada', () => {
    // El panel ve también los productos no disponibles, así que este chequeo
    // tiene que vivir dentro del util: si no, una promo apagada figuraría
    // tapando productos que en realidad se están vendiendo.
    const menu = itemsVisibles(
      [SALCHIPAPA, promo({ ocultaItemIds: ['item_salchi'], disponible: false })],
      HOY
    );

    expect(menu.map((i) => i._id)).toContain('item_salchi');
  });

  test('el producto está marcado como promo pero esPromo es false', () => {
    // Un producto normal con la lista cargada (porque alguna vez fue promo) no
    // tapa nada: el interruptor es `esPromo`.
    const menu = itemsVisibles(
      [SALCHIPAPA, promo({ ocultaItemIds: ['item_salchi'], esPromo: false })],
      HOY
    );

    expect(menu.map((i) => i._id)).toContain('item_salchi');
  });
});

describe('itemsVisibles — casos borde de los datos', () => {
  test('una promo NO se tapa a sí misma', () => {
    // Un id copiado a mano o un dato viejo haría desaparecer la promo justo el
    // día que arranca, y en el panel se vería perfecta.
    const menu = itemsVisibles([SALCHIPAPA, promo({ ocultaItemIds: ['item_promo'] })], HOY);

    expect(menu.map((i) => i._id)).toContain('item_promo');
  });

  test('un id de un producto borrado no rompe nada', () => {
    const menu = itemsVisibles([SALCHIPAPA, promo({ ocultaItemIds: ['item_fantasma'] })], HOY);

    expect(menu.map((i) => i._id)).toEqual(['item_salchi', 'item_promo']);
  });

  test('dos promos tapando el mismo producto lo tapan una sola vez', () => {
    const ocultos = idsOcultosPorPromo(
      [
        SALCHIPAPA,
        promo({ _id: 'p1', ocultaItemIds: ['item_salchi'] }),
        promo({ _id: 'p2', ocultaItemIds: ['item_salchi'] }),
      ],
      HOY
    );

    expect(ocultos.size).toBe(1);
  });

  test('un menú sin promos se devuelve tal cual', () => {
    const items = [SALCHIPAPA, PAPA_LOCA, JUGO];

    expect(itemsVisibles(items, HOY)).toBe(items);
  });
});

describe('promosQueOcultan — el aviso del panel', () => {
  test('dice qué promo tapa cada producto', () => {
    // Esto es lo que evita el ticket de soporte: sin el nombre, el admin ve el
    // producto disponible, el cliente no lo ve, y no hay dónde mirar.
    const tapados = promosQueOcultan(
      [SALCHIPAPA, promo({ ocultaItemIds: ['item_salchi'] })],
      HOY
    );

    expect(tapados.get('item_salchi')).toEqual(['2x1 en Salchipapas']);
  });

  test('lista las dos cuando dos promos tapan lo mismo', () => {
    const tapados = promosQueOcultan(
      [
        SALCHIPAPA,
        promo({ _id: 'p1', nombre: '2x1 en Salchipapas', ocultaItemIds: ['item_salchi'] }),
        promo({ _id: 'p2', nombre: 'Combo Familiar', ocultaItemIds: ['item_salchi'] }),
      ],
      HOY
    );

    expect(tapados.get('item_salchi')).toEqual(['2x1 en Salchipapas', 'Combo Familiar']);
  });

  test('un producto que nadie tapa no aparece en el mapa', () => {
    const tapados = promosQueOcultan([SALCHIPAPA, PAPA_LOCA, promo()], HOY);

    expect(tapados.has('item_salchi')).toBe(false);
  });
});
