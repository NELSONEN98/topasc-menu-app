import { describe, expect, test } from 'vitest';
import { esCategoriaBebidas } from './categorias';

const CATEGORIAS = [
  { _id: 'cat_comida', nombre: 'Salchipapas' },
  { _id: 'cat_bebidas', nombre: 'Bebidas' },
];

describe('esCategoriaBebidas', () => {
  test('reconoce la categoria Bebidas', () => {
    expect(esCategoriaBebidas(CATEGORIAS, 'cat_bebidas')).toBe(true);
  });

  test('una categoria de comida no es bebida', () => {
    expect(esCategoriaBebidas(CATEGORIAS, 'cat_comida')).toBe(false);
  });

  test('tolera mayusculas y espacios en el nombre', () => {
    // El nombre lo escribe el admin a mano: " BEBIDAS " tiene que contar.
    const conRuido = [{ _id: 'cat_x', nombre: '  BEBIDAS ' }];

    expect(esCategoriaBebidas(conRuido, 'cat_x')).toBe(true);
  });

  test('una categoria que no existe no es bebida', () => {
    // Un item puede apuntar a una categoria borrada o todavia no cargada: no
    // tiene que romper, solo contestar que no.
    expect(esCategoriaBebidas(CATEGORIAS, 'cat_inexistente')).toBe(false);
    expect(esCategoriaBebidas([], 'cat_bebidas')).toBe(false);
  });
});
