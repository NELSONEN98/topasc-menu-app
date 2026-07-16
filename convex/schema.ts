import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  categorias: defineTable({
    nombre: v.string(),
    orden: v.number(),
    activo: v.boolean(),
  }),

  items: defineTable({
    categoriaId: v.id("categorias"),
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    precio: v.number(),
    imagenUrl: v.optional(v.string()),
    disponible: v.boolean(),
    activo: v.boolean(),
  }).index("por_categoria", ["categoriaId"]),

  mesas: defineTable({
    codigo: v.string(),
    activo: v.boolean(),
  }).index("por_codigo", ["codigo"]),

  pedidos: defineTable({
    tipoPedido: v.union(
      v.literal("delivery"),
      v.literal("pickup"),
      v.literal("dine-in")
    ),
    estado: v.union(
      v.literal("pendiente"),
      v.literal("confirmado"),
      v.literal("en_preparacion"),
      v.literal("listo"),
      v.literal("entregado"),
      v.literal("cancelado")
    ),
    mesaId: v.optional(v.id("mesas")),
    mesaNumero: v.optional(v.string()),
    clienteNombre: v.optional(v.string()),
    clienteTelefono: v.optional(v.string()),
    direccionEntrega: v.optional(v.string()),
    direccionReferencia: v.optional(v.string()),
    costoDomicilio: v.optional(v.number()),
    total: v.number(),
    notas: v.optional(v.string()),
    items: v.array(
      v.object({
        itemId: v.id("items"),
        nombreSnapshot: v.string(),
        precioSnapshot: v.number(),
        cantidad: v.number(),
        notas: v.optional(v.string()),
      })
    ),
  })
    .index("por_estado", ["estado"])
    .index("por_tipo", ["tipoPedido"]),

  horariosAtencion: defineTable({
    diaSemana: v.number(),
    horaApertura: v.optional(v.string()),
    horaCierre: v.optional(v.string()),
    cerrado: v.boolean(),
  }).index("por_dia", ["diaSemana"]),

  configuracionRestaurante: defineTable({
    nombreRestaurante: v.string(),
    telefono: v.optional(v.string()),
    direccion: v.optional(v.string()),
    abiertoManualOverride: v.optional(v.boolean()),
  }),
});
