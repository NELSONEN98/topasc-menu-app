import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requerirAdmin } from "./guardias";

const normalizar = (texto: string) => texto.trim();
const clave = (sabor: string, tamano: string) =>
  `${sabor.trim().toLowerCase()}|${tamano.trim().toLowerCase()}`;

/**
 * Una combinacion de sabor y tamaño no se puede repetir.
 *
 * Dos filas "Coca Cola / 2 litros" con precios distintos dejan al cliente
 * viendo dos botones identicos que cobran diferente, y al admin sin forma de
 * saber cual esta editando.
 */
const combinacionRepetida = async (
  ctx: any,
  sabor: string,
  tamano: string,
  ignorarId?: string
) => {
  const todas = await ctx.db.query("presentacionesGaseosa").collect();
  return todas.some(
    (p: any) =>
      p._id !== ignorarId && clave(p.sabor, p.tamano) === clave(sabor, tamano)
  );
};

// Publica: lo que el cliente puede elegir hoy.
export const listarDisponibles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("presentacionesGaseosa")
      .withIndex("por_orden")
      .order("asc")
      .filter((q) =>
        q.and(q.eq(q.field("activo"), true), q.eq(q.field("disponible"), true))
      )
      .collect();
  },
});

// Admin: incluye las agotadas, que son las que necesita poder reactivar.
export const listarTodas = query({
  args: {},
  handler: async (ctx) => {
    await requerirAdmin(ctx);

    return await ctx.db
      .query("presentacionesGaseosa")
      .withIndex("por_orden")
      .order("asc")
      .collect();
  },
});

export const crear = mutation({
  args: {
    sabor: v.string(),
    tamano: v.string(),
    precio: v.number(),
  },
  handler: async (ctx, args) => {
    await requerirAdmin(ctx);

    const sabor = normalizar(args.sabor);
    const tamano = normalizar(args.tamano);

    if (sabor === "") throw new Error("El sabor no puede estar vacio");
    if (tamano === "") throw new Error("El tamaño no puede estar vacio");
    if (args.precio < 0) throw new Error("El precio no puede ser negativo");

    if (await combinacionRepetida(ctx, sabor, tamano)) {
      throw new Error(`Ya existe "${sabor} ${tamano}"`);
    }

    const todas = await ctx.db.query("presentacionesGaseosa").collect();
    const orden =
      todas.length > 0 ? Math.max(...todas.map((p) => p.orden ?? 0)) + 1 : 1;

    return await ctx.db.insert("presentacionesGaseosa", {
      sabor,
      tamano,
      precio: args.precio,
      disponible: true,
      activo: true,
      orden,
    });
  },
});

export const actualizar = mutation({
  args: {
    id: v.id("presentacionesGaseosa"),
    campos: v.object({
      sabor: v.optional(v.string()),
      tamano: v.optional(v.string()),
      precio: v.optional(v.number()),
      disponible: v.optional(v.boolean()),
      activo: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { id, campos }) => {
    await requerirAdmin(ctx);

    const actual = await ctx.db.get(id);
    if (!actual) throw new Error("La presentacion ya no existe");

    const sabor =
      campos.sabor !== undefined ? normalizar(campos.sabor) : actual.sabor;
    const tamano =
      campos.tamano !== undefined ? normalizar(campos.tamano) : actual.tamano;

    if (sabor === "") throw new Error("El sabor no puede estar vacio");
    if (tamano === "") throw new Error("El tamaño no puede estar vacio");
    if (campos.precio !== undefined && campos.precio < 0) {
      throw new Error("El precio no puede ser negativo");
    }

    // Se valida contra la combinacion RESULTANTE, no contra lo que llego:
    // cambiar solo el tamaño tambien puede chocar con una fila existente.
    if (
      (campos.sabor !== undefined || campos.tamano !== undefined) &&
      (await combinacionRepetida(ctx, sabor, tamano, id))
    ) {
      throw new Error(`Ya existe "${sabor} ${tamano}"`);
    }

    await ctx.db.patch(id, { ...campos, sabor, tamano });
  },
});

/**
 * Borra la presentacion.
 *
 * No hay guarda contra pedidos historicos: el pedido guarda sabor y tamaño
 * como texto congelado, no el id de esta fila. Borrar aca no le saca
 * informacion a ningun pedido ya hecho.
 */
export const borrar = mutation({
  args: { id: v.id("presentacionesGaseosa") },
  handler: async (ctx, { id }) => {
    await requerirAdmin(ctx);
    await ctx.db.delete(id);
  },
});
