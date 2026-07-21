import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listarDisponibles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("salsas")
      .filter((q) =>
        q.and(
          q.eq(q.field("activo"), true),
          q.eq(q.field("disponible"), true)
        )
      )
      .collect();
  },
});

export const listar = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("salsas")
      .filter((q) => q.eq(q.field("activo"), true))
      .collect();
  },
});

export const crear = mutation({
  args: {
    nombre: v.string(),
    tipo: v.union(v.literal("base"), v.literal("especial")),
    precio: v.number(),
    imagenUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("salsas", {
      ...args,
      disponible: true,
      activo: true,
    });
  },
});

export const actualizar = mutation({
  args: {
    id: v.id("salsas"),
    campos: v.object({
      nombre: v.optional(v.string()),
      tipo: v.optional(v.union(v.literal("base"), v.literal("especial"))),
      precio: v.optional(v.number()),
      imagenUrl: v.optional(v.string()),
      disponible: v.optional(v.boolean()),
      activo: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { id, campos }) => {
    await ctx.db.patch(id, campos);
  },
});

export const borrar = mutation({
  args: { id: v.id("salsas") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
