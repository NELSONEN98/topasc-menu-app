/*
 * Que sedes pueden atender el carrito que el cliente armo.
 *
 * Hace falta porque en domicilio la sede se elige al FINAL: el cliente navega el
 * menu completo y recien en el checkout dice de donde quiere que se lo manden. Eso
 * abre un agujero concreto — en produccion 3 de 49 productos no se venden en las
 * tres sedes, asi que se puede armar un carrito que un local no puede preparar.
 *
 * Sin este chequeo el pedido llega al WhatsApp de una sede que no tiene lo que le
 * pidieron, y eso se descubre por telefono con el cliente esperando.
 */

/**
 * Devuelve una fila por sede: `{ sede, puede, faltantes }`.
 *
 * Se devuelven TODAS las sedes y no solo las que pueden, con el detalle de que les
 * falta. Esconder las que no sirven dejaria al cliente mirando una lista mas corta
 * sin entender por que — y si queda una sola, parece que la app esta rota. Mejor
 * decirle "esta no tiene la hamburguesa" y que elija con el dato.
 *
 * `itemsDelMenu` son los productos tal como los devuelve `listarMenu` SIN sede (el
 * menu completo): de ahi sale el `sedeIds` de cada uno. Los items del carrito solo
 * guardan un snapshot (id, nombre, precio), no las sedes.
 */
export const sedesParaElPedido = (sedes, cartItems, itemsDelMenu) => {
  const porId = new Map(itemsDelMenu.map((item) => [item._id, item]));

  return sedes.map((sede) => {
    const faltantes = [];

    for (const linea of cartItems) {
      const producto = porId.get(linea.id);

      /*
       * Un producto que no esta en el menu no bloquea nada.
       *
       * Pasa si lo borraron o lo apagaron despues de que el cliente lo agrego. No
       * se puede saber en que sedes se vendia, y frenar el pedido por algo que no
       * se puede verificar seria peor: el cliente no tendria forma de arreglarlo
       * mas que vaciar el carrito a ciegas. El local lo va a ver en el pedido.
       */
      if (!producto) continue;

      // Sin sedeIds (o vacio) = producto anterior a ese campo: se vende en todas.
      // Mismo criterio que `listarMenu`, y tiene que seguir siendo el mismo o el
      // menu ofreceria algo que el checkout despues rechaza.
      if (!producto.sedeIds?.length) continue;

      if (!producto.sedeIds.includes(sede._id)) {
        faltantes.push(linea.name);
      }
    }

    return {
      sede,
      puede: faltantes.length === 0,
      // Sin repetidos: el mismo producto puede estar en dos lineas del carrito
      // (distintas salsas, distinto tamaño) y nombrarlo dos veces no agrega nada.
      faltantes: [...new Set(faltantes)],
    };
  });
};
