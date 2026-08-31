import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

const ADMIN = { email: "admin@test.local", subject: "user_admin_test" };

const comoAdmin = (t: ReturnType<typeof convexTest>) => t.withIdentity(ADMIN);

const crear = async (
  t: ReturnType<typeof convexTest>,
  sabor: string,
  tamano: string,
  precio: number
) => await comoAdmin(t).mutation(api.presentacionesGaseosa.crear, { sabor, tamano, precio });

const etiquetas = (filas: { sabor: string; tamano: string }[]) =>
  filas.map((p) => `${p.sabor} ${p.tamano}`);

describe("presentacionesGaseosa.crear", () => {
  test("cada combinacion guarda su propio precio", async () => {
    const t = convexTest(schema, modules);

    await crear(t, "Coca Cola", "500 ml", 3000);
    await crear(t, "Coca Cola", "2 litros", 9000);
    await crear(t, "Postobon Manzana", "2 litros", 7500);

    const todas = await comoAdmin(t).query(api.presentacionesGaseosa.listarTodas, {});

    // El mismo tamaño con distinto sabor puede costar distinto: es
    // exactamente lo que la tabla plana permite y una tabla de tamaños no.
    const dosLitros = todas.filter((p) => p.tamano === "2 litros");
    expect(dosLitros.map((p) => p.precio).sort()).toEqual([7500, 9000]);
  });

  test("rechaza repetir la misma combinacion de sabor y tamaño", async () => {
    const t = convexTest(schema, modules);
    await crear(t, "Coca Cola", "2 litros", 9000);

    // Dos filas identicas dejarian al cliente con dos botones iguales que
    // cobran distinto.
    await expect(crear(t, "coca cola", "  2 LITROS  ", 8000)).rejects.toThrow(/Ya existe/);
  });

  test("recorta los espacios de sabor y tamaño", async () => {
    const t = convexTest(schema, modules);
    await crear(t, "  Coca Cola  ", "  1 litro ", 6000);

    const todas = await comoAdmin(t).query(api.presentacionesGaseosa.listarTodas, {});

    expect(etiquetas(todas)).toEqual(["Coca Cola 1 litro"]);
  });

  test("rechaza sabor vacio, tamaño vacio y precio negativo", async () => {
    const t = convexTest(schema, modules);

    await expect(crear(t, "   ", "2 litros", 9000)).rejects.toThrow(/sabor/i);
    await expect(crear(t, "Coca Cola", "  ", 9000)).rejects.toThrow(/tamaño/i);
    await expect(crear(t, "Coca Cola", "2 litros", -1)).rejects.toThrow(/precio/i);
  });

  test("un visitante sin sesion de admin no puede crear presentaciones", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.presentacionesGaseosa.crear, {
        sabor: "Coca Cola",
        tamano: "2 litros",
        precio: 9000,
      })
    ).rejects.toThrow();
  });
});

describe("presentacionesGaseosa.listarDisponibles", () => {
  test("el cliente no ve las agotadas", async () => {
    const t = convexTest(schema, modules);
    const id = await crear(t, "Coca Cola", "500 ml", 3000);
    await crear(t, "Coca Cola", "2 litros", 9000);

    await comoAdmin(t).mutation(api.presentacionesGaseosa.actualizar, {
      id,
      campos: { disponible: false },
    });

    const publicas = await t.query(api.presentacionesGaseosa.listarDisponibles, {});

    // Se agoto la de 500: desaparece del menu pero la fila y su precio quedan.
    expect(etiquetas(publicas)).toEqual(["Coca Cola 2 litros"]);
    const todas = await comoAdmin(t).query(api.presentacionesGaseosa.listarTodas, {});
    expect(todas).toHaveLength(2);
  });

  test("vuelve en el orden de carga", async () => {
    const t = convexTest(schema, modules);
    await crear(t, "Coca Cola", "500 ml", 3000);
    await crear(t, "Coca Cola", "2 litros", 9000);
    await crear(t, "Postobon Manzana", "500 ml", 2500);

    const publicas = await t.query(api.presentacionesGaseosa.listarDisponibles, {});

    expect(etiquetas(publicas)).toEqual([
      "Coca Cola 500 ml",
      "Coca Cola 2 litros",
      "Postobon Manzana 500 ml",
    ]);
  });
});

describe("presentacionesGaseosa.actualizar", () => {
  test("cambiar solo el tamaño tambien choca contra una fila existente", async () => {
    const t = convexTest(schema, modules);
    await crear(t, "Coca Cola", "500 ml", 3000);
    const dosLitros = await crear(t, "Coca Cola", "2 litros", 9000);

    // La validacion mira la combinacion RESULTANTE, no solo lo que llego.
    await expect(
      comoAdmin(t).mutation(api.presentacionesGaseosa.actualizar, {
        id: dosLitros,
        campos: { tamano: "500 ml" },
      })
    ).rejects.toThrow(/Ya existe/);
  });

  test("cambiar el precio no toca sabor ni tamaño", async () => {
    const t = convexTest(schema, modules);
    const id = await crear(t, "Coca Cola", "2 litros", 9000);

    await comoAdmin(t).mutation(api.presentacionesGaseosa.actualizar, {
      id,
      campos: { precio: 9500 },
    });

    const todas = await comoAdmin(t).query(api.presentacionesGaseosa.listarTodas, {});

    expect(todas[0].sabor).toBe("Coca Cola");
    expect(todas[0].tamano).toBe("2 litros");
    expect(todas[0].precio).toBe(9500);
  });

  test("un visitante sin sesion de admin no puede cambiar precios", async () => {
    const t = convexTest(schema, modules);
    const id = await crear(t, "Coca Cola", "2 litros", 9000);

    await expect(
      t.mutation(api.presentacionesGaseosa.actualizar, { id, campos: { precio: 1 } })
    ).rejects.toThrow();
  });
});

describe("pedidos con presentacion", () => {
  test("el pedido guarda sabor y tamaño congelados, no el id", async () => {
    const t = convexTest(schema, modules);
    const presentacionId = await crear(t, "Coca Cola", "2 litros", 9000);

    const itemId = await t.run(async (ctx) => {
      const categoriaId = await ctx.db.insert("categorias", {
        nombre: "GASEOSAS",
        orden: 1,
        activo: true,
      });
      return await ctx.db.insert("items", {
        categoriaId,
        nombre: "Gaseosa",
        precio: 3000,
        disponible: true,
        activo: true,
        llevaPresentacion: true,
      });
    });

    await t.mutation(api.pedidos.crear, {
      tipoPedido: "dine-in",
      total: 9000,
      items: [
        {
          itemId,
          nombreSnapshot: "Gaseosa",
          // El precio de la linea es el de la combinacion, NO el del item.
          precioSnapshot: 9000,
          cantidad: 1,
          presentacion: { sabor: "Coca Cola", tamano: "2 litros" },
        },
      ],
    });

    // Se borra la presentacion despues de vendida.
    await comoAdmin(t).mutation(api.presentacionesGaseosa.borrar, { id: presentacionId });

    const pedidos = await t.run(async (ctx) => await ctx.db.query("pedidos").collect());

    // El historico sigue diciendo la verdad aunque la fila ya no exista.
    expect(pedidos[0].items[0].presentacion).toEqual({
      sabor: "Coca Cola",
      tamano: "2 litros",
    });
    expect(pedidos[0].items[0].precioSnapshot).toBe(9000);
  });
});
