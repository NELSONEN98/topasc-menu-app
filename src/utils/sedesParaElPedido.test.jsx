import { describe, expect, test } from 'vitest';
import { sedesParaElPedido } from './sedesParaElPedido';

const DALIA = { _id: 'sede_dalia', nombre: 'TOPASC DALIAS' };
const MORICHAL = { _id: 'sede_morichal', nombre: 'TOPASC MORICHAL' };
const MANZANARES = { _id: 'sede_manzanares', nombre: 'TOPASC MANZANARES' };
const SEDES = [DALIA, MORICHAL, MANZANARES];

// En las tres sedes, como 46 de los 49 productos de producción.
const ALITAS = {
  _id: 'item_alitas',
  nombre: 'Alitas BBQ',
  sedeIds: ['sede_dalia', 'sede_morichal', 'sede_manzanares'],
};
// Solo en dos, como 'Hamburguesa topasc' en producción.
const HAMBURGUESA = {
  _id: 'item_burger',
  nombre: 'Hamburguesa topasc',
  sedeIds: ['sede_dalia', 'sede_manzanares'],
};
// Producto viejo sin el campo: se vende en todas.
const VIEJO = { _id: 'item_viejo', nombre: 'Muslo Topasc' };

const MENU = [ALITAS, HAMBURGUESA, VIEJO];

const linea = (item) => ({ id: item._id, name: item.nombre });

describe('sedesParaElPedido — quién puede atender el carrito', () => {
  test('un carrito que todas pueden atender las habilita todas', () => {
    const filas = sedesParaElPedido(SEDES, [linea(ALITAS)], MENU);

    expect(filas).toHaveLength(3);
    expect(filas.every((f) => f.puede)).toBe(true);
  });

  test('un producto restringido deshabilita la sede que no lo tiene', () => {
    // El agujero que esto tapa: el cliente navega el menú completo, agrega la
    // hamburguesa, y al final elige la sede que no la vende. El pedido llegaría al
    // WhatsApp de un local que no tiene lo que le pidieron.
    const filas = sedesParaElPedido(SEDES, [linea(HAMBURGUESA)], MENU);

    const morichal = filas.find((f) => f.sede._id === 'sede_morichal');
    expect(morichal.puede).toBe(false);
    expect(morichal.faltantes).toEqual(['Hamburguesa topasc']);

    // Las otras dos sí la tienen.
    expect(filas.filter((f) => f.puede)).toHaveLength(2);
  });

  test('devuelve TODAS las sedes, también las que no pueden', () => {
    // Esconderlas dejaría al cliente mirando una lista más corta sin entender por
    // qué, y si queda una sola parece que la app está rota.
    const filas = sedesParaElPedido(SEDES, [linea(HAMBURGUESA)], MENU);

    expect(filas.map((f) => f.sede.nombre)).toEqual([
      'TOPASC DALIAS',
      'TOPASC MORICHAL',
      'TOPASC MANZANARES',
    ]);
  });

  test('un producto SIN sedeIds se vende en todas', () => {
    // Mismo criterio que `listarMenu`, y tiene que seguir siendo el mismo: si no,
    // el menú ofrecería algo que el checkout después rechaza.
    const filas = sedesParaElPedido(SEDES, [linea(VIEJO)], MENU);

    expect(filas.every((f) => f.puede)).toBe(true);
  });

  test('un producto que ya no está en el menú NO bloquea el pedido', () => {
    // Pasa si lo borraron o lo apagaron después de que el cliente lo agregó. No se
    // puede saber en qué sedes se vendía, y frenar el pedido por algo que no se
    // puede verificar dejaría al cliente sin forma de arreglarlo.
    const filas = sedesParaElPedido(SEDES, [{ id: 'item_fantasma', name: 'X' }], MENU);

    expect(filas.every((f) => f.puede)).toBe(true);
  });

  test('nombra cada producto faltante UNA vez', () => {
    // El mismo producto puede estar en dos líneas del carrito (distintas salsas,
    // distinto tamaño) y repetirlo no agrega nada.
    const filas = sedesParaElPedido(
      SEDES,
      [linea(HAMBURGUESA), linea(HAMBURGUESA)],
      MENU
    );

    expect(filas.find((f) => f.sede._id === 'sede_morichal').faltantes).toEqual([
      'Hamburguesa topasc',
    ]);
  });

  test('lista TODOS los faltantes cuando son varios', () => {
    // El cliente necesita saber qué sacar, no solo que "algo" falta.
    const otro = {
      _id: 'item_contra',
      nombre: 'Contra Topasc',
      sedeIds: ['sede_dalia'],
    };
    const filas = sedesParaElPedido(
      SEDES,
      [linea(HAMBURGUESA), linea(otro)],
      [...MENU, otro]
    );

    expect(filas.find((f) => f.sede._id === 'sede_morichal').faltantes.sort()).toEqual([
      'Contra Topasc',
      'Hamburguesa topasc',
    ]);
  });

  test('un carrito vacío habilita todas', () => {
    // No hay nada que no se pueda preparar.
    expect(sedesParaElPedido(SEDES, [], MENU).every((f) => f.puede)).toBe(true);
  });

  test('sin sedes devuelve lista vacía, no explota', () => {
    expect(sedesParaElPedido([], [linea(ALITAS)], MENU)).toEqual([]);
  });
});
