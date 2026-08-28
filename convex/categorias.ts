import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requerirAdmin } from "./guardias";

// Publica: las categorias activas arman el menu que ve el cliente.
//
// El `withIndex("por_orden")` NO es opcional. Antes esto decia
// `.order("asc", (q) => q.field("orden"))`, y ese segundo argumento no
// existe en la API de Convex: la firma es `order("asc" | "desc")` a secas.
// JavaScript descarta los argumentos de mas sin avisar, asi que la query
// venia ordenada por `_creationTime` y `orden` no hacia nada. Pasaba
// desapercibido porque `sincronizarMenu` inserta en el mismo orden que el
// array, y los dos criterios coincidian de casualidad.
export const listar = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("categorias")
      .withIndex("por_orden")
      .order("asc")
      .filter((q) => q.eq(q.field("activo"), true))
      .collect();
  },
});

// El admin necesita ver tambien las inactivas para poder reactivarlas.
export const listarTodas = query({
  args: {},
  handler: async (ctx) => {
    await requerirAdmin(ctx);

    return await ctx.db
      .query("categorias")
      .withIndex("por_orden")
      .order("asc")
      .collect();
  },
});

const nombreRepetido = async (
  ctx: any,
  nombre: string,
  ignorarId?: string
) => {
  const todas = await ctx.db.query("categorias").collect();
  return todas.some(
    (cat: any) =>
      cat._id !== ignorarId &&
      cat.nombre.trim().toLowerCase() === nombre.trim().toLowerCase()
  );
};

export const crear = mutation({
  args: {
    nombre: v.string(),
    orden: v.number(),
  },
  handler: async (ctx, args) => {
    await requerirAdmin(ctx);

    const nombre = args.nombre.trim();

    if (nombre === "") {
      throw new Error("El nombre de la categoria no puede estar vacio");
    }
    if (await nombreRepetido(ctx, nombre)) {
      throw new Error(`Ya existe una categoria llamada "${nombre}"`);
    }

    return await ctx.db.insert("categorias", {
      nombre,
      orden: args.orden,
      activo: true,
    });
  },
});

