import { describe, expect, test } from 'vitest';
import { esCategoriaDeBebida } from './categorias';

const CATEGORIAS = [
  { _id: 'cat_comida', nombre: 'Salchipapas' },
  { _id: 'cat_marcada', nombre: 'LO QUE SEA', esBebida: true },
  { _id: 'cat_desmarcada', nombre: 'Jugos Naturales', esBebida: false },
  { _id: 'cat_bebidas', nombre: 'Bebidas' },
  { _id: 'cat_gaseosa', nombre: 'Gaseosa' },
  { _id: 'cat_jugos', nombre: 'JUGOS NATURALES' },
];

describe('esCategoriaDeBebida — la marca del panel manda', () => {
  test('una categoria marcada cuenta, sin importar como se llame', () => {
    // Es el punto del campo: el nombre lo escribe el local y no hay lista que
    // lo adivine.
    expect(esCategoriaDeBebida(CATEGORIAS, 'cat_marcada')).toBe(true);
  });

  test('una categoria desmarcada NO cuenta, aunque el nombre diga jugos', () => {
    // La marca explicita gana en los dos sentidos.
    expect(esCategoriaDeBebida(CATEGORIAS, 'cat_desmarcada')).toBe(false);
  });
});

describe('esCategoriaDeBebida — respaldo por nombre', () => {
  test('reconoce las que nadie marco todavia', () => {
    expect(esCategoriaDeBebida(CATEGORIAS, 'cat_bebidas')).toBe(true);
    expect(esCategoriaDeBebida(CATEGORIAS, 'cat_gaseosa')).toBe(true);
  });

  test('reconoce "JUGOS NATURALES" (regresion de produccion)', () => {
    // El bug real: en produccion las 8 bebidas estaban en "JUGOS NATURALES",
    // que no contiene ni "bebida" ni "gaseosa", asi que el boton del carrito
    // no aparecia nunca.
    expect(esCategoriaDeBebida(CATEGORIAS, 'cat_jugos')).toBe(true);
  });

  test('una categoria de comida no es bebida', () => {
    expect(esCategoriaDeBebida(CATEGORIAS, 'cat_comida')).toBe(false);
  });

  test('una categoria que no existe no es bebida', () => {
    // Un item puede apuntar a una categoria borrada o todavia no cargada: no
    // tiene que romper, solo contestar que no.
    expect(esCategoriaDeBebida(CATEGORIAS, 'cat_inexistente')).toBe(false);
    expect(esCategoriaDeBebida([], 'cat_bebidas')).toBe(false);
  });
});
