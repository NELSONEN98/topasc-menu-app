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

describe("consolidarPorCantidad", () => {
  const sembrarAlitas = async (t: ReturnType<typeof convexTest>) =>
    await t.run(async (ctx) => {
      const destino = await ctx.db.insert("categorias", {
        nombre: "ALITAS",
        orden: 16,
        activo: true,
        variantes: { etiqueta: "¿Cuántas?", opciones: ["6", "9", "12", "24", "36"] },
      });
      const bbq = await ctx.db.insert("categorias", {
        nombre: "ALITAS BBQ",
        orden: 7,
        activo: true,
      });
      const miel = await ctx.db.insert("categorias", {
        nombre: "ALITAS MIEL MOSTAZA",
        orden: 8,
        activo: true,
      });

      const foto = await ctx.storage.store(new Blob(["foto"]));

      for (const [nombre, precio, cat] of [
        ["Alitas BBQ x6", 22000, bbq],
        ["Alitas BBQ x12", 39000, bbq],
        ["Alitas BBQ x36", 95000, bbq],
        ["Alitas Miel Mostaza x6", 25000, miel],
        ["Alitas Miel Mostaza x12", 42000, miel],
      ] as const) {
        await ctx.db.insert("items", {
          categoriaId: cat as any,
          nombre,
          precio: precio as number,
          disponible: true,
          activo: true,
          llevaSalsas: true,
          imagenStorageId: foto,
        });
      }

      return { destino, bbq, miel };
    });

  test("por defecto SIMULA y no toca nada", async () => {
    // Esto borra productos de produccion: el primer intento no puede ser el real.
    const t = convexTest(schema, modules);
    const { destino, bbq, miel } = await sembrarAlitas(t);

    const r = await t.mutation(internal.migraciones.consolidarPorCantidad, {
      destinoId: destino,
      origenIds: [bbq, miel],
    });

    expect(r.simulacion).toBe(true);
    expect(r.plan).toHaveLength(2);

    const items = await t.run(async (ctx) => ctx.db.query("items").collect());
    expect(items).toHaveLength(5); // nada se movio
  });

  test("agrupa por sabor y arma las presentaciones con los precios cargados", async () => {
    const t = convexTest(schema, modules);
    const { destino, bbq, miel } = await sembrarAlitas(t);

    const r = await t.mutation(internal.migraciones.consolidarPorCantidad, {
      destinoId: destino,
      origenIds: [bbq, miel],
      confirmar: true,
    });

    expect(r.creados.sort()).toEqual(["Alitas BBQ", "Alitas Miel Mostaza"]);
    expect(r.borrados).toBe(5);

    const items = await t.run(async (ctx) => ctx.db.query("items").collect());
    expect(items).toHaveLength(2);

    const bbqNuevo = items.find((i) => i.nombre === "Alitas BBQ");
    expect(bbqNuevo?.presentaciones).toEqual([
      { tamano: "6", precio: 22000 },
      { tamano: "12", precio: 39000 },
      { tamano: "36", precio: 95000 },
    ]);
    // El precio de arriba es el "desde" de la tarjeta: el mas barato.
    expect(bbqNuevo?.precio).toBe(22000);
    expect(bbqNuevo?.categoriaId).toBe(destino);
  });

  test("el producto nuevo hereda la foto y no queda sin imagen", async () => {
    const t = convexTest(schema, modules);
    const { destino, bbq, miel } = await sembrarAlitas(t);

    await t.mutation(internal.migraciones.consolidarPorCantidad, {
      destinoId: destino,
      origenIds: [bbq, miel],
      confirmar: true,
    });

    const items = await t.run(async (ctx) => ctx.db.query("items").collect());
    for (const item of items) {
      expect(item.imagenStorageId).toBeTruthy();
    }

    // Y la foto que heredo sigue EXISTIENDO: si se hubiera borrado junto con los
    // productos viejos, las tarjetas quedarian sin imagen.
    const archivos = await t.run(async (ctx) =>
      (await ctx.db.system.query("_storage").collect()).map((f) => f._id)
    );
    expect(archivos).toContain(items[0].imagenStorageId);
  });

  test("borra las categorias origen cuando quedan vacias", async () => {
    const t = convexTest(schema, modules);
    const { destino, bbq, miel } = await sembrarAlitas(t);

    const r = await t.mutation(internal.migraciones.consolidarPorCantidad, {
      destinoId: destino,
      origenIds: [bbq, miel],
      confirmar: true,
    });

    expect(r.categoriasBorradas.sort()).toEqual(["ALITAS BBQ", "ALITAS MIEL MOSTAZA"]);
    const cats = await t.run(async (ctx) => ctx.db.query("categorias").collect());
    expect(cats.map((c) => c.nombre)).toEqual(["ALITAS"]);
  });

  test("CONSERVA la categoria si quedo algo que no entraba en ninguna familia", async () => {
    // Si no, un producto que alguien dejo ahi se perderia con la categoria.
    const t = convexTest(schema, modules);
    const { destino, bbq, miel } = await sembrarAlitas(t);
    await t.run(async (ctx) =>
      ctx.db.insert("items", {
        categoriaId: bbq,
        nombre: "Alitas BBQ x6",
        precio: 22000,
        disponible: true,
        activo: false, // inactivo: igual sigue siendo una fila de la tabla
      })
    );

    const r = await t.mutation(internal.migraciones.consolidarPorCantidad, {
      destinoId: destino,
      origenIds: [bbq, miel],
      confirmar: true,
    });

    // El x6 inactivo tambien entra en la familia, asi que la categoria igual queda
    // vacia. Lo que importa es que el conteo cierre y nada quede huerfano.
    expect(r.borrados).toBe(6);
  });

  test("CORTA si un producto no termina en una cantidad", async () => {
    // Seguir dejaria la familia a medias: unos consolidados y otros sueltos.
    const t = convexTest(schema, modules);
    const { destino, bbq, miel } = await sembrarAlitas(t);
    await t.run(async (ctx) =>
      ctx.db.insert("items", {
        categoriaId: bbq,
        nombre: "Alitas con papas",
        precio: 30000,
        disponible: true,
        activo: true,
      })
    );

    await expect(
      t.mutation(internal.migraciones.consolidarPorCantidad, {
        destinoId: destino,
        origenIds: [bbq, miel],
        confirmar: true,
      })
    ).rejects.toThrow(/no termina en una cantidad/);
  });

  test("CORTA si la cantidad no esta en las variantes de la categoria", async () => {
    const t = convexTest(schema, modules);
    const { destino, bbq, miel } = await sembrarAlitas(t);
    await t.run(async (ctx) =>
      ctx.db.insert("items", {
        categoriaId: bbq,
        nombre: "Alitas BBQ x18",
        precio: 50000,
        disponible: true,
        activo: true,
      })
    );

    await expect(
      t.mutation(internal.migraciones.consolidarPorCantidad, {
        destinoId: destino,
        origenIds: [bbq, miel],
        confirmar: true,
      })
    ).rejects.toThrow(/no esta en las variantes/);
  });

  test("CORTA si la categoria destino no tiene variantes", async () => {
    // Sin variantes, el formulario no muestra las filas y el cliente no puede
    // elegir: los productos quedarian con presentaciones invisibles.
    const t = convexTest(schema, modules);
    const { bbq, miel } = await sembrarAlitas(t);
    const sinVariantes = await t.run(async (ctx) =>
      ctx.db.insert("categorias", { nombre: "PELADA", orden: 20, activo: true })
    );

    await expect(
      t.mutation(internal.migraciones.consolidarPorCantidad, {
        destinoId: sinVariantes,
        origenIds: [bbq, miel],
        confirmar: true,
      })
    ).rejects.toThrow(/no tiene variantes configuradas/);
  });
});

