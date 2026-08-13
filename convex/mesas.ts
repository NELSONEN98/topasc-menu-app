import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requerirAdmin } from "./guardias";

// Token del QR: corto, sin caracteres ambiguos, difícil de adivinar de memoria.
const generarToken = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < 6; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
};

/**
 * Identifica la mesa a partir del código del QR. Devuelve null si no existe
 * o está inactiva — la app decide el fallback, nunca confía en la URL a ciegas.
 *
 * Devuelve tambien la SEDE resuelta, y no solo el `sedeId`. Asi el front hace
 * una sola query en vez de encadenar dos (buscar la mesa, y recien con su id
 * ir a buscar la sede), que ademas obligaria a manejar dos estados de carga.
 *
 * Que la sede este inactiva NO anula la mesa: apagar una sede la saca del
 * selector del cliente —que es una decision sobre domicilio y recoger—, pero
 * quien ya esta sentado en esa mesa tiene que poder pedir igual, y su pedido
 * tiene que llegar al WhatsApp de ESE local. Para cortar los pedidos por QR de
 * un local esta el `activo` de la mesa.
 *
 * Publica sin sesion, igual que antes: exponer la sede no agrega nada que
 * `sedes:listar` no exponga ya.
 */
export const porCodigo = query({
  args: { codigo: v.string() },
  handler: async (ctx, { codigo }) => {
    const mesa = await ctx.db
      .query("mesas")
      .withIndex("por_codigo", (q) => q.eq("codigo", codigo))
      .unique();
    if (!mesa || !mesa.activo) return null;

    // Las mesas anteriores a este campo no tienen sede: se devuelve null y la
    // app cae al comportamiento de siempre (menu completo y numero de
    // respaldo) en vez de romperse.
    const sede = mesa.sedeId ? await ctx.db.get(mesa.sedeId) : null;

    return { ...mesa, sede };
  },
});

// Solo admin: el listado completo permite enumerar todos los codigos de mesa.
// El cliente nunca lo necesita — el suyo ya lo trae en la URL del QR.
export const listar = query({
  args: {},
  handler: async (ctx) => {
    await requerirAdmin(ctx);

    return await ctx.db.query("mesas").collect();
  },
});

/**
 * ¿Ya hay otra mesa con ese numero EN ESA SEDE?
 *
 * El numero es unico por sede, no globalmente: cada local numera sus mesas
 * 1..N, asi que "Mesa 1" en Dalia y "Mesa 1" en Morichal son dos mesas
 * distintas y legitimas. Lo que no puede haber son dos "Mesa 1" en el mismo
 * local: el mozo no sabria a cual llevarle el pedido, y en el historial los dos
 * pedidos dirian "Mesa 1" de la misma sede sin forma de distinguirlos.
 *
 * Se compara sin espacios ni mayusculas porque el numero es un string libre
 * ("5", " 5", "Terraza", "terraza"): sin normalizar, dos etiquetas que la gente
 * lee igual entrarian como distintas.
 *
 * Las mesas sin sede cuentan como su propio grupo. Son las anteriores al campo,
 * y dos sin asignar con el mismo numero tambien serian indistinguibles.
 *
 * Sin withIndex: no hay indice por (sedeId, numero) y no vale la pena crearlo
 * para una tabla de decenas de filas.
 */
const mesaRepetida = async (
  ctx: any,
  numero: string,
  sedeId: string | undefined,
  ignorarId?: string
) => {
  const todas = await ctx.db.query("mesas").collect();
  const buscado = numero.trim().toLowerCase();

  return todas.some(
    (mesa: any) =>
      mesa._id !== ignorarId &&
      mesa.sedeId === sedeId &&
      mesa.numero.trim().toLowerCase() === buscado
  );
};

export const crear = mutation({
  args: {
    numero: v.string(),
    codigo: v.optional(v.string()),
    sedeId: v.optional(v.id("sedes")),
  },
  handler: async (ctx, { numero, codigo, sedeId }) => {
    await requerirAdmin(ctx);

    if (numero.trim() === "") {
      throw new Error("El numero de la mesa no puede estar vacio");
    }
    if (await mesaRepetida(ctx, numero, sedeId)) {
      throw new Error(`Ya existe una mesa ${numero.trim()} en esa sede`);
    }

    // Genera un token único si no se pasó uno
    let token = codigo ?? generarToken();
    let existente = await ctx.db
      .query("mesas")
      .withIndex("por_codigo", (q) => q.eq("codigo", token))
      .unique();
    while (existente) {
      token = generarToken();
      existente = await ctx.db
        .query("mesas")
        .withIndex("por_codigo", (q) => q.eq("codigo", token))
        .unique();
    }

    return await ctx.db.insert("mesas", {
      numero: numero.trim(),
      codigo: token,
      sedeId,
      activo: true,
    });
  },
});

/**
 * `codigo` NO se puede editar a proposito, y por eso no esta en los campos.
 *
 * Ese token es lo que quedo impreso en el QR pegado sobre la mesa. Cambiarlo
 * desde el panel dejaria el sticker apuntando a una URL que ya no existe, y el
 * cliente que lo escanea cae al flujo normal sin entender por que. Para dar de
 * baja una mesa esta `activo`.
 */
export const actualizar = mutation({
  args: {
    id: v.id("mesas"),
    campos: v.object({
      numero: v.optional(v.string()),
      sedeId: v.optional(v.id("sedes")),
      activo: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { id, campos }) => {
    await requerirAdmin(ctx);

    if (campos.numero !== undefined && campos.numero.trim() === "") {
      throw new Error("El numero de la mesa no puede estar vacio");
    }

    /*
     * El choque se evalua sobre como va a QUEDAR la mesa, no sobre lo que se
     * esta mandando. Es un patch parcial: puede venir solo el numero, solo la
     * sede, o las dos. Y MOVER una mesa de local tambien choca — pasar la mesa
     * 1 de Morichal a Dalia cuando Dalia ya tiene una mesa 1 crea el duplicado
     * sin que el numero haya cambiado.
     */
    const actual = await ctx.db.get(id);
    if (actual === null) {
      throw new Error("La mesa que se quiere editar ya no existe");
    }

    const numeroFinal =
      campos.numero !== undefined ? campos.numero.trim() : actual.numero;
    const sedeFinal =
      campos.sedeId !== undefined ? campos.sedeId : actual.sedeId;

    if (await mesaRepetida(ctx, numeroFinal, sedeFinal, id)) {
      throw new Error(`Ya existe una mesa ${numeroFinal} en esa sede`);
    }

    await ctx.db.patch(id, {
      ...campos,
      ...(campos.numero === undefined ? {} : { numero: campos.numero.trim() }),
    });
  },
});

/**
 * Borra una mesa. No hace falta guarda por pedidos: igual que con las sedes,
 * `pedidos` guarda `mesaNumero` ademas de `mesaId`, asi que el historial sigue
 * diciendo a que mesa fue cada pedido aunque la mesa ya no exista.
 *
 * Lo que SI se pierde es el QR impreso: su codigo deja de resolver. Por eso el
 * panel avisa antes, y para sacar una mesa de circulacion sin tirar el sticker
 * conviene `activo: false`.
 */
export const borrar = mutation({
  args: { id: v.id("mesas") },
  handler: async (ctx, { id }) => {
    await requerirAdmin(ctx);

    await ctx.db.delete(id);
  },
});
