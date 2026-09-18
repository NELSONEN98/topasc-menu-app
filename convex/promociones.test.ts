import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

const ADMIN = { email: "admin@test.local", subject: "user_admin_test" };

const comoAdmin = (t: ReturnType<typeof convexTest>) => t.withIdentity(ADMIN);

const crearSede = async (t: ReturnType<typeof convexTest>, nombre: string) =>
  await t.run(async (ctx) =>
    ctx.db.insert("sedes", { nombre, whatsapp: "573206873870", activo: true })
  );

const titulos = (promos: { titulo: string }[]) => promos.map((p) => p.titulo);

describe("promociones.crear", () => {
  test("la primera promo nace activa y en el orden 1", async () => {
    const t = convexTest(schema, modules);

    await comoAdmin(t).mutation(api.promociones.crear, { titulo: "2x1 en salchipapas" });

    const todas = await comoAdmin(t).query(api.promociones.listarTodas, {});

    expect(todas).toHaveLength(1);
    expect(todas[0].activa).toBe(true);
    expect(todas[0].orden).toBe(1);
  });

  test("cada promo nueva se agrega al final", async () => {
    const t = convexTest(schema, modules);

    await comoAdmin(t).mutation(api.promociones.crear, { titulo: "Primera" });
    await comoAdmin(t).mutation(api.promociones.crear, { titulo: "Segunda" });
    await comoAdmin(t).mutation(api.promociones.crear, { titulo: "Tercera" });

    const todas = await comoAdmin(t).query(api.promociones.listarTodas, {});

    expect(titulos(todas)).toEqual(["Primera", "Segunda", "Tercera"]);
    expect(todas.map((p) => p.orden)).toEqual([1, 2, 3]);
  });

  test("rechaza un titulo vacio", async () => {
    const t = convexTest(schema, modules);

    await expect(
      comoAdmin(t).mutation(api.promociones.crear, { titulo: "   " })
    ).rejects.toThrow(/titulo/i);
  });

  test("recorta el titulo y descarta una descripcion en blanco", async () => {
    const t = convexTest(schema, modules);

    await comoAdmin(t).mutation(api.promociones.crear, {
      titulo: "  Combo familiar  ",
      descripcion: "   ",
    });

    const todas = await comoAdmin(t).query(api.promociones.listarTodas, {});

    expect(todas[0].titulo).toBe("Combo familiar");
    // Una descripcion que es solo espacios no tiene que llegar a la tarjeta
    // del cliente como un parrafo vacio.
    expect(todas[0].descripcion).toBeUndefined();
  });

  test("un visitante sin sesion de admin no puede crear promos", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.promociones.crear, { titulo: "Promo pirata" })
    ).rejects.toThrow(/No autorizado/);
  });
});

describe("promociones.listar — activas", () => {
  test("solo devuelve las activas", async () => {
    const t = convexTest(schema, modules);

    await comoAdmin(t).mutation(api.promociones.crear, { titulo: "Vigente" });
    await comoAdmin(t).mutation(api.promociones.crear, {
      titulo: "Apagada",
      activa: false,
    });

    const publicas = await t.query(api.promociones.listar, {});

    // `listarTodas` las ve a las dos; el cliente solo la activa.
    expect(titulos(publicas)).toEqual(["Vigente"]);
    expect(await comoAdmin(t).query(api.promociones.listarTodas, {})).toHaveLength(2);
  });

  test("apagar una promo la saca del menu sin perder la fila", async () => {
    const t = convexTest(schema, modules);

    const id = await comoAdmin(t).mutation(api.promociones.crear, { titulo: "Del lunes" });
    await comoAdmin(t).mutation(api.promociones.actualizar, {
      id,
      campos: { activa: false },
    });

    expect(await t.query(api.promociones.listar, {})).toHaveLength(0);
    // La fila sigue ahi con su texto, lista para reactivarse otro dia.
    const todas = await comoAdmin(t).query(api.promociones.listarTodas, {});
    expect(todas[0].titulo).toBe("Del lunes");
  });
});

