import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const itemValidator = v.object({
  itemId: v.id("items"),
  nombreSnapshot: v.string(),
  precioSnapshot: v.number(),
  cantidad: v.number(),
  salsasBase: v.optional(v.array(v.string())),
  salsasExtra: v.optional(
    v.array(v.object({ nombre: v.string(), precio: v.number() }))
  ),
  notas: v.optional(v.string()),
});

export const crear = mutation({
  args: {
    tipoPedido: v.union(
      v.literal("delivery"),
      v.literal("pickup"),
      v.literal("dine-in")
    ),
    clienteNombre: v.optional(v.string()),
    clienteTelefono: v.optional(v.string()),
    codigoRetiro: v.optional(v.string()),
    direccionEntrega: v.optional(v.string()),
    direccionReferencia: v.optional(v.string()),
    mesaId: v.optional(v.id("mesas")),
    mesaNumero: v.optional(v.string()),
    costoDomicilio: v.optional(v.number()),
    metodoPago: v.optional(
      v.union(v.literal("efectivo"), v.literal("transferencia"))
    ),
    total: v.number(),
    items: v.array(itemValidator),
    notas: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pedidos", {
      ...args,
      estado: "confirmado",
    });
  },
});

// Estados que el local todavía tiene que atender
const ESTADOS_ACTIVOS = [
  "pendiente",
  "confirmado",
  "en_preparacion",
  "listo",
];

// Query por defecto del admin: SOLO pedidos activos, más nuevos primero.
// Nunca trae toda la historia — consulta cada estado por su índice y mergea.
export const listarActivos = query({
  args: {},
  handler: async (ctx) => {
    const porEstado = await Promise.all(
      ESTADOS_ACTIVOS.map((estado) =>
        ctx.db
          .query("pedidos")
          .withIndex("por_estado", (q) => q.eq("estado", estado))
          .collect()
      )
    );
    return porEstado.flat().sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Historial acotado por estado (entregados/cancelados) sin traer todo.
export const listarPorEstado = query({
  args: { estado: v.string(), limite: v.optional(v.number()) },
  handler: async (ctx, { estado, limite }) => {
    return await ctx.db
      .query("pedidos")
      .withIndex("por_estado", (q) => q.eq("estado", estado))
      .order("desc")
      .take(limite ?? 50);
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
