import { describe, expect, test } from 'vitest';
import {
  esCategoriaDeBebida,
  esCategoriaConLeche,
  categoriaEsBebida,
  categoriaAdmiteLeche,
} from './categorias';

const CATEGORIAS = [
  { _id: 'cat_comida', nombre: 'Salchipapas' },
  { _id: 'cat_marcada', nombre: 'LO QUE SEA', esBebida: true },
  { _id: 'cat_desmarcada', nombre: 'Jugos Naturales', esBebida: false },
  { _id: 'cat_bebidas', nombre: 'Bebidas' },
  { _id: 'cat_gaseosa', nombre: 'Gaseosa' },
  { _id: 'cat_jugos', nombre: 'JUGOS NATURALES' },
  { _id: 'cat_leche_si', nombre: 'LO QUE SEA', admiteLeche: true },
  { _id: 'cat_leche_no', nombre: 'Jugos Naturales', admiteLeche: false },
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

describe('esCategoriaConLeche — más angosto que "es bebida", a propósito', () => {
  test('una gaseosa NO admite leche', () => {
    // Lo que se pidió: el campo "Precio con leche" no va en gaseosas.
    expect(esCategoriaConLeche(CATEGORIAS, 'cat_gaseosa')).toBe(false);
  });

  test('pero SÍ es bebida: son dos preguntas distintas', () => {
    // El punto de tener dos funciones. Si el campo se escondiera con
    // `esCategoriaDeBebida`, se esconderia tambien en los jugos — o sea,
    // rompiendo justo la opcion de agua/leche que este campo existe para dar.
    expect(esCategoriaDeBebida(CATEGORIAS, 'cat_gaseosa')).toBe(true);
  });

  test('"JUGOS NATURALES" sigue admitiendo leche sin que nadie marque nada', () => {
    // Regresion de produccion: los jugos viven ahi. Si el respaldo por nombre no
    // la reconociera, este cambio apagaria la opcion de leche en produccion el
    // dia que se deploya.
    expect(esCategoriaConLeche(CATEGORIAS, 'cat_jugos')).toBe(true);
  });

  test('una categoría de comida no admite leche', () => {
    expect(esCategoriaConLeche(CATEGORIAS, 'cat_comida')).toBe(false);
  });

  test('"Bebidas" a secas no alcanza: hay que marcarla', () => {
    // No se adivina. Una categoria generica puede tener gaseosas adentro.
    expect(esCategoriaConLeche(CATEGORIAS, 'cat_bebidas')).toBe(false);
  });

  test('la marca del panel gana en los dos sentidos', () => {
    expect(esCategoriaConLeche(CATEGORIAS, 'cat_leche_si')).toBe(true);
    expect(esCategoriaConLeche(CATEGORIAS, 'cat_leche_no')).toBe(false);
  });

  test('una categoría que no existe no admite leche', () => {
    expect(esCategoriaConLeche(CATEGORIAS, 'cat_inexistente')).toBe(false);
    expect(esCategoriaConLeche([], 'cat_jugos')).toBe(false);
  });
});

describe('valor efectivo — con lo que el formulario hidrata los checkboxes', () => {
  test('una categoría sin el campo devuelve lo que decide el nombre', () => {
    // Es lo que evita el bug: si el checkbox naciera destildado, abrir "JUGOS
    // NATURALES" para renombrarla y guardar escribiria un false explicito, el
    // campo le ganaria al nombre, y se apagaria solo algo que nadie pidio.
    expect(categoriaAdmiteLeche({ nombre: 'JUGOS NATURALES' })).toBe(true);
    expect(categoriaEsBebida({ nombre: 'JUGOS NATURALES' })).toBe(true);
  });

  test('una gaseosa nace con "es bebida" tildado y "admite leche" destildado', () => {
    const gaseosa = { nombre: 'Gaseosa' };

    expect(categoriaEsBebida(gaseosa)).toBe(true);
    expect(categoriaAdmiteLeche(gaseosa)).toBe(false);
  });

  test('sin categoría (alta nueva) no explota', () => {
    expect(categoriaAdmiteLeche(undefined)).toBe(false);
    expect(categoriaEsBebida(undefined)).toBe(false);
  });
});
