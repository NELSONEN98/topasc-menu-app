import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

// Tiene que coincidir con ADMIN_EMAILS de vitest.config.js: guardias.ts arma
// la allowlist al importarse y compara contra el email de la identidad.
const ADMIN = { email: "admin@test.local", subject: "user_admin_test" };

const comoAdmin = (t: ReturnType<typeof convexTest>) => t.withIdentity(ADMIN);

describe("sedes — lectura", () => {
  test("listar solo devuelve las activas", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("sedes", {
        nombre: "Activa",
        whatsapp: "573000000001",
        activo: true,
      });
      await ctx.db.insert("sedes", {
        nombre: "Apagada",
        whatsapp: "573000000002",
        activo: false,
      });
    });

    const sedes = await t.query(api.sedes.listar, {});

    // Es la query que alimenta la pantalla de eleccion del cliente: apagar una
    // sede tiene que sacarla de ahi.
    expect(sedes.map((s) => s.nombre)).toEqual(["Activa"]);
  });

  test("listarTodas exige sesion", async () => {
    const t = convexTest(schema, modules);

    await expect(t.query(api.sedes.listarTodas, {})).rejects.toThrow(
      /No autorizado/
    );
  });

  test("listarTodas incluye las inactivas para poder reactivarlas", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("sedes", {
        nombre: "Apagada",
        whatsapp: "573000000002",
        activo: false,
      });
    });

    const sedes = await comoAdmin(t).query(api.sedes.listarTodas, {});

    expect(sedes.map((s) => s.nombre)).toEqual(["Apagada"]);
  });
});

describe("sedes.crear — validaciones", () => {
  test("exige sesion de admin", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.sedes.crear, {
        nombre: "Sede Trucha",
        whatsapp: "573000000001",
      })
    ).rejects.toThrow(/No autorizado/);
  });

  test("rechaza el nombre vacio", async () => {
    const t = convexTest(schema, modules);

    await expect(
      comoAdmin(t).mutation(api.sedes.crear, {
        nombre: "   ",
        whatsapp: "573000000001",
      })
    ).rejects.toThrow(/nombre de la sede no puede estar vacio/);
  });

  test("rechaza un nombre repetido sin importar mayusculas ni espacios", async () => {
    const t = convexTest(schema, modules);
    await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Dalia",
      whatsapp: "573000000001",
    });

    // El nombre es la identidad visible de la sede y viaja como snapshot en
    // cada pedido: dos iguales son indistinguibles en el historial.
    await expect(
      comoAdmin(t).mutation(api.sedes.crear, {
        nombre: "  sede dalia  ",
        whatsapp: "573000000002",
      })
    ).rejects.toThrow(/Ya existe una sede/);
  });

  test("rechaza un whatsapp sin ningun digito", async () => {
    const t = convexTest(schema, modules);

    await expect(
      comoAdmin(t).mutation(api.sedes.crear, {
        nombre: "Sede Sin Numero",
        whatsapp: "+ - ()",
      })
    ).rejects.toThrow(/WhatsApp de la sede no puede estar vacio/);
  });

  test("normaliza el whatsapp a solo digitos", async () => {
    const t = convexTest(schema, modules);
    await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Dalia",
      whatsapp: "+57 (320) 687-3870",
    });

    const sedes = await t.query(api.sedes.listar, {});

    // wa.me arma un link roto con cualquier cosa que no sea un digito.
    expect(sedes[0].whatsapp).toBe("573206873870");
  });

  test("una direccion vacia se guarda ausente, no como string vacio", async () => {
    const t = convexTest(schema, modules);
    await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Morichal",
      whatsapp: "573000000001",
      direccion: "   ",
    });

    const sedes = await t.query(api.sedes.listar, {});

    // Con "" el front dibujaria una linea de direccion en blanco bajo el
    // nombre; con el campo ausente simplemente no la dibuja.
    expect(sedes[0].direccion).toBeUndefined();
  });

  test("la sede nace activa", async () => {
    const t = convexTest(schema, modules);
    await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Nueva",
      whatsapp: "573000000001",
    });

    const sedes = await t.query(api.sedes.listar, {});

    expect(sedes[0].activo).toBe(true);
  });
});

describe("sedes.actualizar", () => {
  test("deja guardar una sede conservando su propio nombre", async () => {
    const t = convexTest(schema, modules);
    const id = await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Dalia",
      whatsapp: "573000000001",
    });

    // El chequeo de nombre repetido tiene que ignorarse a si mismo, o editar
    // solo la direccion seria imposible.
    await comoAdmin(t).mutation(api.sedes.actualizar, {
      id,
      campos: { nombre: "Sede Dalia", direccion: "Carrera 8 # 18-203" },
    });

    const sedes = await t.query(api.sedes.listar, {});
    expect(sedes[0].direccion).toBe("Carrera 8 # 18-203");
  });

  test("rechaza tomar el nombre de otra sede", async () => {
    const t = convexTest(schema, modules);
    await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Dalia",
      whatsapp: "573000000001",
    });
    const morichal = await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Morichal",
      whatsapp: "573000000002",
    });

    await expect(
      comoAdmin(t).mutation(api.sedes.actualizar, {
        id: morichal,
        campos: { nombre: "Sede Dalia" },
      })
    ).rejects.toThrow(/Ya existe una sede/);
  });

  test("vaciar la direccion borra el campo", async () => {
    const t = convexTest(schema, modules);
    const id = await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Dalia",
      whatsapp: "573000000001",
      direccion: "Carrera 8 # 18-203",
    });

    await comoAdmin(t).mutation(api.sedes.actualizar, {
      id,
      campos: { direccion: "" },
    });

    const sedes = await t.query(api.sedes.listar, {});
    expect(sedes[0].direccion).toBeUndefined();
  });

  test("rechaza dejar la sede sin whatsapp", async () => {
    const t = convexTest(schema, modules);
    const id = await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Dalia",
      whatsapp: "573000000001",
    });

    await expect(
      comoAdmin(t).mutation(api.sedes.actualizar, {
        id,
        campos: { whatsapp: "sin numeros" },
      })
    ).rejects.toThrow(/WhatsApp de la sede no puede estar vacio/);
  });
});

