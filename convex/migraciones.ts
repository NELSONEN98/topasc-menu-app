import { mutation } from "./_generated/server";

// Migracion de un solo uso: el flujo de 6 estados se reduce a
// recibido -> completado, con cancelado como unica salida de emergencia.
//
// Correr UNA vez, con el schema todavia expandido:
//   npx convex run migraciones:migrarEstados
//
// Recien despues de que esto corra se pueden borrar los estados viejos del
// schema. Cuando eso este hecho, este archivo se puede eliminar.

type EstadoNuevo = "recibido" | "completado";

const MAPA_ESTADOS: Record<string, EstadoNuevo> = {
  pendiente: "recibido",
  confirmado: "recibido",
  en_preparacion: "recibido",
  listo: "recibido",
  entregado: "completado",
  // `cancelado` no se toca: sigue siendo un estado valido.
};

export const migrarEstados = mutation({
  args: {},
  handler: async (ctx) => {
    const pedidos = await ctx.db.query("pedidos").collect();

    let migrados = 0;
    for (const pedido of pedidos) {
      const nuevo = MAPA_ESTADOS[pedido.estado];
      if (!nuevo) continue;

      await ctx.db.patch(pedido._id, { estado: nuevo });
      migrados += 1;
    }

    // Se devuelve el detalle para poder verificar por consola que no quedo
    // ningun pedido con un estado viejo antes de achicar el schema.
    return {
      total: pedidos.length,
      migrados,
      sinCambios: pedidos.length - migrados,
    };
  },
});
