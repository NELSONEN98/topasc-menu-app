// Mismo nombre que usa convex/categorias.ts para sincronizar el menu.
//
// Vive en un solo lugar porque dos pantallas dependen de el: el formulario del
// admin (solo las bebidas pueden llevar sabor y tamaño) y el carrito (el boton
// de agregar bebidas). Si cada una tuviera su copia, renombrar la categoria
// dejaria una de las dos rota sin que nadie se entere.
//
// Se compara por nombre porque la tabla `categorias` no tiene un campo de
// tipo. Si alguien renombra la categoria "Bebidas" desde el panel, hay que
// actualizar esta constante.
const NOMBRE_CATEGORIA_BEBIDAS = 'bebidas';

export const esCategoriaBebidas = (categorias, categoriaId) =>
  categorias.find((c) => c._id === categoriaId)?.nombre?.trim().toLowerCase() ===
  NOMBRE_CATEGORIA_BEBIDAS;