export const actualizar = mutation({
  args: {
    id: v.id("categorias"),
    campos: v.object({
      nombre: v.optional(v.string()),
      orden: v.optional(v.number()),
      activo: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { id, campos }) => {
    await requerirAdmin(ctx);

    if (campos.nombre !== undefined) {
      const nombre = campos.nombre.trim();

      if (nombre === "") {
        throw new Error("El nombre de la categoria no puede estar vacio");
      }
      if (await nombreRepetido(ctx, nombre, id)) {
        throw new Error(`Ya existe una categoria llamada "${nombre}"`);
      }
      campos = { ...campos, nombre };
    }

    await ctx.db.patch(id, campos);
  },
});

/**
 * Reescribe el orden de TODAS las categorias de una sola vez.
 *
 * Recibe la lista completa de ids ya acomodada y le asigna a cada una su
 * posicion (1, 2, 3...). Se manda la lista entera y no "movi la X al lugar
 * 3" a proposito: reordenar es una operacion sobre el conjunto, y mandar el
 * conjunto completo deja la tabla consistente en una sola transaccion, sin
 * estados intermedios con dos categorias compartiendo el mismo numero.
 *
 * Por eso mismo exige que la lista este COMPLETA. Si llegara parcial, las
 * que faltan conservarian su `orden` viejo y chocarian con los nuevos, y el
 * menu quedaria con un orden arbitrario decidido por el desempate interno.
 */
export const reordenar = mutation({
  args: { ids: v.array(v.id("categorias")) },
  handler: async (ctx, { ids }) => {
    await requerirAdmin(ctx);

    if (new Set(ids).size !== ids.length) {
      throw new Error("La lista de orden trae categorias repetidas");
    }

    const todas = await ctx.db.query("categorias").collect();

    if (ids.length !== todas.length) {
      throw new Error(
        `El orden debe incluir las ${todas.length} categorias y llegaron ${ids.length}`
      );
    }

    const existentes = new Set(todas.map((cat) => cat._id));
    const desconocida = ids.find((id) => !existentes.has(id));

    if (desconocida) {
      throw new Error(`La categoria ${desconocida} ya no existe`);
    }

    for (const [indice, id] of ids.entries()) {
      await ctx.db.patch(id, { orden: indice + 1 });
    }
  },
});

/**
 * Borra una categoria SOLO si no tiene productos.
 *
 * Los items apuntan a la categoria por `categoriaId`. Borrar una categoria
 * con productos los deja huerfanos: en el admin salen "Sin categoria" y en
 * el front desaparecen del menu sin ningun aviso. La guarda va aca, en el
 * servidor, porque el front es una sugerencia: cualquiera puede llamar la
 * mutation directo. Para sacarla de la vista sin perder nada, usar
 * `actualizar` con `activo: false`.
 */
export const borrar = mutation({
  args: { id: v.id("categorias") },
  handler: async (ctx, { id }) => {
    await requerirAdmin(ctx);

    const productos = await ctx.db
      .query("items")
      .withIndex("por_categoria", (q) => q.eq("categoriaId", id))
      .collect();

    if (productos.length > 0) {
      throw new Error(
        `No se puede eliminar: la categoria tiene ${productos.length} producto(s). ` +
          `Movelos a otra categoria o desactivala en lugar de borrarla.`
      );
    }

    await ctx.db.delete(id);
  },
});

// Categorias reales del menu, en el orden en que se muestran al cliente.
// Esta es la fuente de verdad: admin y front leen ambos de `listar`.
const CATEGORIAS_MENU = [
  "Salchipapas",
  "Hamburguesas",
  "Perros",
  "Lasagnas",
  "Bebidas",
  "Postres",
  "Alitas",
  "Papas y Acompañamientos",
];

const clave = (nombre: string) => nombre.trim().toLowerCase();

/**
 * Deja la tabla `categorias` igual a CATEGORIAS_MENU.
 *
 * Reconcilia por NOMBRE, no borra nada:
 *  - si ya existe -> conserva su _id y solo ajusta orden/activo
 *  - si no existe -> la crea
 *  - si sobra     -> la desactiva (activo: false)
 *
 * Nunca se borra una categoria porque los items la referencian por
 * `categoriaId`: borrarla dejaria productos huerfanos, invisibles en el
 * front y sin categoria en el admin. Desactivar da el mismo resultado
 * visible y es reversible.
 *
 * Es idempotente: correrla dos veces da el mismo resultado.
 */
export const sincronizarMenu = mutation({
  args: {},
  handler: async (ctx) => {
    await requerirAdmin(ctx);

    const existentes = await ctx.db.query("categorias").collect();
    const porNombre = new Map(existentes.map((cat) => [clave(cat.nombre), cat]));

    const creadas: string[] = [];
    const conservadas: string[] = [];

    for (const [indice, nombre] of CATEGORIAS_MENU.entries()) {
      const orden = indice + 1;
      const actual = porNombre.get(clave(nombre));

      if (actual) {
        await ctx.db.patch(actual._id, { nombre, orden, activo: true });
        conservadas.push(nombre);
      } else {
        await ctx.db.insert("categorias", { nombre, orden, activo: true });
        creadas.push(nombre);
      }
    }

    // Lo que no esta en la lista se desactiva, pero se reporta cuantos
    // productos quedan colgando ahi para poder reasignarlos a mano.
    const objetivo = new Set(CATEGORIAS_MENU.map(clave));
    const desactivadas: { nombre: string; productos: number }[] = [];

    for (const cat of existentes) {
      if (objetivo.has(clave(cat.nombre))) continue;

      const productos = await ctx.db
        .query("items")
        .withIndex("por_categoria", (q) => q.eq("categoriaId", cat._id))
        .collect();

      if (cat.activo) {
        await ctx.db.patch(cat._id, { activo: false });
      }
      desactivadas.push({ nombre: cat.nombre, productos: productos.length });
    }

    return { creadas, conservadas, desactivadas };
  },
});
