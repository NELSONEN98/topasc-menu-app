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
    // Lista real, no un string con comas: permite filtrar y renderizar por unidad
    ingredientes: v.optional(v.array(v.string())),
    precio: v.number(),
    imagenUrl: v.optional(v.string()),
    disponible: v.boolean(),
    activo: v.boolean(),
    // undefined = lleva salsas (default); false = bebidas, postres, etc.
    llevaSalsas: v.optional(v.boolean()),
    // En que sedes se vende este plato. Un plato = una fila, marcada en varias
    // sedes: asi el precio y la imagen (que va en base64 dentro del documento)
    // no se duplican por local.
    //
    // Optional a proposito, por lo mismo que `direccion` mas abajo: los items
    // que ya existen en produccion no tienen el campo y un v.array() a secas
    // haria fallar el deploy del schema.
    //
    // undefined o [] = se ve en TODAS las sedes. Es el default seguro: los
    // items viejos siguen apareciendo hasta que alguien los edite, y el flujo
    // por QR (que todavia no sabe en que sede esta, ver App.jsx) nunca se
    // queda con un menu vacio. El admin no puede guardar un plato sin sedes,
    // asi que un array vacio solo puede venir de datos previos a este campo.
    sedeIds: v.optional(v.array(v.id("sedes"))),
  }).index("por_categoria", ["categoriaId"]),

  salsas: defineTable({
    nombre: v.string(),
    // "base" = incluida gratis (elección obligatoria); "especial" = paga, opcional
    tipo: v.union(v.literal("base"), v.literal("especial")),
    precio: v.number(),
    imagenUrl: v.optional(v.string()),
    disponible: v.boolean(),
    activo: v.boolean(),
  }),

  sedes: defineTable({
    nombre: v.string(),
    // Numero de WhatsApp al que llegan los pedidos de esta sede (sin +, sin
    // espacios). Por ahora las dos sedes usan el mismo numero de pruebas;
    // cuando cada local tenga el suyo, se edita aca sin tocar codigo.
    whatsapp: v.string(),
    // Opcional y no v.string(): la tabla ya tenia filas en produccion antes
    // de que existiera este campo. Si fuera obligatorio, el deploy del
    // schema fallaria porque esos documentos no lo cumplen.
    direccion: v.optional(v.string()),
    activo: v.boolean(),
  }),

  mesas: defineTable({
    // codigo = token del QR (no legible, va en la URL /mesa/:codigo)
    codigo: v.string(),
    // numero = etiqueta legible para el local ("5", "Mesa VIP")
    numero: v.string(),
    activo: v.boolean(),
  }).index("por_codigo", ["codigo"]),

  pedidos: defineTable({
    tipoPedido: v.union(
      v.literal("delivery"),
      v.literal("pickup"),
      v.literal("dine-in")
    ),
    estado: v.union(
      // Flujo real: recibido -> completado. `cancelado` es la salida.
      v.literal("recibido"),
      v.literal("completado"),
      v.literal("cancelado"),
      // TRANSICIONAL: los estados viejos siguen aca solo para que los pedidos
      // ya guardados sigan validando. Se borran despues de correr
      // `npx convex run migraciones:migrarEstados`.
      v.literal("pendiente"),
      v.literal("confirmado"),
      v.literal("en_preparacion"),
      v.literal("listo"),
      v.literal("entregado")
    ),
    // Mismo par que mesaId/mesaNumero de abajo: el id sirve para cruzar datos,
    // el nombre es un snapshot. Si manana renombran o dan de baja una sede, el
    // pedido historico tiene que seguir diciendo a que local fue — un join
    // contra `sedes` devolveria el nombre de hoy, o nada.
    //
    // Optional por dos motivos: los pedidos que ya estan en produccion no lo
    // tienen (un campo obligatorio haria fallar el deploy del schema), y el
    // pedido por QR todavia llega sin sede porque las mesas no la guardan.
    sedeId: v.optional(v.id("sedes")),
    sedeNombre: v.optional(v.string()),
    mesaId: v.optional(v.id("mesas")),
    mesaNumero: v.optional(v.string()),
    clienteNombre: v.optional(v.string()),
    clienteTelefono: v.optional(v.string()),
    codigoRetiro: v.optional(v.string()),
    direccionEntrega: v.optional(v.string()),
    direccionReferencia: v.optional(v.string()),
    costoDomicilio: v.optional(v.number()),
    // Método de pago: obligatorio en domicilio y recoger; en mesa se paga en el local
    metodoPago: v.optional(
      v.union(v.literal("efectivo"), v.literal("transferencia"))
    ),
    total: v.number(),
    notas: v.optional(v.string()),
    items: v.array(
      v.object({
        itemId: v.id("items"),
        nombreSnapshot: v.string(),
        precioSnapshot: v.number(),
        cantidad: v.number(),
        salsasBase: v.optional(v.array(v.string())),
        salsasExtra: v.optional(
          v.array(v.object({ nombre: v.string(), precio: v.number() }))
        ),
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
