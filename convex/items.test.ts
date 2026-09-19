import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

/**
 * Deja un menu con los cuatro casos que le importan al filtro por sede:
 * un item sin `sedeIds`, uno con el array vacio, uno marcado en una sola sede
 * y uno marcado en dos.
 */
const sembrarMenu = async (t: ReturnType<typeof convexTest>) =>
  await t.run(async (ctx) => {
    const categoriaId = await ctx.db.insert("categorias", {
      nombre: "Salchipapas",
      orden: 1,
      activo: true,
    });

    const dalia = await ctx.db.insert("sedes", {
      nombre: "Sede Dalia",
      whatsapp: "573000000001",
      activo: true,
    });
    const morichal = await ctx.db.insert("sedes", {
      nombre: "Sede Morichal",
      whatsapp: "573000000002",
      activo: true,
    });

    const base = {
      categoriaId,
      precio: 18000,
      disponible: true,
      activo: true,
    };

    await ctx.db.insert("items", { ...base, nombre: "Sin sedeIds" });
    await ctx.db.insert("items", { ...base, nombre: "Array vacio", sedeIds: [] });
    await ctx.db.insert("items", {
      ...base,
      nombre: "Solo Dalia",
      sedeIds: [dalia],
    });
    await ctx.db.insert("items", {
      ...base,
      nombre: "En las dos",
      sedeIds: [dalia, morichal],
    });

    return { dalia, morichal };
  });

const nombres = (items: { nombre: string }[]) => items.map((i) => i.nombre).sort();

describe("items.listarMenu — filtro por sede", () => {
  test("sin sedeId devuelve el menu completo (es el flujo por QR)", async () => {
    const t = convexTest(schema, modules);
    await sembrarMenu(t);

    const menu = await t.query(api.items.listarMenu, {});

    // Las mesas todavia no guardan sede: preferimos mostrar de mas antes que
    // dejar al cliente con la pantalla vacia.
    expect(nombres(menu)).toEqual([
      "Array vacio",
      "En las dos",
      "Sin sedeIds",
      "Solo Dalia",
    ]);
  });

  test("un item sin sedeIds se ve en todas las sedes", async () => {
    const t = convexTest(schema, modules);
    const { morichal } = await sembrarMenu(t);

    const menu = await t.query(api.items.listarMenu, { sedeId: morichal });

    // Es el fallback que hace que los productos anteriores al campo sigan
    // apareciendo sin necesidad de migrarlos.
    expect(nombres(menu)).toContain("Sin sedeIds");
  });

  test("un array de sedes vacio se trata igual que ausente", async () => {
    const t = convexTest(schema, modules);
    const { morichal } = await sembrarMenu(t);

    const menu = await t.query(api.items.listarMenu, { sedeId: morichal });

    expect(nombres(menu)).toContain("Array vacio");
  });

  test("EXCLUYE el item marcado solo en otra sede", async () => {
    const t = convexTest(schema, modules);
    const { morichal } = await sembrarMenu(t);

    const menu = await t.query(api.items.listarMenu, { sedeId: morichal });

    // El caso que justifica toda la feature: lo que se vende solo en Dalia no
    // puede aparecer cuando el cliente eligio Morichal.
    expect(nombres(menu)).not.toContain("Solo Dalia");
    expect(nombres(menu)).toEqual(["Array vacio", "En las dos", "Sin sedeIds"]);
  });

  test("incluye el item marcado en varias sedes desde cualquiera de ellas", async () => {
    const t = convexTest(schema, modules);
    const { dalia, morichal } = await sembrarMenu(t);

    const enDalia = await t.query(api.items.listarMenu, { sedeId: dalia });
    const enMorichal = await t.query(api.items.listarMenu, { sedeId: morichal });

    expect(nombres(enDalia)).toContain("En las dos");
    expect(nombres(enMorichal)).toContain("En las dos");
  });

  test("el filtro por sede no pisa los filtros de activo y disponible", async () => {
    const t = convexTest(schema, modules);
    const { dalia } = await sembrarMenu(t);

    await t.run(async (ctx) => {
      const categoriaId = (await ctx.db.query("categorias").first())!._id;

      await ctx.db.insert("items", {
        categoriaId,
        nombre: "Agotado en Dalia",
        precio: 1000,
        disponible: false,
        activo: true,
        sedeIds: [dalia],
      });
      await ctx.db.insert("items", {
        categoriaId,
        nombre: "Fuera de carta en Dalia",
        precio: 1000,
        disponible: true,
        activo: false,
        sedeIds: [dalia],
      });
    });

    const menu = await t.query(api.items.listarMenu, { sedeId: dalia });

    // Estar marcado en la sede correcta no alcanza para aparecer: el producto
    // tambien tiene que estar activo Y disponible.
    expect(nombres(menu)).not.toContain("Agotado en Dalia");
    expect(nombres(menu)).not.toContain("Fuera de carta en Dalia");
  });
});

