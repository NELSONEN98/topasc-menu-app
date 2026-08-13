import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requerirAdmin } from "./guardias";

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

// PUBLICA A PROPOSITO: la hace el cliente desde la mesa, sin cuenta ni login.
// Es la unica escritura abierta del sistema. Si alguna vez hay que limitarla,
// va con rate limiting o validando la mesa — nunca exigiendo sesion, porque
// eso romperia el producto entero.
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
    // sedeNombre viaja desde el cliente y no se resuelve aca leyendo la sede
    // por id: es un snapshot, tiene que quedar congelado el nombre con el que
    // se hizo el pedido. Ver la nota en schema.ts.
    sedeId: v.optional(v.id("sedes")),
    sedeNombre: v.optional(v.string()),
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
      estado: "recibido",
    });
  },
});

// Query por defecto del admin: los pedidos que el local todavía tiene que
// atender. Con un solo estado activo alcanza con leer el índice.
export const listarActivos = query({
  args: {},
  handler: async (ctx) => {
    // Los pedidos traen nombre, telefono y direccion de los clientes: esto no
    // se expone sin sesion.
    await requerirAdmin(ctx);

    return await ctx.db
      .query("pedidos")
      .withIndex("por_estado", (q) => q.eq("estado", "recibido"))
      .order("desc")
      .collect();
  },
});

// Historial acotado por estado (completados/cancelados) sin traer todo.
export const listarPorEstado = query({
  args: {
    estado: v.union(
      v.literal("recibido"),
      v.literal("completado"),
      v.literal("cancelado")
    ),
    limite: v.optional(v.number()),
  },
  handler: async (ctx, { estado, limite }) => {
    await requerirAdmin(ctx);

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
      v.literal("recibido"),
      v.literal("completado"),
      v.literal("cancelado")
    ),
  },
  handler: async (ctx, { id, estado }) => {
    await requerirAdmin(ctx);

    await ctx.db.patch(id, { estado });
  },
});
