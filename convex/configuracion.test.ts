import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

const ADMIN = { email: "admin@test.local", subject: "user_admin_test" };

const comoAdmin = (t: ReturnType<typeof convexTest>) => t.withIdentity(ADMIN);

// Sube un archivo cualquiera a storage y devuelve su id.
const subirArchivo = async (t: ReturnType<typeof convexTest>, contenido: string) =>
  await t.run(async (ctx) => await ctx.storage.store(new Blob([contenido])));

const idsEnStorage = async (t: ReturnType<typeof convexTest>) =>
  await t.run(async (ctx) => (await ctx.db.system.query("_storage").collect()).map((f) => f._id));

describe("configuracion.obtener", () => {
  test("devuelve null mientras no exista la fila de configuracion", async () => {
    const t = convexTest(schema, modules);

    // La tabla arranca vacia: el Hero tiene que poder caer a su portada por
    // defecto sin romperse.
    expect(await t.query(api.configuracion.obtener, {})).toBeNull();
  });

  test("resuelve la URL de la imagen en el servidor, no devuelve el id crudo", async () => {
    const t = convexTest(schema, modules);
    const storageId = await subirArchivo(t, "portada");

    await comoAdmin(t).mutation(api.configuracion.guardarImagenHeader, { storageId });

    const config = await t.query(api.configuracion.obtener, {});

    // El cliente recibe algo que puede poner en un <img src> directo.
    expect(typeof config!.imagenHeaderUrl).toBe("string");
    expect(config!.imagenHeaderUrl).not.toBe("");
  });

  test("sin imagen cargada devuelve imagenHeaderUrl null", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("configuracionRestaurante", { nombreRestaurante: "Topasc" });
    });

    const config = await t.query(api.configuracion.obtener, {});

    expect(config!.imagenHeaderUrl).toBeNull();
  });
});

describe("configuracion.guardarImagenHeader", () => {
  test("crea la fila de configuracion si todavia no existe", async () => {
    const t = convexTest(schema, modules);
    const storageId = await subirArchivo(t, "portada");

    await comoAdmin(t).mutation(api.configuracion.guardarImagenHeader, { storageId });

    const config = await t.query(api.configuracion.obtener, {});

    expect(config).not.toBeNull();
    expect(config!.nombreRestaurante).toBe("Topasc");
    expect(config!.imagenHeaderId).toBe(storageId);
  });

  test("al cambiar la portada borra el archivo anterior de storage", async () => {
    const t = convexTest(schema, modules);
    const vieja = await subirArchivo(t, "portada vieja");
    const nueva = await subirArchivo(t, "portada nueva");

    await comoAdmin(t).mutation(api.configuracion.guardarImagenHeader, { storageId: vieja });
    await comoAdmin(t).mutation(api.configuracion.guardarImagenHeader, { storageId: nueva });

    const enStorage = await idsEnStorage(t);

    // Sin este borrado, cada cambio de portada dejaria un huerfano que ya no
    // referencia nadie y que nunca se va a poder encontrar para limpiar.
    expect(enStorage).toContain(nueva);
    expect(enStorage).not.toContain(vieja);
  });

  test("guardar la misma imagen dos veces no la borra", async () => {
    const t = convexTest(schema, modules);
    const storageId = await subirArchivo(t, "portada");

    await comoAdmin(t).mutation(api.configuracion.guardarImagenHeader, { storageId });
    await comoAdmin(t).mutation(api.configuracion.guardarImagenHeader, { storageId });

    expect(await idsEnStorage(t)).toContain(storageId);
    const config = await t.query(api.configuracion.obtener, {});
    expect(config!.imagenHeaderId).toBe(storageId);
  });

  test("un visitante sin sesion de admin no puede cambiar la portada", async () => {
    const t = convexTest(schema, modules);
    const storageId = await subirArchivo(t, "portada");

    await expect(
      t.mutation(api.configuracion.guardarImagenHeader, { storageId })
    ).rejects.toThrow();
  });
});

