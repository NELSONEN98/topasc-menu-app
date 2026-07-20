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
    llevaSalsas: v.optional(v.boolean()),
    disponible: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
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
      precio: v.optional(v.number()),
      imagenUrl: v.optional(v.string()),
      disponible: v.optional(v.boolean()),
      activo: v.optional(v.boolean()),
      llevaSalsas: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { id, campos }) => {
    await ctx.db.patch(id, campos);
  },
});

export const borrar = mutation({
  args: { id: v.id("items") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
