import { describe, expect, test } from 'vitest';
import {
  esCategoriaDeBebida,
  esCategoriaConLeche,
  esCategoriaEnvasada,
  tipoBebidaDeItem,
  tipoBebidaDeCategoria,
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


describe('tipoBebidaDeCategoria — cada tipo tiene sus propios tamaños', () => {
  test('la categoría "Gaseosa" ya cargada se resuelve sin marcar nada', () => {
    // Respaldo por nombre: es lo que hace que la categoría que ya existe muestre
    // marca/sabor/tamaños el día del deploy, sin que nadie vaya a configurarla.
    expect(tipoBebidaDeItem(CATEGORIAS, 'cat_gaseosa')).toBe('gaseosa');
  });

  test('reconoce agua y cerveza por el nombre', () => {
    expect(tipoBebidaDeCategoria({ nombre: 'Aguas' })).toBe('agua');
    expect(tipoBebidaDeCategoria({ nombre: 'Cervezas' })).toBe('cerveza');
  });

  test('un jugo natural NO vende bebidas envasadas', () => {
    // El punto de que sea angosto: un jugo no viene envasado ni tiene marca. Si
    // usara `esCategoriaDeBebida`, el formulario le pediría marca a un jugo.
    expect(tipoBebidaDeItem(CATEGORIAS, 'cat_jugos')).toBe(null);
    expect(esCategoriaDeBebida(CATEGORIAS, 'cat_jugos')).toBe(true);
  });

  test('una categoría de comida no vende bebidas envasadas', () => {
    expect(tipoBebidaDeItem(CATEGORIAS, 'cat_comida')).toBe(null);
    expect(esCategoriaEnvasada(CATEGORIAS, 'cat_comida')).toBe(false);
  });

  test('"Bebidas" a secas no alcanza: hay que elegir el tipo', () => {
    // No se adivina. Una categoría genérica puede tener cualquier cosa adentro.
    expect(tipoBebidaDeItem(CATEGORIAS, 'cat_bebidas')).toBe(null);
  });

  test('el desplegable del panel gana sobre el nombre', () => {
    expect(tipoBebidaDeCategoria({ nombre: 'LO QUE SEA', tipoBebida: 'cerveza' })).toBe(
      'cerveza'
    );
    // Y gana incluso contra un nombre que dice otra cosa.
    expect(tipoBebidaDeCategoria({ nombre: 'Gaseosas', tipoBebida: 'agua' })).toBe('agua');
  });

  test('una categoría que no existe no vende bebidas envasadas', () => {
    expect(tipoBebidaDeItem(CATEGORIAS, 'cat_inexistente')).toBe(null);
    expect(tipoBebidaDeCategoria(undefined)).toBe(null);
  });
});

describe('tipoBebidaDeCategoria — compat con el esGaseosa que llegó a producción', () => {
  test('esGaseosa true sin tipoBebida se lee como gaseosa', () => {
    // El campo vivió menos de una hora pero alcanzó a deployarse, y el formulario
    // escribía el valor efectivo al guardar. Si no se leyera, una categoría
    // guardada en esa ventana perdería marca/sabor/tamaños de golpe.
    expect(tipoBebidaDeCategoria({ nombre: 'LO QUE SEA', esGaseosa: true })).toBe('gaseosa');
  });

  test('esGaseosa false sin tipoBebida apaga el respaldo del nombre', () => {
    // Era una decisión explícita del admin: respetarla.
    expect(tipoBebidaDeCategoria({ nombre: 'Gaseosas', esGaseosa: false })).toBe(null);
  });

  test('tipoBebida GANA sobre el campo viejo', () => {
    // Orden de lectura: lo nuevo primero. Si fuera al revés, una categoría con el
    // campo viejo en false no podría pasarse a agua nunca.
    expect(
      tipoBebidaDeCategoria({ nombre: 'X', esGaseosa: false, tipoBebida: 'agua' })
    ).toBe('agua');
  });
});

describe('jugo envasado vs jugo natural — la confusion mas peligrosa', () => {
  test('el tipo NO se adivina por el nombre: hay que elegirlo en el panel', () => {
    // A proposito no hay respaldo por nombre para este tipo. Si "jugo" fuera una
    // raiz, "JUGOS NATURALES" en produccion resolveria a jugo envasado y se
    // apagaria la opcion de agua/leche de los 5 jugos que ya estan cargados.
    expect(tipoBebidaDeCategoria({ nombre: 'Jugos Hit' })).toBe(null);
    expect(tipoBebidaDeCategoria({ nombre: 'JUGOS NATURALES' })).toBe(null);
  });

  test('"JUGOS NATURALES" sigue siendo de agua o leche', () => {
    // La regresion que protege lo de arriba.
    expect(categoriaAdmiteLeche({ nombre: 'JUGOS NATURALES' })).toBe(true);
  });

  test('una categoria con tipo envasado NO admite leche, aunque se llame "Jugos"', () => {
    // "Jugos Hit" contiene "jugo", asi que el respaldo la marcaria como de agua o
    // leche. Un Hit viene en botella: preguntarle al cliente si lo quiere en leche
    // no significa nada.
    expect(
      categoriaAdmiteLeche({ nombre: 'Jugos Hit', tipoBebida: 'jugo-envasado' })
    ).toBe(false);
  });

  test('el tipo gana incluso contra un admiteLeche explicito', () => {
    // Si alguien dejo el tilde puesto antes de elegir el tipo, el tipo manda: es
    // el dato mas especifico y el mas reciente.
    expect(
      categoriaAdmiteLeche({ nombre: 'X', admiteLeche: true, tipoBebida: 'jugo-envasado' })
    ).toBe(false);
  });

  test('el jugo envasado se elige explicitamente y funciona', () => {
    expect(tipoBebidaDeCategoria({ nombre: 'Jugos Hit', tipoBebida: 'jugo-envasado' })).toBe(
      'jugo-envasado'
    );
  });
});
