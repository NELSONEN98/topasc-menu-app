import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requerirAdmin } from "./guardias";

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valida el par de fechas de vigencia.
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

// Publica: el filtro "Promociones del dia" y el carrusel del menu leen esta.
// Solo trae las activas y en el orden en que se crearon.
//
// `sedeId` opcional y no obligatorio, igual que en items:listarMenu: el flujo
// por QR puede llegar sin sede. Sin sede se devuelven todas las promos
// activas — es preferible mostrar de mas que dejar al cliente sin ver ninguna.
export const listar = query({
  args: { sedeId: v.optional(v.id("sedes")) },
  handler: async (ctx, { sedeId }) => {
    const promos = await ctx.db
      .query("promocionesDelDia")
      .withIndex("por_orden")
      .order("asc")
      .filter((q) => q.eq(q.field("activa"), true))
      .collect();

    if (!sedeId) return promos;

    // El filtro por sede va en JS y no en el `.filter()` de arriba porque
    // Convex no sabe preguntar "este array contiene X". Son unas pocas promos
    // y ya estan todas en memoria.
    //
    // Sin sedeIds (o vacio) = promo anterior a este campo, o cargada para
    // todos los locales: se muestra siempre. Ver la nota en schema.ts.
    return promos.filter(
      (promo) => !promo.sedeIds?.length || promo.sedeIds.includes(sedeId)
    );
  },
});

// Solo admin: trae tambien las apagadas, para poder reactivarlas.
export const listarTodas = query({
  args: {},
  handler: async (ctx) => {
    await requerirAdmin(ctx);

    return await ctx.db
      .query("promocionesDelDia")
      .withIndex("por_orden")
      .order("asc")
      .collect();
  },
});

export const crear = mutation({
  args: {
    titulo: v.string(),
    descripcion: v.optional(v.string()),
    precio: v.optional(v.number()),
    imagenUrl: v.optional(v.string()),
    activa: v.optional(v.boolean()),
    sedeIds: v.optional(v.array(v.id("sedes"))),
    vigenteDesde: v.optional(v.string()),
    vigenteHasta: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requerirAdmin(ctx);

    const titulo = args.titulo.trim();
    if (titulo === "") {
      throw new Error("El titulo de la promo no puede estar vacio");
    }

    const vigenteDesde = sinFechaVacia(args.vigenteDesde);
    const vigenteHasta = sinFechaVacia(args.vigenteHasta);
    validarVigencia(vigenteDesde, vigenteHasta);

    // Se agrega al final de la lista, igual que categorias:crear. No hay
    // reordenamiento manual todavia, asi que alcanza con "el ultimo + 1".
    const todas = await ctx.db.query("promocionesDelDia").collect();
    const ordenMaximo = todas.reduce((max, p) => Math.max(max, p.orden), 0);

    return await ctx.db.insert("promocionesDelDia", {
      titulo,
      descripcion: args.descripcion?.trim() || undefined,
      precio: args.precio,
      imagenUrl: args.imagenUrl || undefined,
      activa: args.activa ?? true,
      sedeIds: args.sedeIds,
      vigenteDesde,
      vigenteHasta,
      orden: ordenMaximo + 1,
    });
  },
});

export const actualizar = mutation({
  args: {
    id: v.id("promocionesDelDia"),
    campos: v.object({
      titulo: v.optional(v.string()),
      descripcion: v.optional(v.string()),
      precio: v.optional(v.number()),
      imagenUrl: v.optional(v.string()),
      activa: v.optional(v.boolean()),
      sedeIds: v.optional(v.array(v.id("sedes"))),
      vigenteDesde: v.optional(v.string()),
      vigenteHasta: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { id, campos }) => {
    await requerirAdmin(ctx);

    if (campos.titulo !== undefined) {
      const titulo = campos.titulo.trim();
      if (titulo === "") {
        throw new Error("El titulo de la promo no puede estar vacio");
      }
      campos = { ...campos, titulo };
    }

    const tocaDesde = campos.vigenteDesde !== undefined;
    const tocaHasta = campos.vigenteHasta !== undefined;

    if (tocaDesde || tocaHasta) {
      const actual = await ctx.db.get(id);
      if (!actual) throw new Error("La promo ya no existe");

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
  args: { id: v.id("promocionesDelDia") },
  handler: async (ctx, { id }) => {
    await requerirAdmin(ctx);
    await ctx.db.delete(id);
  },
});
