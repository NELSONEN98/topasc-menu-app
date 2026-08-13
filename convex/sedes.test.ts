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

  test("le agrega el codigo de pais a un numero local", async () => {
    const t = convexTest(schema, modules);
    await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Dalia",
      whatsapp: "320 687 3870",
    });

    const sedes = await t.query(api.sedes.listar, {});

    // Sin el 57, wa.me arma un link que no rutea a nadie — y falla en
    // silencio: la sede se guarda bien y los pedidos no llegan nunca.
    expect(sedes[0].whatsapp).toBe("573206873870");
  });

  test("rechaza un numero que no es ni local ni completo", async () => {
    const t = convexTest(schema, modules);

    await expect(
      comoAdmin(t).mutation(api.sedes.crear, {
        nombre: "Sede Trucha",
        whatsapp: "320687",
      })
    ).rejects.toThrow(/no parece un numero colombiano/);
  });

  test("al actualizar tambien completa el codigo de pais", async () => {
    const t = convexTest(schema, modules);
    const id = await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Dalia",
      whatsapp: "573206873870",
    });

    await comoAdmin(t).mutation(api.sedes.actualizar, {
      id,
      campos: { whatsapp: "301 555 4433" },
    });

    const sedes = await t.query(api.sedes.listar, {});
    expect(sedes[0].whatsapp).toBe("573015554433");
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

describe("sedes — costo de domicilio", () => {
  test("se guarda el costo que se le indica", async () => {
    const t = convexTest(schema, modules);
    await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Morichal",
      whatsapp: "573000000001",
      costoDomicilio: 15000,
    });

    const [sede] = await t.query(api.sedes.listar, {});
    expect(sede.costoDomicilio).toBe(15000);
  });

  test("CERO es un valor valido y significa envio gratis", async () => {
    const t = convexTest(schema, modules);
    await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Dalia",
      whatsapp: "573000000001",
      costoDomicilio: 0,
    });

    const [sede] = await t.query(api.sedes.listar, {});

    // Si en algun lado se leyera con `||` en vez de `??`, este 0 se
    // interpretaria como "sin configurar" y el cliente terminaria pagando un
    // envio que el local decidio regalar.
    expect(sede.costoDomicilio).toBe(0);
  });

  test("sin costo queda ausente: se usa el valor de respaldo de la app", async () => {
    const t = convexTest(schema, modules);
    await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Dalia",
      whatsapp: "573000000001",
    });

    const [sede] = await t.query(api.sedes.listar, {});
    expect(sede.costoDomicilio).toBeUndefined();
  });

  test("rechaza un costo negativo al crear", async () => {
    const t = convexTest(schema, modules);

    // Un domicilio negativo le SUMARIA plata al carrito del cliente.
    await expect(
      comoAdmin(t).mutation(api.sedes.crear, {
        nombre: "Sede Trucha",
        whatsapp: "573000000001",
        costoDomicilio: -5000,
      })
    ).rejects.toThrow(/no puede ser negativo/);
  });

  test("rechaza un costo negativo al actualizar", async () => {
    const t = convexTest(schema, modules);
    const id = await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Dalia",
      whatsapp: "573000000001",
    });

    await expect(
      comoAdmin(t).mutation(api.sedes.actualizar, {
        id,
        campos: { costoDomicilio: -1 },
      })
    ).rejects.toThrow(/no puede ser negativo/);
  });

  test("vaciar el costo lo BORRA y la sede vuelve al valor de respaldo", async () => {
    const t = convexTest(schema, modules);
    const id = await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Dalia",
      whatsapp: "573000000001",
      costoDomicilio: 8000,
    });

    // El admin borra el campo en el formulario para volver al valor por
    // defecto de la app.
    await comoAdmin(t).mutation(api.sedes.actualizar, {
      id,
      campos: { costoDomicilio: null },
    });

    const [sede] = await t.query(api.sedes.listar, {});
    expect(sede.costoDomicilio).toBeUndefined();
  });

  test("se puede cambiar el costo de una sede ya creada", async () => {
    const t = convexTest(schema, modules);
    const id = await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Dalia",
      whatsapp: "573000000001",
      costoDomicilio: 10000,
    });

    await comoAdmin(t).mutation(api.sedes.actualizar, {
      id,
      campos: { costoDomicilio: 12000 },
    });

    const [sede] = await t.query(api.sedes.listar, {});
    expect(sede.costoDomicilio).toBe(12000);
  });

  test("cada sede puede cobrar distinto", async () => {
    const t = convexTest(schema, modules);
    await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Dalia",
      whatsapp: "573000000001",
      costoDomicilio: 8000,
    });
    await comoAdmin(t).mutation(api.sedes.crear, {
      nombre: "Sede Morichal",
      whatsapp: "573000000002",
      costoDomicilio: 14000,
    });

    // El motivo de que esto viva en la sede y no en una constante: el reparto
    // de cada local cubre distancias distintas.
    const sedes = await t.query(api.sedes.listar, {});
    const porNombre = Object.fromEntries(
      sedes.map((s) => [s.nombre, s.costoDomicilio])
    );

    expect(porNombre["Sede Dalia"]).toBe(8000);
    expect(porNombre["Sede Morichal"]).toBe(14000);
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
