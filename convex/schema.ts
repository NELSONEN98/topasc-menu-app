import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  categorias: defineTable({
    nombre: v.string(),
    orden: v.number(),
    activo: v.boolean(),
    /**
     * Marca la categoria como "de bebidas". Decide dos cosas:
     *   - el boton "¿Algo para tomar?" del carrito ofrece estos productos
     *   - una bebida nunca pide salsas, ni en el menu ni en el admin
     *
     * Es un campo y NO una lista de nombres en el codigo, y eso se pago
     * aprendiendo: antes se buscaban las palabras "bebida" y "gaseosa" dentro
     * del nombre. Fallo dos veces con datos reales — primero con la categoria
     * "Gaseosa" en singular, y despues en produccion, donde las bebidas viven
     * en "JUGOS NATURALES" y ninguna de las dos palabras aparece. El nombre lo
     * escribe el local y no hay forma de adivinarlo desde el codigo.
     *
     * Optional porque las categorias que ya existen no lo tienen. undefined =
     * no es de bebidas, salvo que el nombre la delate (ver
     * src/utils/categorias.js, que mantiene esa deteccion como respaldo para
     * las que todavia nadie marco).
     */
    esBebida: v.optional(v.boolean()),
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
    /**
     * LEGACY — NO BORRAR sin limpiar los datos primero.
     *
     * Quedo del modulo de gaseosas, que se elimino: cada sabor y tamaño es
     * ahora su propio producto. Nada lo lee ni lo escribe.
     *
     * Sigue declarado porque en PRODUCCION hay 44 items que todavia lo tienen
     * guardado, y Convex rechaza cualquier documento con un campo que el
     * schema no declara ("extra field"). Sacarlo sin limpiar esos 44 rompe el
     * deploy de produccion — paso exactamente eso, y dejo la publicacion
     * frenada un dia.
     *
     * Para retirarlo de verdad: correr una migracion que lo ponga en undefined
     * en todos los items (en prod, no solo en dev) y recien despues borrar
     * esta linea.
     */
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
    /**
     * Promocion del dia. Es un item como cualquier otro —se pide, se agrega
     * al carrito y viaja al pedido igual que un plato— y este flag solo
     * cambia DONDE se muestra: entra en el filtro "Promociones del día" del
     * menu y arma el carrusel que se abre al entrar.
     *
     * Se modela asi, y no como una tabla aparte, porque una promo que se
     * puede pedir ES un producto: cada linea de `pedidos` exige un
     * `itemId: v.id("items")`, asi que una promo fuera de esta tabla no
     * podria entrar en un pedido sin debilitar ese vinculo.
     *
     * undefined/false = producto normal (el default).
     */
    esPromo: v.optional(v.boolean()),
    /**
     * Ventana de vigencia de la promo, en formato "YYYY-MM-DD". Las dos son
     * opcionales:
     *   ninguna    -> la promo corre hasta que la apaguen con `disponible`
     *   solo desde -> arranca ese dia y no termina
     *   solo hasta -> corre hasta ese dia inclusive
     *   las dos    -> ventana cerrada, inclusive en los dos extremos
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
  }).index("por_categoria", ["categoriaId"]),

  /**
   * LEGACY — NO BORRAR sin vaciar la tabla primero.
   *
   * Era el modulo de gaseosas: una fila por combinacion de sabor y tamaño.
   * Se elimino, cada sabor/tamaño es ahora su propio producto en `items`, y no
   * queda ninguna funcion que lea ni escriba aca.
   *
   * Sigue declarada porque en PRODUCCION la tabla tiene filas, y Convex
   * rechaza el deploy de un schema que no declara una tabla con datos. Hay que
   * vaciarla en prod antes de poder sacar esto.
   *
   * En desarrollo ya esta vacia, asi que la declaracion no molesta a nadie.
   */
  presentacionesGaseosa: defineTable({
    sabor: v.string(),
    tamano: v.string(),
    precio: v.number(),
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
        // SOLO HISTORICO: ya no se escribe. El modulo de gaseosas se
        // elimino y cada sabor/tamaño es ahora su propio producto, asi que
        // ningun pedido nuevo trae este campo.
        //
        // No se puede borrar del schema igual: los pedidos ya guardados lo
        // tienen, y sacarlo haria fallar la validacion de esas filas. El
        // panel lo sigue mostrando para que un pedido viejo siga diciendo
        // que se vendio una Coca Cola de 2 L.
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
