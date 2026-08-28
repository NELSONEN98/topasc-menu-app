import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

const ADMIN = { email: "admin@test.local", subject: "user_admin_test" };

const comoAdmin = (t: ReturnType<typeof convexTest>) => t.withIdentity(ADMIN);

/**
 * Inserta categorias saltandose las mutations.
 *
 * Es a proposito: para probar el ORDEN hace falta que la fecha de creacion
 * y el campo `orden` NO coincidan, y `crear` siempre las deja alineadas.
 */
const sembrar = async (
  t: ReturnType<typeof convexTest>,
  filas: { nombre: string; orden: number; activo?: boolean }[]
) =>
  await t.run(async (ctx) => {
    for (const fila of filas) {
      await ctx.db.insert("categorias", {
        nombre: fila.nombre,
        orden: fila.orden,
        activo: fila.activo ?? true,
      });
    }
  });

const nombres = (categorias: { nombre: string }[]) => categorias.map((c) => c.nombre);

describe("categorias.listar — ordena por `orden`, no por fecha de creacion", () => {
  test("respeta `orden` aunque contradiga el orden de insercion", async () => {
    const t = convexTest(schema, modules);

    // Se insertan al reves de como deben mostrarse. Esta es la prueba que
    // fallaba antes: la query usaba `.order("asc", (q) => q.field("orden"))`,
    // y ese segundo argumento no existe en Convex, asi que se descartaba y
    // todo salia por `_creationTime`.
    await sembrar(t, [
      { nombre: "Postres", orden: 3 },
      { nombre: "Salchipapas", orden: 1 },
      { nombre: "Bebidas", orden: 2 },
    ]);

    const categorias = await t.query(api.categorias.listar, {});

    expect(nombres(categorias)).toEqual(["Salchipapas", "Bebidas", "Postres"]);
  });

  test("deja afuera las inactivas sin alterar el orden del resto", async () => {
    const t = convexTest(schema, modules);
    await sembrar(t, [
      { nombre: "Postres", orden: 3 },
      { nombre: "Salchipapas", orden: 1 },
      { nombre: "Bebidas", orden: 2, activo: false },
    ]);

    const categorias = await t.query(api.categorias.listar, {});

    expect(nombres(categorias)).toEqual(["Salchipapas", "Postres"]);
  });

  test("listarTodas incluye las inactivas y tambien ordena por `orden`", async () => {
    const t = convexTest(schema, modules);
    await sembrar(t, [
      { nombre: "Postres", orden: 3 },
      { nombre: "Salchipapas", orden: 1 },
      { nombre: "Bebidas", orden: 2, activo: false },
    ]);

    const categorias = await comoAdmin(t).query(api.categorias.listarTodas, {});

    expect(nombres(categorias)).toEqual(["Salchipapas", "Bebidas", "Postres"]);
  });
});

describe("categorias.reordenar", () => {
  test("reescribe el orden y el menu sale en la secuencia nueva", async () => {
    const t = convexTest(schema, modules);
    await sembrar(t, [
      { nombre: "Salchipapas", orden: 1 },
      { nombre: "Bebidas", orden: 2 },
      { nombre: "Postres", orden: 3 },
    ]);

    const antes = await comoAdmin(t).query(api.categorias.listarTodas, {});
    const [salchipapas, bebidas, postres] = antes;

    await comoAdmin(t).mutation(api.categorias.reordenar, {
      ids: [postres._id, salchipapas._id, bebidas._id],
    });

    const despues = await t.query(api.categorias.listar, {});

    expect(nombres(despues)).toEqual(["Postres", "Salchipapas", "Bebidas"]);
    // Las posiciones quedan compactas desde 1, sin huecos ni empates.
    expect(despues.map((c) => c.orden)).toEqual([1, 2, 3]);
  });

  test("mueve tambien las inactivas, que siguen contando para el orden", async () => {
    const t = convexTest(schema, modules);
    await sembrar(t, [
      { nombre: "Salchipapas", orden: 1 },
      { nombre: "Bebidas", orden: 2, activo: false },
      { nombre: "Postres", orden: 3 },
    ]);

    const antes = await comoAdmin(t).query(api.categorias.listarTodas, {});
    const [salchipapas, bebidas, postres] = antes;

    await comoAdmin(t).mutation(api.categorias.reordenar, {
      ids: [bebidas._id, postres._id, salchipapas._id],
    });

    const todas = await comoAdmin(t).query(api.categorias.listarTodas, {});

    expect(nombres(todas)).toEqual(["Bebidas", "Postres", "Salchipapas"]);
    // El menu publico saltea la inactiva pero conserva el orden relativo.
    const publicas = await t.query(api.categorias.listar, {});
    expect(nombres(publicas)).toEqual(["Postres", "Salchipapas"]);
  });

  test("rechaza una lista incompleta en vez de dejar ordenes chocando", async () => {
    const t = convexTest(schema, modules);
    await sembrar(t, [
      { nombre: "Salchipapas", orden: 1 },
      { nombre: "Bebidas", orden: 2 },
      { nombre: "Postres", orden: 3 },
    ]);

    const antes = await comoAdmin(t).query(api.categorias.listarTodas, {});

    await expect(
      comoAdmin(t).mutation(api.categorias.reordenar, {
        ids: [antes[1]._id, antes[0]._id],
      })
    ).rejects.toThrow(/3 categorias/);

    // Y no toco nada: el rechazo es total, no a medias.
    const despues = await comoAdmin(t).query(api.categorias.listarTodas, {});
    expect(nombres(despues)).toEqual(["Salchipapas", "Bebidas", "Postres"]);
  });

  test("rechaza ids repetidos", async () => {
    const t = convexTest(schema, modules);
    await sembrar(t, [
      { nombre: "Salchipapas", orden: 1 },
      { nombre: "Bebidas", orden: 2 },
    ]);

    const antes = await comoAdmin(t).query(api.categorias.listarTodas, {});

    await expect(
      comoAdmin(t).mutation(api.categorias.reordenar, {
        ids: [antes[0]._id, antes[0]._id],
      })
    ).rejects.toThrow(/repetidas/);
  });

  test("un visitante sin sesion de admin no puede reordenar el menu", async () => {
    const t = convexTest(schema, modules);
    await sembrar(t, [
      { nombre: "Salchipapas", orden: 1 },
      { nombre: "Bebidas", orden: 2 },
    ]);

    const antes = await comoAdmin(t).query(api.categorias.listarTodas, {});

    await expect(
      t.mutation(api.categorias.reordenar, {
        ids: [antes[1]._id, antes[0]._id],
      })
    ).rejects.toThrow();
  });
});
