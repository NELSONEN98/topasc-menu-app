import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listar = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("categorias")
      .filter((q) => q.eq(q.field("activo"), true))
      .order("asc", (q) => q.field("orden"))
      .collect();
  },
});

// El admin necesita ver tambien las inactivas para poder reactivarlas.
export const listarTodas = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("categorias")
      .order("asc", (q) => q.field("orden"))
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
