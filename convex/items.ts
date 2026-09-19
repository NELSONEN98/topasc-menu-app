import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requerirAdmin } from "./guardias";

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valida la ventana de vigencia de una promo del dia.
 *
 * Solo chequea forma y orden: si la promo corre HOY o no lo decide el cliente
 * con su hora local, nunca el servidor. Convex corre en UTC y en Colombia
 * (UTC-5) el server ya esta en el dia siguiente desde las 19:00 — filtrar por
 * fecha aca apagaria las promos del dia en plena hora pico. Ver schema.ts.
 */
const validarVigencia = (desde?: string, hasta?: string) => {
  for (const fecha of [desde, hasta]) {
    if (fecha !== undefined && !FORMATO_FECHA.test(fecha)) {
      throw new Error(`La fecha "${fecha}" tiene que venir como YYYY-MM-DD`);
    }
  }

  // Comparacion de strings a proposito: "YYYY-MM-DD" ordena igual alfabetica
  // que cronologicamente, y asi no se parsea ninguna fecha (new Date de un
  // "YYYY-MM-DD" se interpreta como medianoche UTC y corre el dia).
  if (desde && hasta && desde > hasta) {
    throw new Error("La fecha de inicio no puede ser posterior a la de fin");
  }
};

/**
 * "" significa "sin fecha" y se traduce a undefined, que es lo que borra el
 * campo en un patch de Convex.
 *
 * Hace falta porque <input type="date"> vacio da "" y el formulario manda
 * siempre los dos campos: sin esta traduccion no habria forma de SACARLE la
 * fecha a una promo que ya la tenia.
 */
const sinFechaVacia = (fecha?: string) => fecha || undefined;

// Publica: es el menu que ve el cliente al escanear el QR.
//
// Filtra por `disponible` ademas de `activo`. Son dos cosas distintas:
//   activo     = el producto existe en la carta
//   disponible = hoy se puede pedir (es lo que apaga el switch del admin)
//
// Si esta query mirara solo `activo`, apagar el switch pintaria el producto
// de gris en el panel y el cliente lo seguiria viendo y pidiendo.
//
// `sedeId` opcional y no obligatorio: el flujo por QR llega sin sede (las
// mesas todavia no la tienen, ver App.jsx). Sin sede se devuelve el menu
// completo — es preferible mostrar de mas que dejar la pantalla en blanco.
export const listarMenu = query({
  args: { sedeId: v.optional(v.id("sedes")) },
  handler: async (ctx, { sedeId }) => {
    const items = await ctx.db
      .query("items")
      .filter((q) =>
        q.and(q.eq(q.field("activo"), true), q.eq(q.field("disponible"), true))
      )
      .collect();

    if (!sedeId) return items;

    // El filtro por sede va en JS y no en el `.filter()` de arriba porque
    // Convex no sabe preguntar "este array contiene X". No es un problema: el
    // menu son decenas de items, no miles, y ya estan todos en memoria.
    //
    // Sin sedeIds (o vacio) = item anterior a este campo: se muestra en todas
    // las sedes hasta que el admin lo edite. Ver la nota en schema.ts.
    return items.filter(
      (item) => !item.sedeIds?.length || item.sedeIds.includes(sedeId)
    );
  },
});

// Solo admin: trae tambien los no disponibles. El panel los necesita para
// poder volver a activarlos — si usara `listarMenu`, apagar un producto lo
// haria desaparecer de la lista y no habria forma de encenderlo de nuevo.
export const listarTodos = query({
  args: {},
  handler: async (ctx) => {
    await requerirAdmin(ctx);

    return await ctx.db
      .query("items")
      .filter((q) => q.eq(q.field("activo"), true))
      .collect();
  },
});

export const crear = mutation({
  args: {
    categoriaId: v.id("categorias"),
    nombre: v.string(),
    descripcion: v.optional(v.string()),
    ingredientes: v.optional(v.array(v.string())),
    precio: v.number(),
    imagenUrl: v.optional(v.string()),
    llevaSalsas: v.optional(v.boolean()),
    llevaPresentacion: v.optional(v.boolean()),
    disponible: v.optional(v.boolean()),
    sedeIds: v.optional(v.array(v.id("sedes"))),
    esPromo: v.optional(v.boolean()),
    vigenteDesde: v.optional(v.string()),
    vigenteHasta: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requerirAdmin(ctx);

    const vigenteDesde = sinFechaVacia(args.vigenteDesde);
    const vigenteHasta = sinFechaVacia(args.vigenteHasta);
    validarVigencia(vigenteDesde, vigenteHasta);

    return await ctx.db.insert("items", {
      ...args,
      disponible: args.disponible ?? true,
      activo: true,
      vigenteDesde,
      vigenteHasta,
    });
  },
});

export const actualizar = mutation({
  args: {
    id: v.id("items"),
    campos: v.object({
      nombre: v.optional(v.string()),
      categoriaId: v.optional(v.id("categorias")),
      descripcion: v.optional(v.string()),
      ingredientes: v.optional(v.array(v.string())),
      precio: v.optional(v.number()),
      imagenUrl: v.optional(v.string()),
      disponible: v.optional(v.boolean()),
      activo: v.optional(v.boolean()),
      llevaSalsas: v.optional(v.boolean()),
    llevaPresentacion: v.optional(v.boolean()),
      sedeIds: v.optional(v.array(v.id("sedes"))),
      esPromo: v.optional(v.boolean()),
      vigenteDesde: v.optional(v.string()),
      vigenteHasta: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { id, campos }) => {
    await requerirAdmin(ctx);

    const tocaDesde = campos.vigenteDesde !== undefined;
    const tocaHasta = campos.vigenteHasta !== undefined;

    if (tocaDesde || tocaHasta) {
      const actual = await ctx.db.get(id);
      if (!actual) throw new Error("El producto ya no existe");

      // Solo se pisa la fecha que efectivamente llego. Meter las dos siempre
      // borraria la que el admin no toco: `undefined` en un patch no significa
      // "dejala como esta", significa "sacale el campo".
      const vigenteDesde = tocaDesde
        ? sinFechaVacia(campos.vigenteDesde)
        : actual.vigenteDesde;
      const vigenteHasta = tocaHasta
        ? sinFechaVacia(campos.vigenteHasta)
        : actual.vigenteHasta;

      // Se valida el estado FINAL, no solo lo que llego: si la promo ya tenia
      // un `desde` y ahora solo cambia el `hasta`, mirar unicamente `campos`
      // dejaria pasar una ventana al reves (fin antes del inicio).
      validarVigencia(vigenteDesde, vigenteHasta);

      campos = {
        ...campos,
        ...(tocaDesde ? { vigenteDesde } : {}),
        ...(tocaHasta ? { vigenteHasta } : {}),
      };
    }

    await ctx.db.patch(id, campos);
  },
});

export const borrar = mutation({
  args: { id: v.id("items") },
  handler: async (ctx, { id }) => {
    await requerirAdmin(ctx);

    await ctx.db.delete(id);
  },
});
