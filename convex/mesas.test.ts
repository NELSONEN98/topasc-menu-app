import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

const ADMIN = { email: "admin@test.local", subject: "user_admin_test" };

const comoAdmin = (t: ReturnType<typeof convexTest>) => t.withIdentity(ADMIN);

const crearSede = async (t: ReturnType<typeof convexTest>, nombre: string, whatsapp: string) =>
  await comoAdmin(t).mutation(api.sedes.crear, { nombre, whatsapp });

describe("mesas.porCodigo — resuelve la sede del QR", () => {
  test("devuelve la mesa con su sede resuelta, no solo el id", async () => {
    const t = convexTest(schema, modules);
    const sedeId = await crearSede(t, "Sede Morichal", "573111111111");
    await comoAdmin(t).mutation(api.mesas.crear, { numero: "5", codigo: "ABC123", sedeId });

    const mesa = await t.query(api.mesas.porCodigo, { codigo: "ABC123" });

    // Es lo que hace que el pedido por QR llegue al WhatsApp del local correcto
    // y que el menu se filtre por esa sede.
    expect(mesa!.numero).toBe("5");
    expect(mesa!.sede!.nombre).toBe("Sede Morichal");
    expect(mesa!.sede!.whatsapp).toBe("573111111111");
  });

  test("una mesa sin sede devuelve sede null en vez de romperse", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      // Mesa anterior al campo `sedeId`.
      await ctx.db.insert("mesas", { numero: "9", codigo: "VIEJA1", activo: true });
    });

    const mesa = await t.query(api.mesas.porCodigo, { codigo: "VIEJA1" });

    // La app cae al comportamiento de siempre: menu completo y numero de
    // respaldo. Degradado, pero no roto.
    expect(mesa!.sede).toBeNull();
  });

  test("una sede desactivada NO anula la mesa", async () => {
    const t = convexTest(schema, modules);
    const sedeId = await crearSede(t, "Sede Morichal", "573111111111");
    await comoAdmin(t).mutation(api.mesas.crear, { numero: "5", codigo: "ABC123", sedeId });
    await comoAdmin(t).mutation(api.sedes.actualizar, {
      id: sedeId,
      campos: { activo: false },
    });

    const mesa = await t.query(api.mesas.porCodigo, { codigo: "ABC123" });

    // Apagar una sede la saca del selector (domicilio y recoger), pero quien ya
    // esta sentado en la mesa tiene que poder pedir, y su pedido tiene que
    // llegar a ESE local. Para cortar el QR esta el `activo` de la mesa.
    expect(mesa!.sede!.nombre).toBe("Sede Morichal");
  });

  test("una mesa inactiva devuelve null", async () => {
    const t = convexTest(schema, modules);
    const sedeId = await crearSede(t, "Sede Dalia", "573111111111");
    const id = await comoAdmin(t).mutation(api.mesas.crear, {
      numero: "5",
      codigo: "ABC123",
      sedeId,
    });
    await comoAdmin(t).mutation(api.mesas.actualizar, { id, campos: { activo: false } });

    expect(await t.query(api.mesas.porCodigo, { codigo: "ABC123" })).toBeNull();
  });

  test("un codigo inexistente devuelve null", async () => {
    const t = convexTest(schema, modules);

    expect(await t.query(api.mesas.porCodigo, { codigo: "NOEXISTE" })).toBeNull();
  });
});

describe("mesas.crear", () => {
  test("exige sesion de admin", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.mesas.crear, { numero: "5" })
    ).rejects.toThrow(/No autorizado/);
  });

  test("rechaza el numero vacio", async () => {
    const t = convexTest(schema, modules);

    await expect(
      comoAdmin(t).mutation(api.mesas.crear, { numero: "   " })
    ).rejects.toThrow(/numero de la mesa no puede estar vacio/);
  });

  test("genera un codigo si no se le pasa uno", async () => {
    const t = convexTest(schema, modules);
    const sedeId = await crearSede(t, "Sede Dalia", "573111111111");
    const id = await comoAdmin(t).mutation(api.mesas.crear, { numero: "7", sedeId });

    const mesa = await t.run(async (ctx) => await ctx.db.get(id));

    // El token del QR tiene que ser impredecible: lo genera el servidor, no el
    // formulario.
    expect(mesa!.codigo).toMatch(/^[A-Z2-9]{6}$/);
  });

  test("guarda la sede que se le indica", async () => {
    const t = convexTest(schema, modules);
    const sedeId = await crearSede(t, "Sede Morichal", "573111111111");
    const id = await comoAdmin(t).mutation(api.mesas.crear, { numero: "7", sedeId });

    const mesa = await t.run(async (ctx) => await ctx.db.get(id));
    expect(mesa!.sedeId).toBe(sedeId);
  });

  test("la mesa nace activa", async () => {
    const t = convexTest(schema, modules);
    const id = await comoAdmin(t).mutation(api.mesas.crear, { numero: "7" });

    const mesa = await t.run(async (ctx) => await ctx.db.get(id));
    expect(mesa!.activo).toBe(true);
  });
});

