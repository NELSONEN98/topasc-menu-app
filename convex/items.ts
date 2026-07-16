import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listarMenu = query({
  args: {},
  handler: async (ctx) => {
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
    precio: v.number(),
    imagenUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("items", {
      ...args,
      disponible: true,
      activo: true,
    });
  },
});

export const actualizar = mutation({
  args: {
    id: v.id("items"),
    campos: v.object({
      nombre: v.optional(v.string()),
      precio: v.optional(v.number()),
      disponible: v.optional(v.boolean()),
      activo: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { id, campos }) => {
    await ctx.db.patch(id, campos);
  },
});
