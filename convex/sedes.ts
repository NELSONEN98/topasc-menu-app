import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requerirAdmin } from "./guardias";

// Publica: el cliente elige su sede antes de armar el pedido.
export const listar = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("sedes")
      .filter((q) => q.eq(q.field("activo"), true))
      .collect();
  },
});

// Solo admin: trae tambien las inactivas, que es desde donde se reactivan.
// Si el panel usara `listar`, apagar una sede la haria desaparecer de la
// pantalla y no habria forma de volver a encenderla.
export const listarTodas = query({
  args: {},
  handler: async (ctx) => {
    await requerirAdmin(ctx);

    return await ctx.db.query("sedes").collect();
  },
});

// El nombre es la identidad visible de la sede: aparece en la pantalla de
// eleccion del cliente y viaja como snapshot en cada pedido. Dos sedes con el
// mismo nombre son indistinguibles en los dos lugares. Mismo criterio (y misma
// implementacion) que en categorias.ts.
const nombreRepetido = async (ctx: any, nombre: string, ignorarId?: string) => {
  const todas = await ctx.db.query("sedes").collect();
  return todas.some(
    (sede: any) =>
      sede._id !== ignorarId &&
      sede.nombre.trim().toLowerCase() === nombre.trim().toLowerCase()
  );
};

/*
 * wa.me solo acepta digitos y exige el numero internacional COMPLETO. Un numero
 * con +, espacios o guiones arma un link roto; uno sin codigo de pais arma un
 * link que no rutea a nadie. Las dos cosas fallan en silencio: la sede se
 * guarda bien, el panel la muestra bien, y los pedidos no llegan nunca.
 *
 * Se normaliza en el SERVIDOR y no solo en el formulario porque el front es una
 * sugerencia: la mutation es alcanzable sin pasar por el panel.
 *
 * El negocio es 100% colombiano (decision explicita), asi que a un numero local
 * se le antepone el 57 en vez de rechazarlo.
 *
 * Esta logica esta duplicada en src/utils/whatsapp.js. No es un descuido:
 * Convex bundlea solo la carpeta convex/, asi que no hay forma de compartir el
 * modulo. La copia del front es para avisarle al admin ANTES de mandar —
 * ademas en produccion Convex oculta los mensajes de error del servidor (ver
 * guardias.ts), asi que el mensaje util tiene que salir de alla. Esta, la del
 * servidor, es la que manda sobre los datos.
 */
const CODIGO_PAIS = "57";
const LARGO_LOCAL = 10;
const LARGO_COMPLETO = 12;

const normalizarWhatsapp = (valor: string) => {
  // Ceros iniciales: "00" es el prefijo internacional de marcado y un "0"
  // suelto el de larga distancia nacional. Ninguno va en un link de wa.me.
  const digitos = valor.replace(/\D/g, "").replace(/^0+/, "");

  if (digitos === "") {
    throw new Error(
      "El WhatsApp de la sede no puede estar vacio: es el numero al que " +
        "llegan sus pedidos"
    );
  }

  if (digitos.length === LARGO_COMPLETO && digitos.startsWith(CODIGO_PAIS)) {
    return digitos;
  }

  if (digitos.length === LARGO_LOCAL) {
    return CODIGO_PAIS + digitos;
  }

  throw new Error(
    `"${valor}" no parece un numero colombiano: van 10 digitos o 12 con el ` +
      `codigo de pais`
  );
};

// Un domicilio negativo le sumaria plata al carrito en vez de restarsela.
// Se valida aca y no solo en el formulario porque la mutation es alcanzable
// sin pasar por el panel.
const validarCostoDomicilio = (costo: number | null | undefined) => {
  if (costo === undefined || costo === null) return;

  if (!Number.isFinite(costo) || costo < 0) {
    throw new Error("El costo de domicilio no puede ser negativo");
  }
};

export const crear = mutation({
  args: {
    nombre: v.string(),
    direccion: v.optional(v.string()),
    whatsapp: v.string(),
    costoDomicilio: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requerirAdmin(ctx);

    const nombre = args.nombre.trim();
    const direccion = args.direccion?.trim();

    if (nombre === "") {
      throw new Error("El nombre de la sede no puede estar vacio");
    }
    if (await nombreRepetido(ctx, nombre)) {
      throw new Error(`Ya existe una sede llamada "${nombre}"`);
    }

    validarCostoDomicilio(args.costoDomicilio);

    // Va ultimo porque lanza solo: el chequeo de vacio que estaba aca abajo
    // quedaria muerto, `normalizarWhatsapp` corta antes.
    const whatsapp = normalizarWhatsapp(args.whatsapp);

    return await ctx.db.insert("sedes", {
      nombre,
      whatsapp,
      costoDomicilio: args.costoDomicilio,
      // Si viene vacia se guarda ausente y no como "": el schema la declara
      // optional, y un string vacio haria que el front dibuje una linea de
      // direccion en blanco debajo del nombre.
      direccion: direccion || undefined,
      activo: true,
    });
  },
});

