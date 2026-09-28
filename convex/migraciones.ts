import { mutation, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requerirAdmin } from "./guardias";

// Migracion de un solo uso: el flujo de 6 estados se reduce a
// recibido -> completado, con cancelado como unica salida de emergencia.
//
// Correr UNA vez, con el schema todavia expandido:
//   npx convex run migraciones:migrarEstados
//
// Recien despues de que esto corra se pueden borrar los estados viejos del
// schema. Cuando eso este hecho, este archivo se puede eliminar.

type EstadoNuevo = "recibido" | "completado";

const MAPA_ESTADOS: Record<string, EstadoNuevo> = {
  pendiente: "recibido",
  confirmado: "recibido",
  en_preparacion: "recibido",
  listo: "recibido",
  entregado: "completado",
  // `cancelado` no se toca: sigue siendo un estado valido.
};

export const migrarEstados = mutation({
  args: {},
  handler: async (ctx) => {
    await requerirAdmin(ctx);

    const pedidos = await ctx.db.query("pedidos").collect();

    let migrados = 0;
    for (const pedido of pedidos) {
      const nuevo = MAPA_ESTADOS[pedido.estado];
      if (!nuevo) continue;

      await ctx.db.patch(pedido._id, { estado: nuevo });
      migrados += 1;
    }

    // Se devuelve el detalle para poder verificar por consola que no quedo
    // ningun pedido con un estado viejo antes de achicar el schema.
    return {
      total: pedidos.length,
      migrados,
      sinCambios: pedidos.length - migrados,
    };
  },
});

/**
 * Le pone precio con leche a los jugos que ya estaban cargados, para que todos
 * ofrezcan la opcion sin tener que editarlos uno por uno.
 *
 * Es `internalMutation` y NO `mutation`: asi no la puede llamar ningun cliente,
 * solo el CLI. Mismo criterio que `sedes:sincronizar`. Una mutation publica sin
 * `requerirAdmin` seria un agujero — cualquiera podria cambiarte los precios.
 *
 *   npx convex run migraciones:ponerPrecioConLeche
 *   npx convex run migraciones:ponerPrecioConLeche --prod
 *
 * Es idempotente: NO toca los jugos que ya tienen el campo, asi que correrla
 * dos veces no duplica el recargo ni pisa un precio puesto a mano.
 *
 * Solo alcanza los productos cuyo nombre empieza con "jugo". A proposito: en
 * la misma categoria conviven limonadas y otras bebidas que con leche no
 * existen, asi que marcar la categoria entera pondria a la venta cosas que el
 * local no prepara.
 */
export const ponerPrecioConLeche = internalMutation({
  args: {
    // Parametrizado y con default: el recargo de hoy es 3000, pero que quede
    // clavado en el codigo obliga a editar el archivo para volver a usarla.
    recargo: v.optional(v.number()),
  },
  handler: async (ctx, { recargo = 3000 }) => {
    const items = await ctx.db.query("items").collect();

    const actualizados: { nombre: string; enAgua: number; conLeche: number }[] = [];
    const yaTenian: string[] = [];

    for (const item of items) {
      if (!item.nombre.trim().toLowerCase().startsWith("jugo")) continue;

      if (item.precioConLeche !== undefined) {
        yaTenian.push(item.nombre);
        continue;
      }

      const conLeche = item.precio + recargo;
      await ctx.db.patch(item._id, { precioConLeche: conLeche });
      actualizados.push({
        nombre: item.nombre,
        enAgua: item.precio,
        conLeche,
      });
    }

    return { recargo, actualizados, yaTenian };
  },
});

/* ============================================================================
 * Fotos de base64 dentro del documento -> file storage de Convex.
 *
 * POR QUE: el limite que se revento es Database I/O (1.12 GB de 1 GB). Esa
 * metrica cuenta los bytes que LEEN las funciones, y `.collect()` lee el
 * documento completo. Con ~120 KB de base64 por producto la tabla `items` pesaba
 * ~5,5 MB, y CADA mutacion invalida el cache y obliga a releerla entera: tocar el
 * switch de "disponible" costaba 5,5 MB. Doscientas ediciones = 1 GB.
 *
 * Despues de migrar el documento guarda solo un id de ~30 bytes y la misma
 * lectura cuesta ~50 KB. El File Storage estaba al 0,02% de 1 GB, o sea que es
 * mover datos de la casilla que reventó a la que esta vacia.
 *
 * COMO CORRERLA:
 *   npx convex run migraciones:migrarFotosAStorage
 *   npx convex run migraciones:migrarFotosAStorage --prod
 *
 * Es idempotente: solo toca los items cuyo `imagenUrl` empieza con "data:", asi
 * que correrla dos veces no duplica archivos. Y procesa de a tandas — si corta a
 * mitad de camino, lo ya migrado queda migrado y se sigue desde ahi.
 * ========================================================================== */

/** Items que todavia tienen la foto como base64 dentro del documento. */
export const fotosPendientes = internalQuery({
  args: { limite: v.optional(v.number()) },
  handler: async (ctx, { limite = 10 }) => {
    const items = await ctx.db.query("items").collect();

    return items
      .filter((item) => item.imagenUrl?.startsWith("data:"))
      .slice(0, limite)
      .map((item) => ({ id: item._id, nombre: item.nombre, base64: item.imagenUrl! }));
  },
});

/**
 * Deja el id del archivo y borra el base64.
 *
 * Los dos cambios van JUNTOS en la misma mutation a proposito: si se guardara el
 * id primero y el borrado quedara para despues, una interrupcion dejaria el
 * documento con las dos cosas — o sea pesado igual, que es justo lo que se viene
 * a arreglar.
 */
export const asentarFoto = internalMutation({
  args: { id: v.id("items"), storageId: v.id("_storage") },
  handler: async (ctx, { id, storageId }) => {
    await ctx.db.patch(id, { imagenStorageId: storageId, imagenUrl: undefined });
  },
});

export const migrarFotosAStorage = internalAction({
  args: { tanda: v.optional(v.number()) },
  handler: async (ctx, { tanda = 10 }) => {
    const migrados: string[] = [];
    const fallados: { nombre: string; motivo: string }[] = [];

    // Se vuelve a pedir la lista en cada vuelta y no se recorre una sola tanda:
    // asi el corte por "todavia tiene base64" se reevalua contra el estado real y
    // no contra una foto de hace diez segundos.
    for (;;) {
      const pendientes: { id: Id<"items">; nombre: string; base64: string }[] =
        await ctx.runQuery(internal.migraciones.fotosPendientes, { limite: tanda });

      if (pendientes.length === 0) break;

      for (const item of pendientes) {
        try {
          // El data URI se convierte a Blob con fetch, que sabe leerlos. Es mas
          // corto y mas seguro que partir la cadena y decodificar a mano.
          const blob = await (await fetch(item.base64)).blob();
          const storageId = await ctx.storage.store(blob);

          await ctx.runMutation(internal.migraciones.asentarFoto, {
            id: item.id,
            storageId,
          });
          migrados.push(item.nombre);
        } catch (error) {
          // Un item con el base64 cortado no puede frenar a los otros 43: se
          // anota y se sigue. Si no, un solo dato malo deja la migracion a medias
          // sin decir cual fue.
          fallados.push({
            nombre: item.nombre,
            motivo: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Si toda la tanda fallo, seguir es un bucle infinito: los mismos items
      // volverian a salir como pendientes para siempre.
      if (migrados.length === 0 && fallados.length >= pendientes.length) break;
    }

    return { migrados: migrados.length, detalle: migrados, fallados };
  },
});
