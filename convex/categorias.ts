import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listar = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("categorias")
      .filter((q) => q.eq(q.field("activo"), true))
      .order("asc", (q) => q.field("orden"))
      .collect();
  },
});

export const crear = mutation({
  args: {
    nombre: v.string(),
    orden: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("categorias", {
      ...args,
      activo: true,
    });
  },
});

export const borrar = mutation({
  args: { id: v.id("categorias") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