const ADMIN = { email: "admin@test.local", subject: "user_admin_test" };
const comoAdmin = (t: ReturnType<typeof convexTest>) => t.withIdentity(ADMIN);

const conCategoria = async (t: ReturnType<typeof convexTest>) =>
  await t.run(async (ctx) =>
    ctx.db.insert("categorias", { nombre: "Promos", orden: 1, activo: true })
  );

const crearPromo = async (
  t: ReturnType<typeof convexTest>,
  extra: Record<string, unknown> = {}
) => {
  const categoriaId = await conCategoria(t);

  return await comoAdmin(t).mutation(api.items.crear, {
    categoriaId,
    nombre: "Combo del día",
    precio: 25000,
    esPromo: true,
    ...extra,
  });
};

describe("items — promocion del dia", () => {
  test("una promo es un item normal: entra al menu como cualquier producto", async () => {
    const t = convexTest(schema, modules);
    await crearPromo(t);

    const menu = await t.query(api.items.listarMenu, {});

    // Esto es lo que habilita pedirla: si no estuviera en el menu, tampoco
    // podria entrar al carrito ni a un pedido.
    expect(nombres(menu)).toContain("Combo del día");
    expect(menu[0].esPromo).toBe(true);
  });

  test("guarda la ventana de vigencia tal cual", async () => {
    const t = convexTest(schema, modules);
    await crearPromo(t, { vigenteDesde: "2026-03-29", vigenteHasta: "2026-04-05" });

    const [promo] = await t.query(api.items.listarMenu, {});

    expect(promo.vigenteDesde).toBe("2026-03-29");
    expect(promo.vigenteHasta).toBe("2026-04-05");
  });

  test("rechaza una fecha con formato invalido", async () => {
    const t = convexTest(schema, modules);

    await expect(crearPromo(t, { vigenteDesde: "29/03/2026" })).rejects.toThrow(
      /YYYY-MM-DD/
    );
  });

  test("rechaza una ventana al reves", async () => {
    const t = convexTest(schema, modules);

    await expect(
      crearPromo(t, { vigenteDesde: "2026-04-05", vigenteHasta: "2026-03-29" })
    ).rejects.toThrow(/no puede ser posterior/);
  });

  test("una fecha vacia se guarda como sin fecha", async () => {
    const t = convexTest(schema, modules);
    // El <input type="date"> vacio manda "": tiene que significar "sin fecha",
    // no romper la validacion de formato.
    await crearPromo(t, { vigenteDesde: "", vigenteHasta: "" });

    const [promo] = await t.query(api.items.listarMenu, {});

    expect(promo.vigenteDesde).toBeUndefined();
    expect(promo.vigenteHasta).toBeUndefined();
  });

  test("se le puede SACAR la fecha a una promo que ya la tenia", async () => {
    const t = convexTest(schema, modules);
    const id = await crearPromo(t, { vigenteHasta: "2026-09-18" });

    await comoAdmin(t).mutation(api.items.actualizar, {
      id,
      campos: { vigenteHasta: "" },
    });

    const [promo] = await t.query(api.items.listarMenu, {});
    expect(promo.vigenteHasta).toBeUndefined();
  });

  test("editar solo el fin no borra el inicio que ya estaba", async () => {
    const t = convexTest(schema, modules);
    const id = await crearPromo(t, {
      vigenteDesde: "2026-09-01",
      vigenteHasta: "2026-09-10",
    });

    await comoAdmin(t).mutation(api.items.actualizar, {
      id,
      campos: { vigenteHasta: "2026-09-30" },
    });

    const [promo] = await t.query(api.items.listarMenu, {});
    // `undefined` en un patch borra el campo: si la mutation mandara las dos
    // fechas siempre, esta promo se quedaria sin inicio sin que nadie lo pida.
    expect(promo.vigenteDesde).toBe("2026-09-01");
    expect(promo.vigenteHasta).toBe("2026-09-30");
  });

  test("actualizar valida el estado FINAL, no solo lo que llega", async () => {
    const t = convexTest(schema, modules);
    const id = await crearPromo(t, { vigenteDesde: "2026-09-20" });

    // El `hasta` que llega es anterior al `desde` que ya estaba guardado.
    await expect(
      comoAdmin(t).mutation(api.items.actualizar, {
        id,
        campos: { vigenteHasta: "2026-09-10" },
      })
    ).rejects.toThrow(/no puede ser posterior/);
  });

  test("listarMenu NO filtra por fecha: eso lo decide el cliente", async () => {
    const t = convexTest(schema, modules);
    await crearPromo(t, { vigenteHasta: "2020-01-01" });

    // A proposito: Convex corre en UTC y en Colombia (UTC-5) el server ya esta
    // en el dia siguiente desde las 19:00, asi que filtrar la fecha aca
    // apagaria las promos del dia en plena hora pico. El filtro vive en
    // src/utils/vigencia.js, con la hora local del navegador.
    expect(await t.query(api.items.listarMenu, {})).toHaveLength(1);
  });
});
