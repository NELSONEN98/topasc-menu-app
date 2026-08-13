import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

const ADMIN = { email: "admin@test.local", subject: "user_admin_test" };

const comoAdmin = (t: ReturnType<typeof convexTest>) => t.withIdentity(ADMIN);

describe("pedidos.crear — la sede queda registrada", () => {
  test("guarda el id y el nombre de la sede", async () => {
    const t = convexTest(schema, modules);
    const sedeId = await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Dalia",
      whatsapp: "573000000001",
    });

    await t.mutation(api.pedidos.crear, {
      tipoPedido: "delivery",
      sedeId,
      sedeNombre: "Sede Dalia",
      total: 25000,
      items: [],
    });

    const [pedido] = await comoAdmin(t).query(api.pedidos.listarActivos, {});

    expect(pedido.sedeId).toBe(sedeId);
    expect(pedido.sedeNombre).toBe("Sede Dalia");
  });

  test("el nombre es un snapshot: renombrar la sede no reescribe el historial", async () => {
    const t = convexTest(schema, modules);
    const sedeId = await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Dalia",
      whatsapp: "573000000001",
    });

    await t.mutation(api.pedidos.crear, {
      tipoPedido: "pickup",
      sedeId,
      sedeNombre: "Sede Dalia",
      total: 18000,
      items: [],
    });

    await comoAdmin(t).mutation(api.sedes.actualizar, {
      id: sedeId,
      campos: { nombre: "Sede Centro" },
    });

    const [pedido] = await comoAdmin(t).query(api.pedidos.listarActivos, {});

    // Este es el motivo de guardar el par id + nombre en vez del id solo: un
    // join contra `sedes` devolveria "Sede Centro", que no es el local al que
    // se hizo este pedido.
    expect(pedido.sedeNombre).toBe("Sede Dalia");
  });

  test("un pedido sin sede (flujo por QR) se guarda igual", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.pedidos.crear, {
      tipoPedido: "dine-in",
      mesaNumero: "5",
      total: 18000,
      items: [],
    });

    const [pedido] = await comoAdmin(t).query(api.pedidos.listarActivos, {});

    // Las mesas todavia no guardan sede. El pedido no puede perderse por eso:
    // entra sin local asociado y en el admin se muestra con un guion.
    expect(pedido.sedeId).toBeUndefined();
    expect(pedido.sedeNombre).toBeUndefined();
    expect(pedido.mesaNumero).toBe("5");
  });

  test("nace en estado recibido", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.pedidos.crear, {
      tipoPedido: "pickup",
      total: 18000,
      items: [],
    });

    const [pedido] = await comoAdmin(t).query(api.pedidos.listarActivos, {});

    expect(pedido.estado).toBe("recibido");
  });
});

describe("pedidos — lectura protegida", () => {
  test("listarActivos exige sesion: los pedidos traen datos del cliente", async () => {
    const t = convexTest(schema, modules);

    await expect(t.query(api.pedidos.listarActivos, {})).rejects.toThrow(
      /No autorizado/
    );
  });

  test("listarPorEstado exige sesion", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.query(api.pedidos.listarPorEstado, { estado: "completado" })
    ).rejects.toThrow(/No autorizado/);
  });

  test("crear NO exige sesion: la hace el cliente sin cuenta", async () => {
    const t = convexTest(schema, modules);

    // Es la unica escritura abierta del sistema, y tiene que seguir siendolo:
    // exigir login aca romperia el producto entero.
    await expect(
      t.mutation(api.pedidos.crear, {
        tipoPedido: "pickup",
        total: 18000,
        items: [],
      })
    ).resolves.toBeDefined();
  });
});