describe("sedes.borrar — guardas de integridad", () => {
  test("bloquea si un producto tiene la sede marcada", async () => {
    const t = convexTest(schema, modules);
    const sedeId = await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Dalia",
      whatsapp: "573000000001",
    });

    await t.run(async (ctx) => {
      const categoriaId = await ctx.db.insert("categorias", {
        nombre: "Salchipapas",
        orden: 1,
        activo: true,
      });
      await ctx.db.insert("items", {
        categoriaId,
        nombre: "Exclusiva Dalia",
        precio: 18000,
        disponible: true,
        activo: true,
        sedeIds: [sedeId],
      });
    });

    // Borrarla dejaria el id colgado dentro de `sedeIds`: un producto que se
    // vendia solo ahi desapareceria de todos los menus sin aviso.
    await expect(
      comoAdmin(t).mutation(api.sedes.borrar, { id: sedeId })
    ).rejects.toThrow(/No se puede eliminar/);
  });

  test("un producto sin sedeIds no bloquea el borrado", async () => {
    const t = convexTest(schema, modules);
    const sedeId = await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Dalia",
      whatsapp: "573000000001",
    });

    await t.run(async (ctx) => {
      const categoriaId = await ctx.db.insert("categorias", {
        nombre: "Salchipapas",
        orden: 1,
        activo: true,
      });
      // Se ve en todas las sedes por el fallback, pero no apunta a ninguna:
      // borrar una sede no lo deja huerfano.
      await ctx.db.insert("items", {
        categoriaId,
        nombre: "Clasica",
        precio: 18000,
        disponible: true,
        activo: true,
      });
    });

    await comoAdmin(t).mutation(api.sedes.borrar, { id: sedeId });

    expect(await t.query(api.sedes.listar, {})).toEqual([]);
  });

  test("un pedido viejo NO bloquea el borrado: guarda el nombre como snapshot", async () => {
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

    await comoAdmin(t).mutation(api.sedes.borrar, { id: sedeId });

    // El historial sobrevive a la sede: para eso se guarda el par id + nombre
    // en vez del id solo.
    const pedidos = await comoAdmin(t).query(api.pedidos.listarActivos, {});
    expect(pedidos[0].sedeNombre).toBe("Sede Dalia");
  });

  test("exige sesion de admin", async () => {
    const t = convexTest(schema, modules);
    const sedeId = await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Dalia",
      whatsapp: "573000000001",
    });

    await expect(
      t.mutation(api.sedes.borrar, { id: sedeId })
    ).rejects.toThrow(/No autorizado/);
  });
});

describe("sedes.sincronizar — semilla, no fuente de verdad", () => {
  test("crea las sedes que faltan en un deployment vacio", async () => {
    const t = convexTest(schema, modules);

    const resultado = await t.mutation(internal.sedes.sincronizar, {});

    expect(resultado.creadas).toEqual([
      "Sede Dalia",
      "Sede Manzanares",
      "Sede Morichal",
    ]);
    expect(resultado.omitidas).toEqual([]);
  });

  test("NO pisa una sede que el admin edito", async () => {
    const t = convexTest(schema, modules);
    const id = await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Dalia",
      whatsapp: "573999999999",
      direccion: "Direccion cargada desde el panel",
    });
    await comoAdmin(t).mutation(api.sedes.actualizar, {
      id,
      campos: { activo: false },
    });

    const resultado = await t.mutation(internal.sedes.sincronizar, {});

    // Antes esta funcion pisaba whatsapp/direccion y forzaba activo:true en
    // cada corrida. Con el panel andando eso revertia los cambios del admin.
    expect(resultado.omitidas).toContain("Sede Dalia");

    const dalia = await t.run(async (ctx) => await ctx.db.get(id));
    expect(dalia!.whatsapp).toBe("573999999999");
    expect(dalia!.direccion).toBe("Direccion cargada desde el panel");
    expect(dalia!.activo).toBe(false);
  });

  test("es idempotente: correrla dos veces no duplica nada", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.sedes.sincronizar, {});
    await t.mutation(internal.sedes.sincronizar, {});

    const sedes = await t.query(api.sedes.listar, {});
    expect(sedes).toHaveLength(3);
  });
});
