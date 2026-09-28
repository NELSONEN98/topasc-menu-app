/*
 * Que categorias cuentan como "bebida". Decide dos cosas:
 *   - el boton "¿Desea agregar bebida?" del carrito ofrece estos productos
 *   - una bebida nunca pide salsas, ni en el menu ni en el formulario del admin
 *
 * Manda el campo `esBebida` de la categoria, que se marca desde el panel.
 *
 * La deteccion por nombre quedo SOLO como respaldo, para las categorias que
 * nadie marco todavia. No alcanza por si sola, y eso se aprendio a los golpes:
 * primero fallo con "Gaseosa" en singular contra una lista que decia
 * "gaseosas", y despues en produccion, donde las bebidas viven en "JUGOS
 * NATURALES" y ni "bebida" ni "gaseosa" aparecen en el nombre. El nombre lo
 * escribe el local; no hay lista que lo adivine.
 *
 * Cuando todas las categorias de bebida esten marcadas, este respaldo se puede
 * borrar y dejar solo el campo.
 */
const RAICES_DE_BEBIDA = ['bebida', 'gaseosa', 'jugo', 'refresco', 'limonada'];

const nombreSugiereBebida = (nombre) => {
  const clave = nombre.trim().toLowerCase();

  return RAICES_DE_BEBIDA.some((raiz) => clave.includes(raiz));
};

/**
 * El valor EFECTIVO para una categoria ya encontrada. Mismo motivo que
 * `categoriaAdmiteLeche`: el formulario tiene que hidratar el checkbox con esto
 * y no con el campo crudo, o guardar una categoria que hoy funciona por el
 * nombre le escribe un `false` explicito y le devuelve las salsas a las
 * gaseosas.
 */
export const categoriaEsBebida = (categoria) => {
  if (!categoria) return false;

  // La marca explicita gana en los dos sentidos: si el admin la puso en false,
  // no es bebida aunque el nombre diga "jugo".
  if (categoria.esBebida !== undefined) return categoria.esBebida;

  return nombreSugiereBebida(categoria.nombre ?? '');
};

export const esCategoriaDeBebida = (categorias, categoriaId) =>
  categoriaEsBebida(categorias.find((c) => c._id === categoriaId));

/*
 * Que categorias se pueden pedir en agua o en leche. Decide UNA sola cosa: si el
 * formulario del producto muestra el campo "Precio con leche".
 *
 * Es deliberadamente mas angosto que `esCategoriaDeBebida`, y esa diferencia es
 * el punto: una gaseosa ES bebida y con leche no existe. Usar `esBebida` para
 * esconder el campo lo esconderia tambien en los jugos, que son los unicos que
 * lo necesitan — o sea, rompiendo justo la opcion de agua/leche.
 *
 * Mismo esquema que arriba: manda el campo `admiteLeche` de la categoria y la
 * deteccion por nombre queda SOLO como respaldo, para las que nadie marco. El
 * respaldo es lo que hace que en produccion "JUGOS NATURALES" siga ofreciendo la
 * opcion sin que nadie tenga que ir a marcar nada.
 */
const RAICES_CON_LECHE = ['jugo'];

/**
 * El valor EFECTIVO para una categoria ya encontrada: lo que hoy decide el
 * comportamiento, sea por el campo o por el respaldo del nombre.
 *
 * Se exporta para que el formulario de la categoria hidrate el checkbox con
 * esto y no con el campo crudo. La diferencia no es cosmetica: "JUGOS
 * NATURALES" en produccion no tiene el campo y funciona por el nombre. Si el
 * checkbox naciera destildado, abrir esa categoria para renombrarla y guardar
 * escribiria `admiteLeche: false`, el campo le ganaria al nombre y la opcion de
 * leche desapareceria de los jugos sin que nadie lo haya pedido.
 */
export const categoriaAdmiteLeche = (categoria) => {
  if (!categoria) return false;

  if (categoria.admiteLeche !== undefined) return categoria.admiteLeche;

  const clave = (categoria.nombre ?? '').trim().toLowerCase();

  return RAICES_CON_LECHE.some((raiz) => clave.includes(raiz));
};

export const esCategoriaConLeche = (categorias, categoriaId) =>
  categoriaAdmiteLeche(categorias.find((c) => c._id === categoriaId));
