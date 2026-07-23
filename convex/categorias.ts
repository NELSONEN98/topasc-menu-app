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

export const crear = mutation({
  args: {
    nombre: v.string(),
    orden: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("categorias", {
      ...args,
      activo: true,
    });
  },
});

export const borrar = mutation({
  args: { id: v.id("categorias") },
  handler: async (ctx, { id }) => {
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
