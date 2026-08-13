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

// wa.me solo acepta digitos: un numero con +, espacios o guiones arma un link
// roto y el pedido no llega a ningun lado. Se normaliza en el servidor y no en
// el formulario porque el front es una sugerencia — la mutation es publica a
// nivel de codigo y tiene que defenderse sola.
const soloDigitos = (valor: string) => valor.replace(/\D/g, "");

export const crear = mutation({
  args: {
    nombre: v.string(),
    direccion: v.optional(v.string()),
    whatsapp: v.string(),
  },
  handler: async (ctx, args) => {
    await requerirAdmin(ctx);

    const nombre = args.nombre.trim();
    const whatsapp = soloDigitos(args.whatsapp);
    const direccion = args.direccion?.trim();

    if (nombre === "") {
      throw new Error("El nombre de la sede no puede estar vacio");
    }
    if (await nombreRepetido(ctx, nombre)) {
      throw new Error(`Ya existe una sede llamada "${nombre}"`);
    }
    if (whatsapp === "") {
      throw new Error(
        "El WhatsApp de la sede no puede estar vacio: es el numero al que " +
          "llegan sus pedidos"
      );
    }

    return await ctx.db.insert("sedes", {
      nombre,
      whatsapp,
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
      activo: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { id, campos }) => {
    await requerirAdmin(ctx);

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
      const whatsapp = soloDigitos(campos.whatsapp);

      if (whatsapp === "") {
        throw new Error(
          "El WhatsApp de la sede no puede estar vacio: es el numero al que " +
            "llegan sus pedidos"
        );
      }
      parche.whatsapp = whatsapp;
    }

    // Vaciar el campo de direccion en el formulario tiene que BORRAR la
    // direccion, no guardar "". En Convex, patchear con undefined elimina el
    // campo, que es justo lo que se busca aca.
    if (campos.direccion !== undefined) {
      parche.direccion = campos.direccion.trim() || undefined;
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