export const actualizar = mutation({
  args: {
    id: v.id("sedes"),
    campos: v.object({
      nombre: v.optional(v.string()),
      direccion: v.optional(v.string()),
      whatsapp: v.optional(v.string()),
      /*
       * `null` es el "borralo" explicito, y hace falta que sea un valor real y
       * no `undefined`: al serializar los argumentos, Convex OMITE los campos
       * de objeto que valen undefined. O sea que mandar `costoDomicilio:
       * undefined` para vaciarlo no llega como "vacialo", llega como "no lo
       * menciones" — y el patch deja el valor viejo intacto. La sede seguiria
       * cobrando un domicilio que el admin cree haber borrado.
       *
       * `null` si viaja, y el handler lo traduce al `undefined` que borra.
       */
      costoDomicilio: v.optional(v.union(v.number(), v.null())),
      activo: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { id, campos }) => {
    await requerirAdmin(ctx);

    validarCostoDomicilio(campos.costoDomicilio);

    const parche: Record<string, unknown> = { ...campos };

    if (campos.nombre !== undefined) {
      const nombre = campos.nombre.trim();

      if (nombre === "") {
        throw new Error("El nombre de la sede no puede estar vacio");
      }
      if (await nombreRepetido(ctx, nombre, id)) {
        throw new Error(`Ya existe una sede llamada "${nombre}"`);
      }
      parche.nombre = nombre;
    }

    if (campos.whatsapp !== undefined) {
      parche.whatsapp = normalizarWhatsapp(campos.whatsapp);
    }

    // Vaciar el campo de direccion en el formulario tiene que BORRAR la
    // direccion, no guardar "". En Convex, patchear con undefined elimina el
    // campo, que es justo lo que se busca aca.
    //
    // Aca alcanza con el string vacio como senal porque "" SI sobrevive la
    // serializacion; el costo de domicilio, al ser numero, necesita `null`.
    if (campos.direccion !== undefined) {
      parche.direccion = campos.direccion.trim() || undefined;
    }

    // null (borralo) -> undefined, que es lo que hace que patch elimine el
    // campo y la sede vuelva al valor de respaldo de la app.
    if (campos.costoDomicilio === null) {
      parche.costoDomicilio = undefined;
    }

    await ctx.db.patch(id, parche);
  },
});

/**
 * Borra una sede SOLO si ningun producto la tiene marcada.
 *
 * Los items apuntan a las sedes por `sedeIds`. Si se borra una sede, ese id
 * queda colgado dentro del array: un producto que se vendia UNICAMENTE ahi
 * pasa a tener un array que no matchea con ninguna sede real y desaparece de
 * todos los menus sin aviso. Mismo problema que las categorias huerfanas.
 *
 * Los PEDIDOS no bloquean el borrado, y es a proposito: guardan `sedeNombre`
 * como snapshot ademas del id, asi que el historial sigue diciendo a que local
 * fue cada uno aunque la sede ya no exista. Para eso se guardo el par.
 *
 * La guarda vive en el servidor porque el front es una sugerencia: cualquiera
 * puede llamar la mutation directo. Para sacar una sede de la vista sin perder
 * nada, `actualizar` con `activo: false`.
 */
export const borrar = mutation({
  args: { id: v.id("sedes") },
  handler: async (ctx, { id }) => {
    await requerirAdmin(ctx);

    // Sin withIndex: Convex no puede indexar "este array contiene X". Se
    // filtra en memoria, que con decenas de items no es problema.
    const items = await ctx.db.query("items").collect();
    const conEstaSede = items.filter((item) => item.sedeIds?.includes(id));

    if (conEstaSede.length > 0) {
      throw new Error(
        `No se puede eliminar: ${conEstaSede.length} producto(s) tienen esta ` +
          `sede marcada. Sacasela a esos productos o desactiva la sede en ` +
          `lugar de borrarla.`
      );
    }

    await ctx.db.delete(id);
  },
});

// Numero de pruebas con el que arrancaron las sedes. Se mantiene solo como
// valor por defecto de la semilla de abajo: cada sede ya puede tener el suyo
// propio, editable desde el panel.
const WHATSAPP_PRUEBA = "573206873870";

type SedeSemilla = {
  nombre: string;
  whatsapp: string;
  direccion?: string;
};

const SEDES: SedeSemilla[] = [
  {
    nombre: "Sede Dalia",
    whatsapp: WHATSAPP_PRUEBA,
    direccion: "Carrera 8 # 18-203",
  },
  {
    nombre: "Sede Manzanares",
    whatsapp: WHATSAPP_PRUEBA,
    direccion: "Carrera 30 oeste # 11-112 sector 13",
  },
  {
    nombre: "Sede Morichal",
    whatsapp: WHATSAPP_PRUEBA,
  },
];

/**
 * SEMILLA, ya no fuente de verdad. Solo CREA las sedes que falten.
 *
 * Antes esta funcion pisaba `whatsapp`, `direccion` y `activo` en cada corrida,
 * porque el array de arriba era el unico lugar donde se editaban las sedes.
 * Desde que existe la pestana Sedes del panel eso paso a ser un bug: correrla
 * revertiria cualquier cambio hecho desde el admin y reactivaria una sede que
 * alguien apago a proposito. Dos fuentes de verdad para el mismo dato siempre
 * terminan peleandose, y en esa pelea gana la que corrio ultima.
 *
 * Ahora, si la sede ya existe, no se toca. La unica razon por la que esto
 * sigue vivo es levantar un deployment nuevo y vacio sin tener que cargar las
 * tres sedes a mano antes de poder entrar al panel.
 *
 * Sigue siendo `internalMutation`: no es alcanzable por ningun cliente. Se
 * corre asi:
 *
 *   npx convex run sedes:sincronizar
 *   npx convex run sedes:sincronizar --prod
 */
export const sincronizar = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existentes = await ctx.db.query("sedes").collect();
    const porNombre = new Set(
      existentes.map((s) => s.nombre.trim().toLowerCase())
    );

    const creadas: string[] = [];
    const omitidas: string[] = [];

    for (const sede of SEDES) {
      if (porNombre.has(sede.nombre.trim().toLowerCase())) {
        omitidas.push(sede.nombre);
        continue;
      }

      await ctx.db.insert("sedes", { ...sede, activo: true });
      creadas.push(sede.nombre);
    }

    return { creadas, omitidas };
  },
});
