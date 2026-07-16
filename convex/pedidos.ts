import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const crear = mutation({
  args: {
    tipoPedido: v.union(v.literal("delivery"), v.literal("pickup"), v.literal("dine-in")),
    clienteNombre: v.optional(v.string()),
    clienteTelefono: v.optional(v.string()),
    direccionEntrega: v.optional(v.string()),
    direccionReferencia: v.optional(v.string()),
    mesaNumero: v.optional(v.string()),
    costoDomicilio: v.optional(v.number()),
    total: v.number(),
    items: v.array(
      v.object({
        itemId: v.id("items"),
        nombreSnapshot: v.string(),
        precioSnapshot: v.number(),
        cantidad: v.number(),
        notas: v.optional(v.string()),
      })
    ),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pedidos", {
      ...args,
      estado: "confirmado",
    });
  },
});

export const listar = query({
  args: {
    estado: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.estado) {
      return await ctx.db
        .query("pedidos")
        .filter((q) => q.eq(q.field("estado"), args.estado))
        .order("desc", (q) => q.field("_creationTime"))
        .collect();
    }
    return await ctx.db
      .query("pedidos")
      .order("desc", (q) => q.field("_creationTime"))
      .collect();
  },
});

export const actualizar = mutation({
  args: {
    id: v.id("pedidos"),
    estado: v.union(
      v.literal("pendiente"),
      v.literal("confirmado"),
      v.literal("en_preparacion"),
      v.literal("listo"),
      v.literal("entregado"),
      v.literal("cancelado")
    ),
  },
  handler: async (ctx, { id, estado }) => {
    await ctx.db.patch(id, { estado });
  },
});
