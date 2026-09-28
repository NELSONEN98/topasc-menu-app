/*
 * Catalogo de bebidas envasadas: que tamaños y que marcas tiene cada tipo.
 *
 * Se organiza por TIPO y no en una lista sola porque los tamaños no se comparten:
 * un agua viene en 600 ml y nada mas, una cerveza en 473 ml, y una gaseosa en
 * seis tamaños que ninguna de las otras dos usa. Una lista unica con los ocho
 * tamaños juntos le mostraria al admin "2.5 lt" cargando un agua, que es una fila
 * que nunca va a llenar y una que puede llenar por error.
 *
 * Vive en el CODIGO y no en la base (decision explicita del usuario). La
 * contrapartida: agregar un tamaño o un sabor requiere editar este archivo y
 * deployar. Si molesta, el camino es una tabla con su seccion en el panel, igual
 * que las salsas o las sedes — el resto del codigo no se enteraria, porque todos
 * leen de aca.
 *
 * Por que listas cerradas y no texto libre: en produccion ya hay "Jugo de
 * Maracuya" sin tilde, "MaraCumango" con mayuscula en el medio y cinco nombres
 * con un espacio al final. Un desplegable no puede escribir mal un sabor.
 */

/**
 * Los tipos de bebida envasada.
 *
 * `tamanos` va de menor a mayor y ese orden IMPORTA: es el que ve el cliente en
 * el selector, y de chico a grande es como se lee un precio que sube.
 * Alfabeticamente "1.25 lt" iria antes que "250 ml", que no tiene sentido.
 *
 * Los tamaños son strings con su unidad y no numeros: viajan tal cual al pedido y
 * al mensaje de WhatsApp, donde "1.25 lt" se lee y "1250" habria que interpretarlo.
 *
 * `marcas` vacio significa que ese tipo no pregunta marca ni sabor. Hoy solo las
 * gaseosas lo hacen: para el agua y la cerveza el usuario pidio unicamente el
 * tamaño. Si mañana hay que elegir entre Aguila y Poker, se agrega la marca acá y
 * el formulario la muestra solo — no hay nada mas que tocar.
 */
export const TIPOS_BEBIDA = {
  gaseosa: {
    etiqueta: 'Gaseosa',
    tamanos: ['250 ml', '350 ml', '400 ml', '1.25 lt', '1.5 lt', '2.5 lt'],
    marcas: {
      'coca-cola': {
        etiqueta: 'Coca Cola',
        sabores: [
          'Coca Cola',
          'Coca Cola Sin Azúcar',
          'Sprite',
          'Fanta Naranja',
          'Fanta Uva',
          'Quatro',
          'Premio',
        ],
      },
      postobon: {
        etiqueta: 'Postobón',
        sabores: [
          'Manzana',
          'Uva',
          'Naranja',
          'Piña',
          'Colombiana',
          'Kola Román',
          'Limonada',
          'Soda',
        ],
      },
    },
  },
  agua: {
    etiqueta: 'Agua',
    tamanos: ['600 ml'],
    marcas: {},
  },
  cerveza: {
    etiqueta: 'Cerveza',
    tamanos: ['473 ml'],
    marcas: {},
  },
};

/** Para recorrer los tipos en el formulario sin perder el orden de declaracion. */
export const TIPOS_BEBIDA_LISTA = Object.entries(TIPOS_BEBIDA).map(([valor, tipo]) => ({
  valor,
  etiqueta: tipo.etiqueta,
}));

/**
 * Tamaños de un tipo. Un tipo desconocido (o ninguno) devuelve lista vacia, no
 * undefined: quien llama la recorre sin tener que chequear.
 */
export const tamanosDeTipo = (tipo) => TIPOS_BEBIDA[tipo]?.tamanos ?? [];

/** ¿Este tipo pregunta marca y sabor? Hoy solo la gaseosa. */
export const tipoPideMarca = (tipo) =>
  Object.keys(TIPOS_BEBIDA[tipo]?.marcas ?? {}).length > 0;

/** Marcas de un tipo, listas para el desplegable. */
export const marcasDeTipo = (tipo) =>
  Object.entries(TIPOS_BEBIDA[tipo]?.marcas ?? {}).map(([valor, marca]) => ({
    valor,
    etiqueta: marca.etiqueta,
  }));

/**
 * Sabores de una marca dentro de un tipo.
 *
 * Recibe el tipo ademas de la marca porque la misma clave de marca podria existir
 * en dos tipos con sabores distintos. Hoy no pasa, pero buscar la marca a ciegas
 * en todo el catalogo seria una suposicion que el dia que se rompa no avisa.
 */
export const saboresDeMarca = (tipo, marca) =>
  TIPOS_BEBIDA[tipo]?.marcas?.[marca]?.sabores ?? [];

/** Nombre visible de una marca. Cae al valor crudo si ya no esta en el catalogo. */
export const etiquetaDeMarca = (tipo, marca) =>
  TIPOS_BEBIDA[tipo]?.marcas?.[marca]?.etiqueta ?? marca ?? '';

/**
 * TODOS los tamaños de todos los tipos, sin repetidos.
 *
 * Lo usa el guardado para recorrer el mapa del formulario: si recorriera solo los
 * del tipo actual, cambiar una categoria de gaseosa a agua dejaria los precios de
 * los tamaños viejos guardados y sin forma de verlos ni borrarlos.
 */
export const TODOS_LOS_TAMANOS = [
  ...new Set(Object.values(TIPOS_BEBIDA).flatMap((tipo) => tipo.tamanos)),
];
