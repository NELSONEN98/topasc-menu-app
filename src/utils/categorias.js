/*
 * Que categorias cuentan como "bebida".
 *
 * Vive en un solo lugar porque dos pantallas dependen de esto: el formulario
 * del admin (una bebida no lleva salsas, asi que el checkbox se esconde) y el
 * carrito (el boton de agregar bebidas). Si cada una tuviera su copia,
 * renombrar o agregar una categoria dejaria una de las dos rota sin que nadie
 * se entere.
 *
 * Se compara por NOMBRE porque la tabla `categorias` no tiene un campo de
 * tipo: es la misma convencion que usa convex/categorias.ts para sincronizar
 * el menu. El costo es este: si alguien renombra o agrega una categoria de
 * bebidas desde el panel, hay que sumarla a esta lista. Cuando sean mas de
 * tres o cuatro, conviene marcarlo en la propia categoria.
 */
const CATEGORIAS_DE_BEBIDA = ['bebidas', 'gaseosas'];

const clave = (nombre) => nombre?.trim().toLowerCase();

export const esCategoriaDeBebida = (categorias, categoriaId) => {
  const nombre = categorias.find((c) => c._id === categoriaId)?.nombre;

  return CATEGORIAS_DE_BEBIDA.includes(clave(nombre));
};
