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
