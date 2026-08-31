import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requerirAdmin } from "./guardias";
import type { Id } from "./_generated/dataModel";

const NOMBRE_POR_DEFECTO = "Topasc";

/**
 * `configuracionRestaurante` es un singleton: una sola fila para todo el
 * restaurante. La fila puede no existir todavia, asi que todo lo que lee
 * tiene que tolerar el null y todo lo que escribe tiene que poder crearla.
 */
const filaUnica = async (ctx: any) =>
  await ctx.db.query("configuracionRestaurante").first();

// Publica: el Hero la lee en todas las pantallas del cliente.
export const obtener = query({
  args: {},
  handler: async (ctx) => {
    const config = await filaUnica(ctx);

    if (!config) return null;

    return {
      ...config,
      // Se resuelve en el servidor y no en el cliente porque la URL de
      // storage es temporal: el front recibe una lista para usar, no un id
      // que tendria que ir a canjear por su cuenta.
      imagenHeaderUrl: config.imagenHeaderId
        ? await ctx.storage.getUrl(config.imagenHeaderId)
        : null,
    };
  },
});

/**
 * Paso 1 de la subida: devuelve una URL de un solo uso contra la que el
 * navegador sube el archivo directo a storage.
 *
 * El archivo NUNCA pasa por una mutation. Convex limita el tamaño de los
 * argumentos, y ademas mandar bytes por el websocket bloquearia la
 * suscripcion mientras dura la transferencia.
 */
export const generarUrlDeSubida = mutation({
  args: {},
  handler: async (ctx) => {
    await requerirAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Paso 2: apunta la configuracion al archivo recien subido.
 *
 * Borra el blob anterior en el mismo movimiento. Sin eso, cada cambio de
 * portada deja un archivo huerfano en storage que ya no referencia nadie y
 * que nadie va a encontrar nunca para limpiar.
 */
export const guardarImagenHeader = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await requerirAdmin(ctx);

    const config = await filaUnica(ctx);

    if (!config) {
      await ctx.db.insert("configuracionRestaurante", {
        nombreRestaurante: NOMBRE_POR_DEFECTO,
        imagenHeaderId: storageId,
      });
      return;
    }

    const anterior = config.imagenHeaderId as Id<"_storage"> | undefined;

    await ctx.db.patch(config._id, { imagenHeaderId: storageId });

    if (anterior && anterior !== storageId) {
      await ctx.storage.delete(anterior);
    }
  },
});

/**
 * Vuelve al header sin imagen configurada.
 *
 * Borra tambien el archivo: si solo se limpiara el campo, el blob quedaria
 * ocupando storage para siempre sin que nadie lo pueda alcanzar.
 */
export const quitarImagenHeader = mutation({
  args: {},
  handler: async (ctx) => {
    await requerirAdmin(ctx);

    const config = await filaUnica(ctx);
    if (!config?.imagenHeaderId) return;

    const anterior = config.imagenHeaderId as Id<"_storage">;

    await ctx.db.patch(config._id, { imagenHeaderId: undefined });
    await ctx.storage.delete(anterior);
  },
});
