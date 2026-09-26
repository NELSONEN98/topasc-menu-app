/*
 * Que categorias cuentan como "bebida". Decide dos cosas:
 *   - el boton "¿Algo para tomar?" del carrito ofrece estos productos
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

export const esCategoriaDeBebida = (categorias, categoriaId) => {
  const categoria = categorias.find((c) => c._id === categoriaId);
  if (!categoria) return false;

  // La marca explicita gana en los dos sentidos: si el admin la puso en false,
  // no es bebida aunque el nombre diga "jugo".
  if (categoria.esBebida !== undefined) return categoria.esBebida;

  return nombreSugiereBebida(categoria.nombre ?? '');
};
