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

/**
 * Convierte un data URI base64 en un Blob.
 *
 * A mano y NO con `fetch(dataUri)`, que fue el primer intento y fallo en los 50
 * productos de produccion con:
 *
 *   Unsupported URL scheme -- http and https are supported (scheme was data)
 *
 * El `fetch` del runtime de Convex solo habla http y https. En el navegador
 * `fetch` de un `data:` funciona, y en Node tambien — por eso un test con
 * convexTest lo habria dejado pasar igual. Esta clase de bug (una API que existe
 * en un runtime y no en el otro) no la agarra el test: la agarra leer la doc de
 * APIs soportadas, que lista `atob` y `btoa` como disponibles.
 */
const dataUriABlob = (dataUri: string): Blob => {
  const coma = dataUri.indexOf(",");
  if (coma === -1) throw new Error("El data URI no tiene coma separadora");

  const cabecera = dataUri.slice(0, coma);
  const cuerpo = dataUri.slice(coma + 1);

  if (!cabecera.includes("base64")) {
    throw new Error(`Solo se soporta base64, llego "${cabecera}"`);
  }

  // El tipo se conserva para que el archivo se sirva con su Content-Type: sin eso
  // el navegador puede ofrecer descargar la foto en vez de mostrarla.
  const tipo = /^data:([^;,]+)/.exec(cabecera)?.[1] ?? "application/octet-stream";

  const binario = atob(cuerpo);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) {
    bytes[i] = binario.charCodeAt(i);
  }

  return new Blob([bytes], { type: tipo });
};

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
  handler: async (ctx, { tanda = 50 }) => {
    const migrados: string[] = [];
    // Map y no array, indexado por id: un item que falla sigue apareciendo como
    // pendiente en la vuelta siguiente, y con un array quedaria anotado dos veces.
    const fallados = new Map<string, { nombre: string; motivo: string }>();

    // Se vuelve a pedir la lista en cada vuelta y no se recorre una sola tanda:
    // asi el corte por "todavia tiene base64" se reevalua contra el estado real y
    // no contra una foto de hace diez segundos.
    for (;;) {
      const pendientes: { id: Id<"items">; nombre: string; base64: string }[] =
        await ctx.runQuery(internal.migraciones.fotosPendientes, { limite: tanda });

      // Los que ya fallaron no se reintentan: el motivo es el dato, no la
      // conexion, asi que volver a probar da el mismo error y gasta I/O al balde.
      const porHacer = pendientes.filter((item) => !fallados.has(item.id));
      if (porHacer.length === 0) break;

      let migradosEnEstaVuelta = 0;

      for (const item of porHacer) {
        try {
          const storageId = await ctx.storage.store(dataUriABlob(item.base64));

          await ctx.runMutation(internal.migraciones.asentarFoto, {
            id: item.id,
            storageId,
          });
          migrados.push(item.nombre);
          migradosEnEstaVuelta += 1;
        } catch (error) {
          // Un item con el base64 cortado no puede frenar a los otros 49: se
          // anota y se sigue. Si no, un solo dato malo deja la migracion a medias
          // sin decir cual fue.
          fallados.set(item.id, {
            nombre: item.nombre,
            motivo: error instanceof Error ? error.message : String(error),
          });
        }
      }

      /*
       * El corte mira SOLO esta vuelta, no el acumulado. La primera version
       * chequeaba `migrados.length === 0` —el total— y eso era un bucle infinito:
       * con un producto bueno y uno roto, el bueno migraba, el total dejaba de ser
       * 0 para siempre, y el roto volvia a salir como pendiente en cada vuelta.
       *
       * Con el filtro de `porHacer` de arriba ya no haria falta, pero queda como
       * segundo candado: una action en bucle quema I/O hasta el timeout, que es
       * justo el recurso que esta migracion viene a ahorrar.
       */
      if (migradosEnEstaVuelta === 0) break;
    }

    return {
      migrados: migrados.length,
      detalle: migrados,
      fallados: [...fallados.values()],
    };
  },
});