describe("consolidarPorCantidad — fotos compartidas (regresion)", () => {
  test("dos productos con la MISMA foto no la borran dos veces", async () => {
    /*
     * EL BUG: la version original borraba la foto al procesar cada producto. Con
     * los 5 productos del test compartiendo un archivo, el primero lo borraba y el
     * segundo tiraba "Delete on non-existent doc" — y si no hubiera tirado, le
     * habria dejado la tarjeta sin imagen al producto que seguia usandolo.
     *
     * En produccion cada alita tenia su propia foto, asi que no se habria notado
     * hasta que alguien reusara una.
     */
    const t = convexTest(schema, modules);

    const { destino, bbq } = await t.run(async (ctx) => {
      const destino = await ctx.db.insert("categorias", {
        nombre: "ALITAS",
        orden: 1,
        activo: true,
        variantes: { etiqueta: "¿Cuántas?", opciones: ["6", "12"] },
      });
      const bbq = await ctx.db.insert("categorias", {
        nombre: "ALITAS BBQ",
        orden: 2,
        activo: true,
      });

      // UNA sola foto para los dos productos.
      const compartida = await ctx.db.system ? await ctx.storage.store(new Blob(["x"])) : null;

      for (const [nombre, precio] of [
        ["Alitas BBQ x6", 22000],
        ["Alitas BBQ x12", 39000],
      ] as const) {
        await ctx.db.insert("items", {
          categoriaId: bbq,
          nombre,
          precio: precio as number,
          disponible: true,
          activo: true,
          imagenStorageId: compartida!,
        });
      }

      return { destino, bbq };
    });

    const r = await t.mutation(internal.migraciones.consolidarPorCantidad, {
      destinoId: destino,
      origenIds: [bbq],
      confirmar: true,
    });

    expect(r.borrados).toBe(2);
    // No se borro ninguna foto: la unica que habia la heredo el producto nuevo.
    expect(r.fotosBorradas).toBe(0);

    const items = await t.run(async (ctx) => ctx.db.query("items").collect());
    expect(items).toHaveLength(1);
    expect(items[0].imagenStorageId).toBeTruthy();

    // Y el archivo sigue existiendo, o la tarjeta quedaria sin imagen.
    const archivos = await t.run(async (ctx) =>
      (await ctx.db.system.query("_storage").collect()).length
    );
    expect(archivos).toBe(1);
  });
});