describe("mesas — el numero es unico POR SEDE", () => {
  test("rechaza dos mesas con el mismo numero en el mismo local", async () => {
    const t = convexTest(schema, modules);
    const dalia = await crearSede(t, "Sede Dalia", "573111111111");
    await comoAdmin(t).mutation(api.mesas.crear, { numero: "1", sedeId: dalia });

    // El mozo no sabria a cual llevarle el pedido, y en el historial los dos
    // dirian "Mesa 1" de la misma sede.
    await expect(
      comoAdmin(t).mutation(api.mesas.crear, { numero: "1", sedeId: dalia })
    ).rejects.toThrow(/Ya existe una mesa 1 en esa sede/);
  });

  test("PERMITE el mismo numero en sedes distintas", async () => {
    const t = convexTest(schema, modules);
    const dalia = await crearSede(t, "Sede Dalia", "573111111111");
    const morichal = await crearSede(t, "Sede Morichal", "573222222222");

    await comoAdmin(t).mutation(api.mesas.crear, { numero: "1", sedeId: dalia });

    // Cada local numera sus mesas 1..N: "Mesa 1" en dos locales son dos mesas
    // distintas y legitimas.
    await expect(
      comoAdmin(t).mutation(api.mesas.crear, { numero: "1", sedeId: morichal })
    ).resolves.toBeDefined();
  });

  test("ignora espacios y mayusculas al comparar", async () => {
    const t = convexTest(schema, modules);
    const dalia = await crearSede(t, "Sede Dalia", "573111111111");
    await comoAdmin(t).mutation(api.mesas.crear, { numero: "Terraza", sedeId: dalia });

    // Sin normalizar, dos etiquetas que la gente lee igual entrarian como
    // distintas.
    await expect(
      comoAdmin(t).mutation(api.mesas.crear, { numero: "  terraza  ", sedeId: dalia })
    ).rejects.toThrow(/Ya existe una mesa/);
  });

  test("dos mesas sin sede con el mismo numero tambien chocan", async () => {
    const t = convexTest(schema, modules);
    await comoAdmin(t).mutation(api.mesas.crear, { numero: "1" });

    // Son las anteriores al campo: dos sin asignar con el mismo numero tambien
    // serian indistinguibles.
    await expect(
      comoAdmin(t).mutation(api.mesas.crear, { numero: "1" })
    ).rejects.toThrow(/Ya existe una mesa/);
  });

  test("al editar, rechaza tomar el numero de otra mesa de su sede", async () => {
    const t = convexTest(schema, modules);
    const dalia = await crearSede(t, "Sede Dalia", "573111111111");
    await comoAdmin(t).mutation(api.mesas.crear, { numero: "1", sedeId: dalia });
    const id = await comoAdmin(t).mutation(api.mesas.crear, { numero: "2", sedeId: dalia });

    await expect(
      comoAdmin(t).mutation(api.mesas.actualizar, { id, campos: { numero: "1" } })
    ).rejects.toThrow(/Ya existe una mesa 1 en esa sede/);
  });

  test("una mesa no choca consigo misma al guardarse sin cambios", async () => {
    const t = convexTest(schema, modules);
    const dalia = await crearSede(t, "Sede Dalia", "573111111111");
    const id = await comoAdmin(t).mutation(api.mesas.crear, { numero: "5", sedeId: dalia });

    // Si el chequeo no se ignorara a si mismo, editar solo el estado seria
    // imposible.
    await expect(
      comoAdmin(t).mutation(api.mesas.actualizar, {
        id,
        campos: { numero: "5", activo: false },
      })
    ).resolves.not.toThrow();
  });

  test("MOVER una mesa a un local que ya tiene ese numero se rechaza", async () => {
    const t = convexTest(schema, modules);
    const dalia = await crearSede(t, "Sede Dalia", "573111111111");
    const morichal = await crearSede(t, "Sede Morichal", "573222222222");

    await comoAdmin(t).mutation(api.mesas.crear, { numero: "1", sedeId: dalia });
    const id = await comoAdmin(t).mutation(api.mesas.crear, { numero: "1", sedeId: morichal });

    // El numero no cambia, pero el duplicado se crea igual: la guarda tiene que
    // mirar como va a QUEDAR la mesa, no lo que se esta mandando.
    await expect(
      comoAdmin(t).mutation(api.mesas.actualizar, { id, campos: { sedeId: dalia } })
    ).rejects.toThrow(/Ya existe una mesa 1 en esa sede/);
  });

  test("mover a un local donde ese numero esta libre funciona", async () => {
    const t = convexTest(schema, modules);
    const dalia = await crearSede(t, "Sede Dalia", "573111111111");
    const morichal = await crearSede(t, "Sede Morichal", "573222222222");

    await comoAdmin(t).mutation(api.mesas.crear, { numero: "1", sedeId: dalia });
    const id = await comoAdmin(t).mutation(api.mesas.crear, { numero: "7", sedeId: morichal });

    await comoAdmin(t).mutation(api.mesas.actualizar, { id, campos: { sedeId: dalia } });

    const mesa = await t.run(async (ctx) => await ctx.db.get(id));
    expect(mesa!.sedeId).toBe(dalia);
  });

  test("asignarle sede a una mesa vieja falla si ese numero ya existe alla", async () => {
    const t = convexTest(schema, modules);
    const dalia = await crearSede(t, "Sede Dalia", "573111111111");
    await comoAdmin(t).mutation(api.mesas.crear, { numero: "3", sedeId: dalia });

    const vieja = await t.run(async (ctx) =>
      await ctx.db.insert("mesas", { numero: "3", codigo: "VIEJA1", activo: true })
    );

    // Es el caso real: las mesas de produccion no tienen sede y hay que
    // asignarselas una por una.
    await expect(
      comoAdmin(t).mutation(api.mesas.actualizar, { id: vieja, campos: { sedeId: dalia } })
    ).rejects.toThrow(/Ya existe una mesa 3 en esa sede/);
  });
});

