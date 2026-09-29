import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

/*
 * Migracion de las fotos: del base64 dentro del documento al file storage.
 *
 * LIMITE DE ESTOS TESTS, y hay que tenerlo presente: el primer intento de esta
 * migracion usaba `fetch(dataUri)` y fallo en los 50 productos de produccion con
 * "Unsupported URL scheme (scheme was data)". Un test como estos NO lo habria
 * agarrado, porque el fetch de Node si soporta `data:` — la diferencia esta entre
 * el runtime de Node y el de Convex, y convexTest corre en Node.
 *
 * Asi que lo que se prueba aca es que la DECODIFICACION sea correcta (que los
 * bytes lleguen intactos y con su tipo) y que el documento quede liviano. Que la
 * API exista en el runtime de Convex se verifica leyendo la doc de APIs
 * soportadas, no con un test.
 */

const PNG_1PX_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/AF/gYQmAAAAAElFTkSuQmCC";
const DATA_URI = `data:image/png;base64,${PNG_1PX_BASE64}`;

const conFoto = async (
  t: ReturnType<typeof convexTest>,
  imagenUrl: string,
  nombre = "Muslo Topasc"
) =>
  await t.run(async (ctx) => {
    const categoriaId = await ctx.db.insert("categorias", {
      nombre: "Pollo",
      orden: 1,
      activo: true,
    });

    return await ctx.db.insert("items", {
      categoriaId,
      nombre,
      precio: 18000,
      disponible: true,
      activo: true,
      imagenUrl,
    });
  });

describe("migrarFotosAStorage", () => {
  test("sube la foto y deja el documento liviano", async () => {
    // Es el punto de toda la migracion: el documento tiene que quedar SIN el
    // base64. Si quedaran los dos, seguiria pesando los ~120 KB y el Database I/O
    // no bajaria.
    const t = convexTest(schema, modules);
    const id = await conFoto(t, DATA_URI);

    const resultado = await t.action(internal.migraciones.migrarFotosAStorage, {});

    expect(resultado.migrados).toBe(1);
    expect(resultado.fallados).toEqual([]);

    const item = await t.run(async (ctx) => ctx.db.get(id));
    expect(item?.imagenUrl).toBeUndefined();
    expect(item?.imagenStorageId).toBeTruthy();
  });

  test("los bytes llegan intactos y con su tipo", async () => {
    // Una decodificacion mal hecha sube un archivo corrupto: el menu mostraria
    // huecos en vez de fotos, y el base64 ya estaria borrado.
    const t = convexTest(schema, modules);
    const id = await conFoto(t, DATA_URI);

    await t.action(internal.migraciones.migrarFotosAStorage, {});

    const guardado = await t.run(async (ctx) => {
      const item = await ctx.db.get(id);
      const blob = await ctx.storage.get(item!.imagenStorageId!);
      const bytes = new Uint8Array(await blob!.arrayBuffer());

      // Se sale del `t.run` como array comun de numeros: lo que devuelve cruza el
      // serializador de Convex, que no soporta Uint8Array y tira "is not a
      // supported Convex type". El chequeo es sobre los bytes igual.
      return { tipo: blob!.type, firma: [...bytes.slice(0, 8)], largo: bytes.length };
    });

    expect(guardado.tipo).toBe("image/png");
    // Los primeros 8 bytes de todo PNG. Si la decodificacion corrio los bytes,
    // esta firma no coincide.
    expect(guardado.firma).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    // Y que no se haya truncado: el PNG de 1px son 69 bytes exactos.
    expect(guardado.largo).toBe(69);
  });

  test("el menu sigue mostrando la foto despues de migrar", async () => {
    // La query resuelve la URL del storage y la devuelve en el mismo `imagenUrl`:
    // si eso se rompiera, migrar dejaria el menu entero sin imagenes.
    const t = convexTest(schema, modules);
    await conFoto(t, DATA_URI);

    await t.action(internal.migraciones.migrarFotosAStorage, {});

    const menu = await t.query(api.items.listarMenu, {});

    expect(menu[0].imagenUrl).toBeTruthy();
    expect(menu[0].imagenUrl).not.toContain("base64");
  });

  test("es idempotente: correrla dos veces no duplica nada", async () => {
    const t = convexTest(schema, modules);
    await conFoto(t, DATA_URI);

    await t.action(internal.migraciones.migrarFotosAStorage, {});
    const segunda = await t.action(internal.migraciones.migrarFotosAStorage, {});

    // 0 migrados en la segunda corrida es lo que confirma que no quedo ninguna
    // foto sin pasar.
    expect(segunda.migrados).toBe(0);

    const archivos = await t.run(async (ctx) =>
      (await ctx.db.system.query("_storage").collect()).length
    );
    expect(archivos).toBe(1);
  });

  test("no toca los productos que ya tienen una URL comun", async () => {
    // El placeholder es una URL http, no un base64: no hay nada que migrar.
    const t = convexTest(schema, modules);
    const id = await conFoto(t, "https://ejemplo.com/placeholder.png");

    const resultado = await t.action(internal.migraciones.migrarFotosAStorage, {});

    expect(resultado.migrados).toBe(0);
    const item = await t.run(async (ctx) => ctx.db.get(id));
    expect(item?.imagenUrl).toBe("https://ejemplo.com/placeholder.png");
  });

  test("un base64 roto se anota y no frena a los demas", async () => {
    // Lo que paso en produccion: 50 productos y el error tiene que decir cual y
    // por que, no morirse en el primero dejando la migracion a medias.
    const t = convexTest(schema, modules);
    await conFoto(t, DATA_URI, "El bueno");
    await conFoto(t, "data:image/png;sinbase64", "El roto");

    const resultado = await t.action(internal.migraciones.migrarFotosAStorage, {});

    expect(resultado.migrados).toBe(1);
    expect(resultado.detalle).toEqual(["El bueno"]);
    expect(resultado.fallados).toHaveLength(1);
    expect(resultado.fallados[0].nombre).toBe("El roto");
  });

  test("si TODO falla corta en vez de quedar en bucle", async () => {
    // Los items fallados vuelven a salir como pendientes: sin el corte, el bucle
    // no termina nunca.
    const t = convexTest(schema, modules);
    await conFoto(t, "data:image/png;sinbase64", "El roto");

    const resultado = await t.action(internal.migraciones.migrarFotosAStorage, {});

    expect(resultado.migrados).toBe(0);
    expect(resultado.fallados).toHaveLength(1);
  });
});
