import { describe, expect, test } from 'vitest';
import { esCategoriaDeBebida } from './categorias';

const CATEGORIAS = [
  { _id: 'cat_comida', nombre: 'Salchipapas' },
  { _id: 'cat_bebidas', nombre: 'Bebidas' },
  { _id: 'cat_gaseosas', nombre: 'Gaseosas' },
  { _id: 'cat_gaseosa', nombre: 'Gaseosa' },
  { _id: 'cat_mixta', nombre: 'Bebidas y Gaseosas' },
];

describe('esCategoriaDeBebida', () => {
  test('reconoce Bebidas y Gaseosas', () => {
    expect(esCategoriaDeBebida(CATEGORIAS, 'cat_bebidas')).toBe(true);
    expect(esCategoriaDeBebida(CATEGORIAS, 'cat_gaseosas')).toBe(true);
  });

  test('el singular tambien cuenta (regresion)', () => {
    // El bug real: la categoria del local se llama "Gaseosa" y la lista decia
    // "gaseosas", asi que no matcheaba y el checkbox de salsas seguia saliendo.
    expect(esCategoriaDeBebida(CATEGORIAS, 'cat_gaseosa')).toBe(true);
  });

  test('un nombre compuesto tambien cuenta', () => {
    expect(esCategoriaDeBebida(CATEGORIAS, 'cat_mixta')).toBe(true);
  });

  test('una categoria de comida no es bebida', () => {
    expect(esCategoriaDeBebida(CATEGORIAS, 'cat_comida')).toBe(false);
  });

  test('tolera mayusculas y espacios en el nombre', () => {
    // El nombre lo escribe el admin a mano: " GASEOSAS " tiene que contar.
    const conRuido = [{ _id: 'cat_x', nombre: '  GASEOSAS ' }];

    expect(esCategoriaDeBebida(conRuido, 'cat_x')).toBe(true);
  });

  test('una categoria que no existe no es bebida', () => {
    // Un item puede apuntar a una categoria borrada o todavia no cargada: no
    // tiene que romper, solo contestar que no.
    expect(esCategoriaDeBebida(CATEGORIAS, 'cat_inexistente')).toBe(false);
    expect(esCategoriaDeBebida([], 'cat_bebidas')).toBe(false);
  });
});
