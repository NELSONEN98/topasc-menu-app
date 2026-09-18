import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  categorias: defineTable({
    nombre: v.string(),
    orden: v.number(),
    activo: v.boolean(),
    // El indice es lo que hace que `orden` ordene de verdad.
    //
    // Convex ordena SIEMPRE por el indice que se este recorriendo, y sin
    // `withIndex` recorre el de `_creationTime`. No existe forma de pasarle
    // un campo a `.order()`: su firma es `order("asc" | "desc")` y nada mas.
    // Sin este indice, `orden` se guarda pero no mueve una fila.
  }).index("por_orden", ["orden"]),

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
    // El cliente elige sabor y tamaño de `presentacionesGaseosa` antes de
    // poder agregarlo al carrito.
    //
    // OJO: el default es al REVES que el de `llevaSalsas`. Ahi undefined
    // significa "si lleva" porque casi todo el menu lleva salsa; aca
    // undefined significa "NO lleva", porque las gaseosas son un puñado de
    // items contra toda la carta. Un default "si" haria que cada plato
    // existente pidiera elegir un sabor de gaseosa para poder venderse.
    llevaPresentacion: v.optional(v.boolean()),
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

  /**
   * Presentaciones de gaseosa: una fila por combinacion de sabor y tamaño.
   *
   * Es una tabla PLANA y no dos (sabores por un lado, tamaños por otro)
   * porque cada combinacion tiene su propio precio. Una Coca Cola de 2 L y
   * una Postobon de 2 L no valen lo mismo, asi que el precio no se puede
   * derivar del tamaño solo: vive en el cruce.
   *
   * El cliente igual elige en dos pasos (primero sabor, despues tamaño): la
   * pantalla agrupa estas filas, pero el precio sale siempre de la fila
   * exacta que quedo elegida.
   */
  presentacionesGaseosa: defineTable({
    sabor: v.string(),
    tamano: v.string(),
    // Precio FINAL de la linea, no un adicional sobre el precio del item.
    // El `precio` del item pasa a ser el "desde $X" que se muestra en la
    // grilla del menu.
    precio: v.number(),
    // Igual que en items: `activo` es "existe en la carta", `disponible` es
    // "hoy se puede pedir". Se agoto la Coca de 2 L el sabado -> disponible
    // false, sin perder la fila ni su precio.
    disponible: v.boolean(),
    activo: v.boolean(),
    orden: v.number(),
  }).index("por_orden", ["orden"]),

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
    // Lo que cobra ESTA sede por llevar el pedido. Va por sede y no en una
    // constante global porque el reparto desde cada local cubre distancias
    // distintas: un unico valor obliga a cobrarle de mas a unos o de menos a
    // otros, todos los dias.
    //
    // Optional por las sedes que ya estan en produccion. Ausente = se usa el
    // valor de respaldo de src/config/settings.js.
    //
    // Ojo: 0 es un valor VALIDO y significa envio gratis. Todo lo que lo lea
    // tiene que usar `??` y nunca `||`, o un envio gratis se leeria como "no
    // configurado" y terminaria cobrando el de respaldo.
    costoDomicilio: v.optional(v.number()),
    activo: v.boolean(),
  }),

  mesas: defineTable({
    // codigo = token del QR (no legible, va en la URL /mesa/:codigo)
    codigo: v.string(),
    // numero = etiqueta legible para el local ("5", "Mesa VIP")
    numero: v.string(),
    // En que local esta parada esta mesa. Sin esto, un pedido por QR no sabe
    // a que sede pertenece y arrastra tres problemas de una: el WhatsApp cae
    // al numero de respaldo de settings.js (o sea, al local equivocado), el
    // menu no se filtra (el cliente pide algo que ahi no se vende) y el
    // pedido queda fuera del reporte de ventas por sede.
    //
    // Optional porque las mesas que ya estan en produccion no lo tienen; un
    // campo obligatorio haria fallar el deploy del schema.
    sedeId: v.optional(v.id("sedes")),
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
        // Sabor y tamaño elegidos, congelados igual que el nombre y el
        // precio. NO se guarda el id de la presentacion: si mañana la
        // borran o le cambian el nombre, el pedido historico tiene que
        // seguir diciendo que se vendio una Coca Cola de 2 L.
        //
        // El precio de la presentacion NO se repite aca: ya es el
        // `precioSnapshot` de esta misma linea.
        presentacion: v.optional(
          v.object({ sabor: v.string(), tamano: v.string() })
        ),
        notas: v.optional(v.string()),
      })
    ),
  })
    .index("por_estado", ["estado"])
    .index("por_tipo", ["tipoPedido"]),

  horariosAtencion: defineTable({
    diaSemana: v.number(),
    // De que sede es este horario. AUSENTE = horario GENERAL: el que hereda
    // toda sede que no tenga el suyo propio para ese dia.
    //
    // Se modela como herencia y no como "cada sede carga sus 7 dias" por dos
    // razones. Una, los horarios que ya estan cargados en produccion no tienen
    // sede: si `listar` los ignorara, cada local caeria al horario de fabrica y
    // le estariamos cambiando el horario al negocio sin avisar. Y dos, lo
    // normal es que los tres locales abran igual y uno solo tenga una
    // excepcion: obligar a cargar 21 filas para expresar una diferencia es
    // pedirle al admin que repita 20 veces lo mismo.
    //
    // La fila es unica por el par (sedeId, diaSemana), no por diaSemana solo.
    sedeId: v.optional(v.id("sedes")),
    horaApertura: v.optional(v.string()),
    horaCierre: v.optional(v.string()),
    cerrado: v.boolean(),
  }).index("por_dia", ["diaSemana"]),

  /**
   * Lista de promociones del dia (ya no es un singleton: puede haber varias
   * vigentes al mismo tiempo). Arman el filtro "Promociones del dia" del
   * menu y el carrusel que se abre apenas el cliente entra.
   */
  promocionesDelDia: defineTable({
    titulo: v.string(),
    descripcion: v.optional(v.string()),
    // Optional: hay promos (2x1, "10% en combos") que no se resumen en un
    // unico precio final.
    precio: v.optional(v.number()),
    // Igual que en items: base64 dentro del documento, no storage. Son a lo
    // sumo unas pocas decenas de promos, del mismo orden que los productos,
    // asi que no justifica el vaiven de storage (URL de subida, borrar el
    // blob viejo, etc) que sí tiene sentido para la imagen unica del Hero.
    imagenUrl: v.optional(v.string()),
    // Interruptor por promo. La fila sigue existiendo (con su texto e
    // imagen) mientras el admin la apaga entre un dia y el siguiente, sin
    // perder los datos para reactivarla despues.
    activa: v.boolean(),
    // En que sedes corre esta promo. Misma semantica que `items.sedeIds`, a
    // proposito: undefined o [] = corre en TODAS las sedes. Asi las promos
    // que se cargaron antes de que existiera el campo siguen mostrandose, y
    // el flujo por QR (que puede llegar sin sede, ver App.jsx) nunca queda
    // sin promos por un filtro que no puede resolver.
    //
    // Va como array y no como un `sedeId` unico porque lo normal es que una
    // promo del dia corra en varios locales a la vez; la excepcion es la que
    // corre en uno solo.
    sedeIds: v.optional(v.array(v.id("sedes"))),
    /**
     * Ventana de vigencia, en formato "YYYY-MM-DD". Las dos son opcionales:
     *   ninguna         -> solo manda el switch `activa` (es lo que habia antes)
     *   solo desde      -> arranca ese dia y no termina
     *   solo hasta      -> corre hasta ese dia inclusive
     *   las dos         -> ventana cerrada, inclusive en los dos extremos
     *
     * Se guardan como STRING y no como timestamp, por dos razones:
     *
     * 1. Es el formato que escupe <input type="date">, igual que
     *    `horaApertura` guarda "11:00" por <input type="time">. Y un
     *    "YYYY-MM-DD" ordena y compara bien como string, sin parsear nada:
     *    `new Date("2026-09-18")` se interpreta como medianoche UTC, que es
     *    una fuente clasica de errores de un dia de corrimiento.
     *
     * 2. Un timestamp obligaria a comparar contra `Date.now()` del servidor,
     *    y Convex corre en UTC. En Colombia (UTC-5) el servidor ya esta en el
     *    dia siguiente desde las 19:00 — o sea que una promo "de hoy" se
     *    apagaria sola en plena hora pico. Por eso el dia de HOY lo resuelve
     *    el navegador con su hora local y el filtro por fecha vive en el
     *    cliente (src/utils/vigencia.js), no en la query. Mismo criterio que
     *    ya usa StatusBar.jsx para saber que dia de la semana es.
     */
    vigenteDesde: v.optional(v.string()),
    vigenteHasta: v.optional(v.string()),
    orden: v.number(),
  }).index("por_orden", ["orden"]),

  // Singleton: una sola fila para todo el restaurante.
  configuracionRestaurante: defineTable({
    nombreRestaurante: v.string(),
    telefono: v.optional(v.string()),
    direccion: v.optional(v.string()),
    abiertoManualOverride: v.optional(v.boolean()),
    // Imagen de portada del Hero, la que ve el cliente en todo el flujo.
    //
    // Se guarda el id del archivo en storage, NO la imagen. Los productos
    // usan base64 dentro del documento, pero ese patron no sirve aca: el
    // techo de Convex es 1 MiB por documento, base64 infla ~33%, y sobre
    // todo la imagen viajaria dentro de la suscripcion reactiva de cada
    // cliente en vez de cachearse en el navegador. Un hero a lo ancho de
    // la pantalla lo cargan todos, siempre.
    imagenHeaderId: v.optional(v.id("_storage")),
  }),
});