describe("configuracion.quitarImagenHeader", () => {
  test("limpia el campo y borra el archivo", async () => {
    const t = convexTest(schema, modules);
    const storageId = await subirArchivo(t, "portada");

    await comoAdmin(t).mutation(api.configuracion.guardarImagenHeader, { storageId });
    await comoAdmin(t).mutation(api.configuracion.quitarImagenHeader, {});

    const config = await t.query(api.configuracion.obtener, {});

    expect(config!.imagenHeaderId).toBeUndefined();
    expect(config!.imagenHeaderUrl).toBeNull();
    expect(await idsEnStorage(t)).not.toContain(storageId);
  });

  test("no falla si no habia imagen cargada", async () => {
    const t = convexTest(schema, modules);

    await expect(
      comoAdmin(t).mutation(api.configuracion.quitarImagenHeader, {})
    ).resolves.not.toThrow();
  });

  test("un visitante sin sesion de admin no puede quitar la portada", async () => {
    const t = convexTest(schema, modules);
    const storageId = await subirArchivo(t, "portada");
    await comoAdmin(t).mutation(api.configuracion.guardarImagenHeader, { storageId });

    await expect(t.mutation(api.configuracion.quitarImagenHeader, {})).rejects.toThrow();
  });
});

describe("configuracion.guardarNombre", () => {
  test("crea la fila si todavia no existe", async () => {
    const t = convexTest(schema, modules);

    await comoAdmin(t).mutation(api.configuracion.guardarNombre, {
      nombreRestaurante: "Broaster Topasc",
    });

    expect((await t.query(api.configuracion.obtener, {}))?.nombreRestaurante).toBe(
      "Broaster Topasc"
    );
  });

  test("actualiza el nombre sin tocar la imagen ya cargada", async () => {
    const t = convexTest(schema, modules);
    const storageId = await t.run(async (ctx) => ctx.storage.store(new Blob(["x"])));

    await comoAdmin(t).mutation(api.configuracion.guardarImagenHeader, { storageId });
    await comoAdmin(t).mutation(api.configuracion.guardarNombre, {
      nombreRestaurante: "Otro nombre",
    });

    const config = await t.query(api.configuracion.obtener, {});
    // Las dos cosas viven en la misma fila: guardar una no puede borrar la otra.
    expect(config?.nombreRestaurante).toBe("Otro nombre");
    expect(config?.imagenHeaderId).toBe(storageId);
  });

  test("recorta los espacios", async () => {
    const t = convexTest(schema, modules);

    await comoAdmin(t).mutation(api.configuracion.guardarNombre, {
      nombreRestaurante: "  Topasc  ",
    });

    expect((await t.query(api.configuracion.obtener, {}))?.nombreRestaurante).toBe(
      "Topasc"
    );
  });

  test("rechaza un nombre vacio", async () => {
    const t = convexTest(schema, modules);

    // Sin nombre el titulo del Hero queda en blanco sobre la foto.
    await expect(
      comoAdmin(t).mutation(api.configuracion.guardarNombre, { nombreRestaurante: "   " })
    ).rejects.toThrow(/vacio/i);
  });

  test("rechaza un nombre mas largo que el tope", async () => {
    const t = convexTest(schema, modules);

    // El titulo va en una linea con overflow hidden: de mas se recorta sin
    // aviso, y el admin no entiende por que ve la mitad.
    await expect(
      comoAdmin(t).mutation(api.configuracion.guardarNombre, {
        nombreRestaurante: "Un nombre larguisimo que no entra nunca",
      })
    ).rejects.toThrow(/30 caracteres/);
  });

  test("un visitante sin sesion no puede cambiar el nombre", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.configuracion.guardarNombre, { nombreRestaurante: "Hackeado" })
    ).rejects.toThrow(/No autorizado/);
  });
});
