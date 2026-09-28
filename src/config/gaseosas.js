/*
 * Catalogo de gaseosas: marcas, sabores y tamaños.
 *
 * Esta lista vive en el CODIGO y no en la base (decision explicita). La
 * contrapartida es concreta: agregar un sabor nuevo requiere editar este archivo
 * y deployar. Si eso empieza a molestar, el camino es una tabla `sabores` con su
 * seccion en el panel, igual que las salsas o las sedes — el resto del codigo no
 * se enteraria, porque todos leen de aca.
 *
 * Por que una lista cerrada y no texto libre: en produccion ya hay "Jugo de
 * Maracuya" sin tilde, "MaraCumango" con mayuscula en el medio y cinco nombres
 * con un espacio al final. Un desplegable no puede escribir mal un sabor.
 */

/**
 * Los tamaños que se ofrecen, en orden de menor a mayor.
 *
 * El orden importa y no es alfabetico: es el que ve el cliente en el selector, y
 * de chico a grande es como se lee un precio que sube. Alfabeticamente "1 lt"
 * iria antes que "350 ml", que no tiene ningun sentido.
 *
 * Son strings y no numeros a proposito: viajan tal cual al pedido y al mensaje de
 * WhatsApp, donde "1 lt" se lee y "1000" habria que interpretarlo.
 */
export const TAMANOS = ['350 ml', '500 ml', '1 lt', '2 lt', '3 lt'];

/**
 * Las marcas, con sus sabores.
 *
 * La clave es lo que se guarda en la base; `etiqueta` es lo que se muestra. Se
 * separan porque el nombre visible puede cambiar (acentos, mayusculas) sin que
 * haya que migrar ni un registro.
 */
export const MARCAS = {
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
};

/** Para recorrer las marcas en el formulario sin perder el orden. */
export const MARCAS_LISTA = Object.entries(MARCAS).map(([valor, marca]) => ({
  valor,
  ...marca,
}));

/** Sabores de una marca. Una marca desconocida devuelve lista vacia, no undefined. */
export const saboresDeMarca = (marca) => MARCAS[marca]?.sabores ?? [];

/** Nombre visible de una marca. Cae al valor crudo si la marca ya no existe en la lista. */
export const etiquetaDeMarca = (marca) => MARCAS[marca]?.etiqueta ?? marca ?? '';
