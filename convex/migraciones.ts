import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requerirAdmin } from "./guardias";

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
    await requerirAdmin(ctx);

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

/**
 * Le pone precio con leche a los jugos que ya estaban cargados, para que todos
 * ofrezcan la opcion sin tener que editarlos uno por uno.
 *
 * Es `internalMutation` y NO `mutation`: asi no la puede llamar ningun cliente,
 * solo el CLI. Mismo criterio que `sedes:sincronizar`. Una mutation publica sin
 * `requerirAdmin` seria un agujero — cualquiera podria cambiarte los precios.
 *
 *   npx convex run migraciones:ponerPrecioConLeche
 *   npx convex run migraciones:ponerPrecioConLeche --prod
 *
 * Es idempotente: NO toca los jugos que ya tienen el campo, asi que correrla
 * dos veces no duplica el recargo ni pisa un precio puesto a mano.
 *
 * Solo alcanza los productos cuyo nombre empieza con "jugo". A proposito: en
 * la misma categoria conviven limonadas y otras bebidas que con leche no
 * existen, asi que marcar la categoria entera pondria a la venta cosas que el
 * local no prepara.
 */
export const ponerPrecioConLeche = internalMutation({
  args: {
    // Parametrizado y con default: el recargo de hoy es 3000, pero que quede
    // clavado en el codigo obliga a editar el archivo para volver a usarla.
    recargo: v.optional(v.number()),
  },
  handler: async (ctx, { recargo = 3000 }) => {
    const items = await ctx.db.query("items").collect();

    const actualizados: { nombre: string; enAgua: number; conLeche: number }[] = [];
    const yaTenian: string[] = [];

    for (const item of items) {
      if (!item.nombre.trim().toLowerCase().startsWith("jugo")) continue;

      if (item.precioConLeche !== undefined) {
        yaTenian.push(item.nombre);
        continue;
      }

      const conLeche = item.precio + recargo;
      await ctx.db.patch(item._id, { precioConLeche: conLeche });
      actualizados.push({
        nombre: item.nombre,
        enAgua: item.precio,
        conLeche,
      });
    }

    return { recargo, actualizados, yaTenian };
  },
});
