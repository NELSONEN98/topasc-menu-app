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

  /*
   * Una categoria que vende bebidas ENVASADAS no prepara nada en leche, y esto se
   * chequea antes del nombre por un caso concreto: una categoria "Jugos Hit"
   * contiene la palabra "jugo", asi que el respaldo la marcaria como de agua o
   * leche. Un Hit viene en botella — preguntarle al cliente si lo quiere en leche
   * no significa nada.
   *
   * Va aca y no solo en el formulario del producto para que el checkbox del panel
   * tampoco nazca tildado: un tilde que contradice al tipo elegido dos campos mas
   * arriba es una contradiccion que el admin no puede resolver.
   */
  if (categoria.tipoBebida) return false;

  if (categoria.admiteLeche !== undefined) return categoria.admiteLeche;

  const clave = (categoria.nombre ?? '').trim().toLowerCase();

  return RAICES_CON_LECHE.some((raiz) => clave.includes(raiz));
};

export const esCategoriaConLeche = (categorias, categoriaId) =>
  categoriaAdmiteLeche(categorias.find((c) => c._id === categoriaId));

/*
 * Que tipo de bebida envasada vende una categoria: 'gaseosa', 'agua', 'cerveza'
 * o null. Decide que tamaños ofrece el formulario del producto y si pregunta
 * marca y sabor.
 *
 * Otra vez mas angosto que `esCategoriaDeBebida`: un jugo natural es bebida y no
 * viene envasado ni tiene marca. Y otra vez el nombre queda SOLO como respaldo —
 * buscar "gaseosa" dentro del nombre ya fallo dos veces en este proyecto (ver el
 * comentario de arriba), asi que el campo del panel es el que manda.
 *
 * Las raices por tipo son deliberadamente pocas y obvias. No intentan cubrir todo
 * lo que el local pueda escribir: para eso esta el desplegable del panel. Estan
 * para que las categorias YA cargadas sigan funcionando el dia del deploy.
 */
const RAICES_POR_TIPO = {
  gaseosa: ['gaseosa', 'refresco'],
  agua: ['agua'],
  cerveza: ['cerveza', 'cervez'],
};

export const tipoBebidaDeCategoria = (categoria) => {
  if (!categoria) return null;

  // Lo explicito gana, incluida la cadena vacia que el formulario manda para
  // decir "esta categoria no vende bebidas envasadas".
  if (categoria.tipoBebida) return categoria.tipoBebida;

  // COMPAT: `esGaseosa` vivio menos de una hora pero llego a produccion. Se lee
  // como respaldo y ya no se escribe. Ver la nota en schema.ts.
  if (categoria.esGaseosa === true) return 'gaseosa';
  if (categoria.esGaseosa === false) return null;

  const clave = (categoria.nombre ?? '').trim().toLowerCase();

  for (const [tipo, raices] of Object.entries(RAICES_POR_TIPO)) {
    if (raices.some((raiz) => clave.includes(raiz))) return tipo;
  }

  return null;
};

export const tipoBebidaDeItem = (categorias, categoriaId) =>
  tipoBebidaDeCategoria(categorias.find((c) => c._id === categoriaId));

/**
 * ¿La categoria vende bebidas envasadas (de cualquier tipo)?
 *
 * Es lo que gatilla el bloque de tamaños en el formulario del producto. Se
 * mantiene como funcion propia y no como `tipo !== null` desparramado por el
 * codigo: la pregunta "¿muestro el bloque?" se hace en varios lugares y tiene que
 * dar siempre la misma respuesta.
 */
export const esCategoriaEnvasada = (categorias, categoriaId) =>
  tipoBebidaDeItem(categorias, categoriaId) !== null;
