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

describe("promociones — vigencia", () => {
  test("guarda la ventana de fechas tal cual", async () => {
    const t = convexTest(schema, modules);

    await comoAdmin(t).mutation(api.promociones.crear, {
      titulo: "Semana santa",
      vigenteDesde: "2026-03-29",
      vigenteHasta: "2026-04-05",
    });

    const [promo] = await comoAdmin(t).query(api.promociones.listarTodas, {});

    expect(promo.vigenteDesde).toBe("2026-03-29");
    expect(promo.vigenteHasta).toBe("2026-04-05");
  });

  test("rechaza una fecha con formato invalido", async () => {
    const t = convexTest(schema, modules);

    await expect(
      comoAdmin(t).mutation(api.promociones.crear, {
        titulo: "Mal formateada",
        vigenteDesde: "29/03/2026",
      })
    ).rejects.toThrow(/YYYY-MM-DD/);
  });

  test("rechaza una ventana al reves", async () => {
    const t = convexTest(schema, modules);

    await expect(
      comoAdmin(t).mutation(api.promociones.crear, {
        titulo: "Al reves",
        vigenteDesde: "2026-04-05",
        vigenteHasta: "2026-03-29",
      })
    ).rejects.toThrow(/no puede ser posterior/);
  });

  test("una fecha vacia se guarda como sin fecha", async () => {
    const t = convexTest(schema, modules);

    // El <input type="date"> vacio manda "": tiene que significar "sin
    // fecha", no romper la validacion de formato.
    await comoAdmin(t).mutation(api.promociones.crear, {
      titulo: "Sin vencimiento",
      vigenteDesde: "",
      vigenteHasta: "",
    });

    const [promo] = await comoAdmin(t).query(api.promociones.listarTodas, {});

    expect(promo.vigenteDesde).toBeUndefined();
    expect(promo.vigenteHasta).toBeUndefined();
  });

  test("se le puede SACAR la fecha a una promo que ya la tenia", async () => {
    const t = convexTest(schema, modules);
    const id = await comoAdmin(t).mutation(api.promociones.crear, {
      titulo: "Con fecha",
      vigenteHasta: "2026-09-18",
    });

    await comoAdmin(t).mutation(api.promociones.actualizar, {
      id,
      campos: { vigenteHasta: "" },
    });

    const [promo] = await comoAdmin(t).query(api.promociones.listarTodas, {});
    expect(promo.vigenteHasta).toBeUndefined();
  });

  test("editar solo el fin no borra el inicio que ya estaba", async () => {
    const t = convexTest(schema, modules);
    const id = await comoAdmin(t).mutation(api.promociones.crear, {
      titulo: "Ventana",
      vigenteDesde: "2026-09-01",
      vigenteHasta: "2026-09-10",
    });

    await comoAdmin(t).mutation(api.promociones.actualizar, {
      id,
      campos: { vigenteHasta: "2026-09-30" },
    });

    const [promo] = await comoAdmin(t).query(api.promociones.listarTodas, {});
    // `undefined` en un patch borra el campo: si la mutation mandara las dos
    // fechas siempre, esta promo se quedaria sin inicio sin que nadie lo pida.
    expect(promo.vigenteDesde).toBe("2026-09-01");
    expect(promo.vigenteHasta).toBe("2026-09-30");
  });

  test("actualizar valida el estado FINAL, no solo lo que llega", async () => {
    const t = convexTest(schema, modules);
    const id = await comoAdmin(t).mutation(api.promociones.crear, {
      titulo: "Ventana",
      vigenteDesde: "2026-09-20",
    });

    // El `hasta` que llega es anterior al `desde` que ya estaba guardado.
    await expect(
      comoAdmin(t).mutation(api.promociones.actualizar, {
        id,
        campos: { vigenteHasta: "2026-09-10" },
      })
    ).rejects.toThrow(/no puede ser posterior/);
  });

  test("listar NO filtra por fecha: eso lo decide el cliente", async () => {
    const t = convexTest(schema, modules);

    await comoAdmin(t).mutation(api.promociones.crear, {
      titulo: "Vencida hace rato",
      vigenteHasta: "2020-01-01",
    });

    // A proposito: Convex corre en UTC y en Colombia (UTC-5) el server ya
    // esta en el dia siguiente desde las 19:00, asi que filtrar la fecha aca
    // apagaria las promos del dia en plena hora pico. El filtro vive en
    // src/utils/vigencia.js, con la hora local del navegador.
    expect(await t.query(api.promociones.listar, {})).toHaveLength(1);
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