/* ============================================================================
 * Consolida los productos de una familia que estan cargados uno por variante.
 *
 * El caso: las alitas estaban como 10 productos — "Alitas BBQ x6", "x9", "x12",
 * "x24", "x36" y lo mismo en Miel Mostaza — repartidos en dos categorias. Son 2
 * productos con 5 precios cada uno. El cliente veia 5 tarjetas que solo se
 * diferenciaban en el numero.
 *
 * Agrupa por el nombre SIN el sufijo de cantidad, arma `presentaciones` con los
 * precios que ya estaban cargados, y borra los productos viejos.
 *
 * CORRER PRIMERO EN SIMULACION (es el default):
 *   npx convex run migraciones:consolidarPorCantidad --prod '{"destinoId":"...","origenIds":["...","..."]}'
 *
 * Y recien despues, en serio:
 *   ... '{"destinoId":"...","origenIds":[...],"confirmar":true}'
 *
 * Los ids van EXPLICITOS y no se buscan por nombre: borrar productos de
 * produccion a partir de un match de texto es exactamente como se borra lo que no
 * se queria borrar.
 * ========================================================================== */

// "Alitas BBQ x12" -> { base: "Alitas BBQ", cantidad: "12" }
const SUFIJO_CANTIDAD = /^(.*?)\s*x\s*(\d+)\s*$/i;