describe("promociones.listar — filtro por sede", () => {
  test("una promo marcada para una sede no se ve en la otra", async () => {
    const t = convexTest(schema, modules);
    const dalia = await crearSede(t, "Sede Dalia");
    const morichal = await crearSede(t, "Sede Morichal");

    await comoAdmin(t).mutation(api.promociones.crear, {
      titulo: "Solo Dalia",
      sedeIds: [dalia],
    });

    expect(titulos(await t.query(api.promociones.listar, { sedeId: dalia }))).toEqual([
      "Solo Dalia",
    ]);
    expect(await t.query(api.promociones.listar, { sedeId: morichal })).toHaveLength(0);
  });

  test("una promo en varias sedes se ve en todas esas", async () => {
    const t = convexTest(schema, modules);
    const dalia = await crearSede(t, "Sede Dalia");
    const morichal = await crearSede(t, "Sede Morichal");
    const tercera = await crearSede(t, "Sede Tercera");

    await comoAdmin(t).mutation(api.promociones.crear, {
      titulo: "Dalia y Morichal",
      sedeIds: [dalia, morichal],
    });

    expect(await t.query(api.promociones.listar, { sedeId: dalia })).toHaveLength(1);
    expect(await t.query(api.promociones.listar, { sedeId: morichal })).toHaveLength(1);
    expect(await t.query(api.promociones.listar, { sedeId: tercera })).toHaveLength(0);
  });

  test("una promo SIN sedeIds se ve en todas las sedes", async () => {
    const t = convexTest(schema, modules);
    const dalia = await crearSede(t, "Sede Dalia");

    // Es el default seguro para las promos cargadas antes de que existiera el
    // campo: siguen apareciendo hasta que alguien las edite.
    await comoAdmin(t).mutation(api.promociones.crear, { titulo: "Para todos" });

    expect(titulos(await t.query(api.promociones.listar, { sedeId: dalia }))).toEqual([
      "Para todos",
    ]);
  });

  test("sin sede (flujo por QR) se devuelven todas las activas", async () => {
    const t = convexTest(schema, modules);
    const dalia = await crearSede(t, "Sede Dalia");

    await comoAdmin(t).mutation(api.promociones.crear, {
      titulo: "Solo Dalia",
      sedeIds: [dalia],
    });
    await comoAdmin(t).mutation(api.promociones.crear, { titulo: "Para todos" });

    // Preferimos mostrar de mas que dejar al cliente del QR sin ninguna promo.
    expect(await t.query(api.promociones.listar, {})).toHaveLength(2);
  });
});

describe("promociones.actualizar y borrar", () => {
  test("editar la sede de una promo la mueve de local", async () => {
    const t = convexTest(schema, modules);
    const dalia = await crearSede(t, "Sede Dalia");
    const morichal = await crearSede(t, "Sede Morichal");

    const id = await comoAdmin(t).mutation(api.promociones.crear, {
      titulo: "Se muda",
      sedeIds: [dalia],
    });
    await comoAdmin(t).mutation(api.promociones.actualizar, {
      id,
      campos: { sedeIds: [morichal] },
    });

    expect(await t.query(api.promociones.listar, { sedeId: dalia })).toHaveLength(0);
    expect(await t.query(api.promociones.listar, { sedeId: morichal })).toHaveLength(1);
  });

  test("actualizar rechaza dejar el titulo vacio", async () => {
    const t = convexTest(schema, modules);
    const id = await comoAdmin(t).mutation(api.promociones.crear, { titulo: "Con titulo" });

    await expect(
      comoAdmin(t).mutation(api.promociones.actualizar, { id, campos: { titulo: "  " } })
    ).rejects.toThrow(/titulo/i);
  });

  test("borrar saca la promo de la lista", async () => {
    const t = convexTest(schema, modules);
    const id = await comoAdmin(t).mutation(api.promociones.crear, { titulo: "Efimera" });

    await comoAdmin(t).mutation(api.promociones.borrar, { id });

    expect(await comoAdmin(t).query(api.promociones.listarTodas, {})).toHaveLength(0);
  });

  test("un visitante sin sesion no puede editar ni borrar", async () => {
    const t = convexTest(schema, modules);
    const id = await comoAdmin(t).mutation(api.promociones.crear, { titulo: "Intocable" });

    await expect(
      t.mutation(api.promociones.actualizar, { id, campos: { titulo: "Hackeada" } })
    ).rejects.toThrow(/No autorizado/);
    await expect(t.mutation(api.promociones.borrar, { id })).rejects.toThrow(/No autorizado/);
  });

  test("listarTodas exige sesion de admin", async () => {
    const t = convexTest(schema, modules);

    await expect(t.query(api.promociones.listarTodas, {})).rejects.toThrow(/No autorizado/);
  });
});