describe("mesas.actualizar", () => {
  test("permite mover una mesa de sede", async () => {
    const t = convexTest(schema, modules);
    const dalia = await crearSede(t, "Sede Dalia", "573111111111");
    const morichal = await crearSede(t, "Sede Morichal", "573222222222");
    const id = await comoAdmin(t).mutation(api.mesas.crear, {
      numero: "5",
      codigo: "ABC123",
      sedeId: dalia,
    });

    await comoAdmin(t).mutation(api.mesas.actualizar, {
      id,
      campos: { sedeId: morichal },
    });

    const mesa = await t.query(api.mesas.porCodigo, { codigo: "ABC123" });
    expect(mesa!.sede!.nombre).toBe("Sede Morichal");
  });

  test("asignarle sede a una mesa vieja arregla su ruteo", async () => {
    const t = convexTest(schema, modules);
    const sedeId = await crearSede(t, "Sede Morichal", "573222222222");
    const id = await t.run(async (ctx) =>
      await ctx.db.insert("mesas", { numero: "9", codigo: "VIEJA1", activo: true })
    );

    expect((await t.query(api.mesas.porCodigo, { codigo: "VIEJA1" }))!.sede).toBeNull();

    await comoAdmin(t).mutation(api.mesas.actualizar, { id, campos: { sedeId } });

    const mesa = await t.query(api.mesas.porCodigo, { codigo: "VIEJA1" });
    expect(mesa!.sede!.whatsapp).toBe("573222222222");
  });

  test("rechaza dejar la mesa sin numero", async () => {
    const t = convexTest(schema, modules);
    const id = await comoAdmin(t).mutation(api.mesas.crear, { numero: "5" });

    await expect(
      comoAdmin(t).mutation(api.mesas.actualizar, { id, campos: { numero: "  " } })
    ).rejects.toThrow(/numero de la mesa no puede estar vacio/);
  });

  test("exige sesion de admin", async () => {
    const t = convexTest(schema, modules);
    const id = await comoAdmin(t).mutation(api.mesas.crear, { numero: "5" });

    await expect(
      t.mutation(api.mesas.actualizar, { id, campos: { activo: false } })
    ).rejects.toThrow(/No autorizado/);
  });
});

describe("mesas.borrar", () => {
  test("borra la mesa y su codigo deja de resolver", async () => {
    const t = convexTest(schema, modules);
    const id = await comoAdmin(t).mutation(api.mesas.crear, {
      numero: "5",
      codigo: "ABC123",
    });

    await comoAdmin(t).mutation(api.mesas.borrar, { id });

    expect(await t.query(api.mesas.porCodigo, { codigo: "ABC123" })).toBeNull();
  });

  test("el historial de pedidos sobrevive: mesaNumero es un snapshot", async () => {
    const t = convexTest(schema, modules);
    const id = await comoAdmin(t).mutation(api.mesas.crear, { numero: "5" });

    await t.mutation(api.pedidos.crear, {
      tipoPedido: "dine-in",
      mesaId: id,
      mesaNumero: "5",
      total: 18000,
      items: [],
    });

    await comoAdmin(t).mutation(api.mesas.borrar, { id });

    const [pedido] = await comoAdmin(t).query(api.pedidos.listarActivos, {});
    expect(pedido.mesaNumero).toBe("5");
  });

  test("exige sesion de admin", async () => {
    const t = convexTest(schema, modules);
    const id = await comoAdmin(t).mutation(api.mesas.crear, { numero: "5" });

    await expect(t.mutation(api.mesas.borrar, { id })).rejects.toThrow(/No autorizado/);
  });
});

describe("mesas.listar", () => {
  test("exige sesion: enumera todos los codigos de QR", async () => {
    const t = convexTest(schema, modules);

    await expect(t.query(api.mesas.listar, {})).rejects.toThrow(/No autorizado/);
  });
});
