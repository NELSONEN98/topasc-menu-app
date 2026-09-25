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
 * el menu.
 *
 * Se busca la RAIZ dentro del nombre y no el nombre completo, y eso es por un
 * bug real: la categoria del local se llama "Gaseosa" (singular) y la lista
 * decia "gaseosas", asi que no matcheaba y el checkbox de salsas seguia
 * apareciendo. Con la raiz entran "Gaseosa", "Gaseosas", "Bebida", "Bebidas" y
 * tambien "Bebidas y Gaseosas", sin depender de como lo escribio cada uno.
 *
 * Lo que sigue sin cubrir: una categoria llamada "Refrescos" o "Sodas" no
 * matchea. Si eso llega a pasar, la solucion de fondo no es alargar esta lista
 * sino marcar la categoria como "es bebida" en el panel.
 */
const RAICES_DE_BEBIDA = ['bebida', 'gaseosa'];

export const esCategoriaDeBebida = (categorias, categoriaId) => {
  const nombre = categorias.find((c) => c._id === categoriaId)?.nombre;
  if (!nombre) return false;

  const clave = nombre.trim().toLowerCase();

  return RAICES_DE_BEBIDA.some((raiz) => clave.includes(raiz));
};
