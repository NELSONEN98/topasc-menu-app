import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requerirAdmin } from "./guardias";

// Publica: es el menu que ve el cliente al escanear el QR.
//
// Filtra por `disponible` ademas de `activo`. Son dos cosas distintas:
//   activo     = el producto existe en la carta
//   disponible = hoy se puede pedir (es lo que apaga el switch del admin)
//
// Si esta query mirara solo `activo`, apagar el switch pintaria el producto
// de gris en el panel y el cliente lo seguiria viendo y pidiendo.
//
// `sedeId` opcional y no obligatorio: el flujo por QR llega sin sede (las
// mesas todavia no la tienen, ver App.jsx). Sin sede se devuelve el menu
// completo — es preferible mostrar de mas que dejar la pantalla en blanco.
export const listarMenu = query({
  args: { sedeId: v.optional(v.id("sedes")) },
  handler: async (ctx, { sedeId }) => {
    const items = await ctx.db
      .query("items")
      .filter((q) =>
        q.and(q.eq(q.field("activo"), true), q.eq(q.field("disponible"), true))
      )
      .collect();

    if (!sedeId) return items;

    // El filtro por sede va en JS y no en el `.filter()` de arriba porque
    // Convex no sabe preguntar "este array contiene X". No es un problema: el
    // menu son decenas de items, no miles, y ya estan todos en memoria.
    //
    // Sin sedeIds (o vacio) = item anterior a este campo: se muestra en todas
    // las sedes hasta que el admin lo edite. Ver la nota en schema.ts.
    return items.filter(
      (item) => !item.sedeIds?.length || item.sedeIds.includes(sedeId)
    );
  },
});

// Solo admin: trae tambien los no disponibles. El panel los necesita para
// poder volver a activarlos — si usara `listarMenu`, apagar un producto lo
// haria desaparecer de la lista y no habria forma de encenderlo de nuevo.
export const listarTodos = query({
  args: {},
  handler: async (ctx) => {
    await requerirAdmin(ctx);

    return await ctx.db
      .query("items")
      .filter((q) => q.eq(q.field("activo"), true))
      .collect();
  },
});

export const crear = mutation({
  args: {
    categoriaId: v.id("categorias"),
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    ingredientes: v.optional(v.array(v.string())),
    precio: v.number(),
    imagenUrl: v.optional(v.string()),
    llevaSalsas: v.optional(v.boolean()),
    disponible: v.optional(v.boolean()),
    sedeIds: v.optional(v.array(v.id("sedes"))),
  },
  handler: async (ctx, args) => {
    await requerirAdmin(ctx);

    return await ctx.db.insert("items", {
      ...args,
      disponible: args.disponible ?? true,
      activo: true,
    });
  },
});

export const actualizar = mutation({
  args: {
    id: v.id("items"),
    campos: v.object({
      nombre: v.optional(v.string()),
      categoriaId: v.optional(v.id("categorias")),
      descripcion: v.optional(v.string()),
      ingredientes: v.optional(v.array(v.string())),
      precio: v.optional(v.number()),
      imagenUrl: v.optional(v.string()),
      disponible: v.optional(v.boolean()),
      activo: v.optional(v.boolean()),
      llevaSalsas: v.optional(v.boolean()),
      sedeIds: v.optional(v.array(v.id("sedes"))),
    }),
  },
  handler: async (ctx, { id, campos }) => {
    await requerirAdmin(ctx);

    await ctx.db.patch(id, campos);
  },
});

export const borrar = mutation({
  args: { id: v.id("items") },
  handler: async (ctx, { id }) => {
    await requerirAdmin(ctx);

    await ctx.db.delete(id);
  },
});
