import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Token del QR: corto, sin caracteres ambiguos, difícil de adivinar de memoria.
const generarToken = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < 6; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
};

// Identifica la mesa a partir del código del QR. Devuelve null si no existe
// o está inactiva — la app decide el fallback, nunca confía en la URL a ciegas.
export const porCodigo = query({
  args: { codigo: v.string() },
  handler: async (ctx, { codigo }) => {
    const mesa = await ctx.db
      .query("mesas")
      .withIndex("por_codigo", (q) => q.eq("codigo", codigo))
      .unique();
    if (!mesa || !mesa.activo) return null;
    return mesa;
  },
});

export const listar = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("mesas").collect();
  },
});

export const crear = mutation({
  args: {
    numero: v.string(),
    codigo: v.optional(v.string()),
  },
  handler: async (ctx, { numero, codigo }) => {
    // Genera un token único si no se pasó uno
    let token = codigo ?? generarToken();
    let existente = await ctx.db
      .query("mesas")
      .withIndex("por_codigo", (q) => q.eq("codigo", token))
      .unique();
    while (existente) {
      token = generarToken();
      existente = await ctx.db
        .query("mesas")
        .withIndex("por_codigo", (q) => q.eq("codigo", token))
        .unique();
    }

    return await ctx.db.insert("mesas", {
      numero,
      codigo: token,
      activo: true,
    });
  },
});

export const actualizar = mutation({
  args: {
    id: v.id("mesas"),
    campos: v.object({
      numero: v.optional(v.string()),
      codigo: v.optional(v.string()),
      activo: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { id, campos }) => {
    await ctx.db.patch(id, campos);
  },
});