export const consolidarPorCantidad = internalMutation({
  args: {
    destinoId: v.id("categorias"),
    origenIds: v.array(v.id("categorias")),
    confirmar: v.optional(v.boolean()),
  },
  handler: async (ctx, { destinoId, origenIds, confirmar = false }) => {
    const destino = await ctx.db.get(destinoId);
    if (!destino) throw new Error("La categoria destino no existe");
    if (!destino.variantes?.opciones?.length) {
      // Sin variantes en la categoria, el formulario no muestra las filas de
      // precio y el cliente no puede elegir: los productos quedarian con
      // `presentaciones` cargadas pero invisibles.
      throw new Error(
        `"${destino.nombre}" no tiene variantes configuradas: cargalas primero en el panel`
      );
    }

    const todos = await ctx.db.query("items").collect();
    const origen = todos.filter((item) => origenIds.includes(item.categoriaId));

    if (origen.length === 0) throw new Error("Las categorias origen no tienen productos");

    // Se agrupa por el nombre sin el sufijo. Si un producto NO tiene sufijo de
    // cantidad se corta todo: seguir dejaria la familia a medias, con unos
    // productos consolidados y otros sueltos, y nadie sabria cual es cual.
    const familias = new Map<string, { cantidad: string; item: (typeof origen)[0] }[]>();
    for (const item of origen) {
      const match = SUFIJO_CANTIDAD.exec(item.nombre.trim());
      if (!match) {
        throw new Error(
          `"${item.nombre}" no termina en una cantidad (x6, x12...): no se puede agrupar`
        );
      }

      const [, base, cantidad] = match;
      if (!destino.variantes.opciones.includes(cantidad)) {
        throw new Error(
          `"${item.nombre}" usa la cantidad ${cantidad}, que no esta en las variantes de "${destino.nombre}"`
        );
      }

      const familia = familias.get(base) ?? [];
      familia.push({ cantidad, item });
      familias.set(base, familia);
    }

    const plan: {
      nuevo: string;
      presentaciones: { tamano: string; precio: number }[];
      borra: string[];
    }[] = [];

    for (const [base, miembros] of familias) {
      // Ordenado por precio: es el orden que ve el cliente, y de menor a mayor es
      // como se lee un precio que sube.
      const ordenados = [...miembros].sort((a, b) => a.item.precio - b.item.precio);

      plan.push({
        nuevo: base,
        presentaciones: ordenados.map((m) => ({
          tamano: m.cantidad,
          precio: m.item.precio,
        })),
        borra: ordenados.map((m) => m.item.nombre),
      });
    }

    // En simulacion se devuelve el plan y NO se toca nada. Es el default a
    // proposito: esto borra productos de produccion.
    if (!confirmar) {
      return {
        simulacion: true,
        destino: destino.nombre,
        plan,
        aviso: "Nada se modifico. Volve a correrlo con \"confirmar\": true",
      };
    }

    const creados: string[] = [];
    const borrados: string[] = [];
    // Las fotos de los productos que se borran, y las que NO se pueden tocar
    // porque un producto nuevo las heredo. Ver la nota de mas abajo.
    const fotosCandidatas = new Set<Id<"_storage">>();
    const fotosEnUso = new Set<Id<"_storage">>();

    for (const [base, miembros] of familias) {
      const ordenados = [...miembros].sort((a, b) => a.item.precio - b.item.precio);
      // El mas barato es el modelo: de ahi salen la foto, la descripcion, las
      // sedes y el resto. Es deterministico, que importa mas que cual se elija.
      const modelo = ordenados[0].item;

      await ctx.db.insert("items", {
        categoriaId: destinoId,
        nombre: base,
        descripcion: modelo.descripcion,
        ingredientes: modelo.ingredientes,
        // El precio de arriba es el "desde $X" de la tarjeta: el mas barato.
        precio: ordenados[0].item.precio,
        presentaciones: ordenados.map((m) => ({
          tamano: m.cantidad,
          precio: m.item.precio,
        })),
        // La foto del modelo se REUSA, no se copia: el producto nuevo apunta al
        // mismo archivo. Por eso mas abajo se borra la de los otros y no esta.
        imagenUrl: modelo.imagenUrl,
        imagenStorageId: modelo.imagenStorageId,
        llevaSalsas: modelo.llevaSalsas,
        sedeIds: modelo.sedeIds,
        disponible: modelo.disponible,
        activo: true,
      });
      creados.push(base);

      // La foto del modelo la hereda el producto nuevo: no se puede borrar.
      if (modelo.imagenStorageId) fotosEnUso.add(modelo.imagenStorageId);

      for (const { item } of ordenados) {
        if (item.imagenStorageId) fotosCandidatas.add(item.imagenStorageId);
        await ctx.db.delete(item._id);
        borrados.push(item.nombre);
      }
    }

    /*
     * Las fotos se borran al final y de a UNA, no mientras se borran los
     * productos.
     *
     * Dos razones, y las dos se descubrieron con un test:
     *   - Dos productos pueden compartir el mismo archivo. Borrarlo al procesar el
     *     primero rompe la imagen del segundo, o tira "Delete on non-existent doc"
     *     al intentar borrarlo de nuevo. El Set lo deja en una sola vez.
     *   - Una foto que quedo heredada por un producto NUEVO, o que todavia usa
     *     algun producto que no entro en esta consolidacion, no se puede tocar.
     *     Por eso se chequea contra lo que quedo vivo en la base, y no contra lo
     *     que esta migracion cree saber.
     */
    const vivos = await ctx.db.query("items").collect();
    const referenciadas = new Set(
      vivos.map((item) => item.imagenStorageId).filter(Boolean)
    );

    let fotosBorradas = 0;
    for (const foto of fotosCandidatas) {
      if (fotosEnUso.has(foto) || referenciadas.has(foto)) continue;

      await ctx.storage.delete(foto);
      fotosBorradas += 1;
    }

    // Las categorias origen se borran solo si quedaron VACIAS. Si alguien dejo
    // ahi un producto que no entraba en ninguna familia, la categoria sobrevive
    // con el adentro en vez de perderse.
    const categoriasBorradas: string[] = [];
    const categoriasConservadas: { nombre: string; quedan: number }[] = [];

    for (const origenId of origenIds) {
      const quedan = (await ctx.db.query("items").collect()).filter(
        (item) => item.categoriaId === origenId
      );
      const categoria = await ctx.db.get(origenId);
      if (!categoria) continue;

      if (quedan.length === 0) {
        await ctx.db.delete(origenId);
        categoriasBorradas.push(categoria.nombre);
      } else {
        categoriasConservadas.push({ nombre: categoria.nombre, quedan: quedan.length });
      }
    }

    return {
      simulacion: false,
      destino: destino.nombre,
      creados,
      borrados: borrados.length,
      detalleBorrados: borrados,
      fotosBorradas,
      categoriasBorradas,
      categoriasConservadas,
    };
  },
});
