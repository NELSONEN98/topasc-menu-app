import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requerirAdmin } from "./guardias";

// Publica: el filtro "Promociones del dia" y el carrusel del menu leen esta.
// Solo trae las activas y en el orden en que se crearon.
export const listar = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("promocionesDelDia")
      .withIndex("por_orden")
      .order("asc")
      .filter((q) => q.eq(q.field("activa"), true))
      .collect();
  },
});

// Solo admin: trae tambien las apagadas, para poder reactivarlas.
export const listarTodas = query({
  args: {},
  handler: async (ctx) => {
    await requerirAdmin(ctx);

    return await ctx.db
      .query("promocionesDelDia")
      .withIndex("por_orden")
      .order("asc")
      .collect();
  },
});

export const crear = mutation({
  args: {
    titulo: v.string(),
    descripcion: v.optional(v.string()),
    precio: v.optional(v.number()),
    imagenUrl: v.optional(v.string()),
    activa: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requerirAdmin(ctx);

    const titulo = args.titulo.trim();
    if (titulo === "") {
      throw new Error("El titulo de la promo no puede estar vacio");
    }

    // Se agrega al final de la lista, igual que categorias:crear. No hay
    // reordenamiento manual todavia, asi que alcanza con "el ultimo + 1".
    const todas = await ctx.db.query("promocionesDelDia").collect();
    const ordenMaximo = todas.reduce((max, p) => Math.max(max, p.orden), 0);

    return await ctx.db.insert("promocionesDelDia", {
      titulo,
      descripcion: args.descripcion?.trim() || undefined,
      precio: args.precio,
      imagenUrl: args.imagenUrl || undefined,
      activa: args.activa ?? true,
      orden: ordenMaximo + 1,
    });
  },
});

export const actualizar = mutation({
  args: {
    id: v.id("promocionesDelDia"),
    campos: v.object({
      titulo: v.optional(v.string()),
      descripcion: v.optional(v.string()),
      precio: v.optional(v.number()),
      imagenUrl: v.optional(v.string()),
      activa: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { id, campos }) => {
    await requerirAdmin(ctx);

    if (campos.titulo !== undefined) {
      const titulo = campos.titulo.trim();
      if (titulo === "") {
        throw new Error("El titulo de la promo no puede estar vacio");
      }
      campos = { ...campos, titulo };
    }

    await ctx.db.patch(id, campos);
  },
});

export const borrar = mutation({
  args: { id: v.id("promocionesDelDia") },
  handler: async (ctx, { id }) => {
    await requerirAdmin(ctx);
    await ctx.db.delete(id);
  },
});
