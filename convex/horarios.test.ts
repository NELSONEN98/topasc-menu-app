import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

const ADMIN = { email: "admin@test.local", subject: "user_admin_test" };

const comoAdmin = (t: ReturnType<typeof convexTest>) => t.withIdentity(ADMIN);

const LUNES = 1;
const MARTES = 2;

const crearSede = async (t: ReturnType<typeof convexTest>, nombre: string) =>
  await comoAdmin(t).mutation(api.sedes.crear, { nombre, whatsapp: "573000000001" });

const dia = (horarios: any[], diaSemana: number) =>
  horarios.find((h) => h.diaSemana === diaSemana)!;

describe("horarios.listar — herencia del general", () => {
  test("sin nada cargado devuelve los 7 dias con el horario de fabrica", async () => {
    const t = convexTest(schema, modules);

    const horarios = await t.query(api.horarios.listar, {});

    // Siempre 7 dias: ningun consumidor tiene que resolver "falta el martes".
    expect(horarios).toHaveLength(7);
    expect(dia(horarios, LUNES).horaApertura).toBe("11:00");
    expect(dia(horarios, LUNES).heredado).toBe(true);
  });

  test("la semana arranca el lunes y el domingo va al final", async () => {
    const t = convexTest(schema, modules);

    const horarios = await t.query(api.horarios.listar, {});

    expect(horarios.map((h) => h.diaSemana)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  test("una sede sin horario propio hereda el general", async () => {
    const t = convexTest(schema, modules);
    const sedeId = await crearSede(t, "Sede Morichal");
    await comoAdmin(t).mutation(api.horarios.guardarDia, {
      diaSemana: LUNES,
      horaApertura: "09:00",
      horaCierre: "21:00",
      cerrado: false,
    });

    const horarios = await t.query(api.horarios.listar, { sedeId });

    expect(dia(horarios, LUNES).horaApertura).toBe("09:00");
    expect(dia(horarios, LUNES).heredado).toBe(true);
  });

  test("el horario propio de la sede le gana al general", async () => {
    const t = convexTest(schema, modules);
    const sedeId = await crearSede(t, "Sede Morichal");
    await comoAdmin(t).mutation(api.horarios.guardarDia, {
      diaSemana: LUNES,
      horaApertura: "09:00",
      horaCierre: "21:00",
      cerrado: false,
    });
    await comoAdmin(t).mutation(api.horarios.guardarDia, {
      sedeId,
      diaSemana: LUNES,
      horaApertura: "12:00",
      horaCierre: "23:00",
      cerrado: false,
    });

    const horarios = await t.query(api.horarios.listar, { sedeId });

    expect(dia(horarios, LUNES).horaApertura).toBe("12:00");
    expect(dia(horarios, LUNES).heredado).toBe(false);
  });

  test("cada sede puede tener su propio horario el mismo dia", async () => {
    const t = convexTest(schema, modules);
    const dalia = await crearSede(t, "Sede Dalia");
    const morichal = await crearSede(t, "Sede Morichal");

    await comoAdmin(t).mutation(api.horarios.guardarDia, {
      sedeId: dalia,
      diaSemana: LUNES,
      horaApertura: "10:00",
      horaCierre: "22:00",
      cerrado: false,
    });
    await comoAdmin(t).mutation(api.horarios.guardarDia, {
      sedeId: morichal,
      diaSemana: LUNES,
      horaApertura: "00:00",
      horaCierre: "00:00",
      cerrado: true,
    });

    // El caso que justifica la feature: Morichal cierra los lunes y Dalia no.
    expect(dia(await t.query(api.horarios.listar, { sedeId: dalia }), LUNES).horaApertura).toBe("10:00");
    expect(dia(await t.query(api.horarios.listar, { sedeId: morichal }), LUNES).cerrado).toBe(true);
  });

  test("una sede se desengancha solo el dia que edito, no toda la semana", async () => {
    const t = convexTest(schema, modules);
    const sedeId = await crearSede(t, "Sede Morichal");
    await comoAdmin(t).mutation(api.horarios.guardarDia, {
      sedeId,
      diaSemana: LUNES,
      horaApertura: "12:00",
      horaCierre: "23:00",
      cerrado: false,
    });

    const horarios = await t.query(api.horarios.listar, { sedeId });

    expect(dia(horarios, LUNES).heredado).toBe(false);
    expect(dia(horarios, MARTES).heredado).toBe(true);
  });

  test("cambiar el general alcanza a las sedes que lo heredan y no a las otras", async () => {
    const t = convexTest(schema, modules);
    const dalia = await crearSede(t, "Sede Dalia");
    const morichal = await crearSede(t, "Sede Morichal");

    // Morichal se desengancha; Dalia no.
    await comoAdmin(t).mutation(api.horarios.guardarDia, {
      sedeId: morichal,
      diaSemana: LUNES,
      horaApertura: "12:00",
      horaCierre: "23:00",
      cerrado: false,
    });

    await comoAdmin(t).mutation(api.horarios.guardarDia, {
      diaSemana: LUNES,
      horaApertura: "08:00",
      horaCierre: "20:00",
      cerrado: false,
    });

    // Es todo el punto del modelo de herencia: tocar un lugar para cambiar a
    // los que no tienen excepcion, sin pisar a los que si.
    expect(dia(await t.query(api.horarios.listar, { sedeId: dalia }), LUNES).horaApertura).toBe("08:00");
    expect(dia(await t.query(api.horarios.listar, { sedeId: morichal }), LUNES).horaApertura).toBe("12:00");
  });

  test("los horarios ya cargados sin sede siguen valiendo como general", async () => {
    const t = convexTest(schema, modules);
    const sedeId = await crearSede(t, "Sede Dalia");

    // Fila anterior a que existiera `sedeId`, tal cual esta hoy en produccion.
    await t.run(async (ctx) => {
      await ctx.db.insert("horariosAtencion", {
        diaSemana: LUNES,
        horaApertura: "07:00",
        horaCierre: "19:00",
        cerrado: false,
      });
    });

    // Si `listar` las ignorara, cada local caeria al horario de fabrica y le
    // estariamos cambiando el horario al negocio sin avisar.
    const horarios = await t.query(api.horarios.listar, { sedeId });
    expect(dia(horarios, LUNES).horaApertura).toBe("07:00");
  });
});

describe("horarios.guardarDia", () => {
  test("exige sesion de admin", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.horarios.guardarDia, {
        diaSemana: LUNES,
        horaApertura: "11:00",
        horaCierre: "23:00",
        cerrado: false,
      })
    ).rejects.toThrow(/No autorizado/);
  });

  test("rechaza un dia fuera de rango", async () => {
    const t = convexTest(schema, modules);

    await expect(
      comoAdmin(t).mutation(api.horarios.guardarDia, {
        diaSemana: 7,
        horaApertura: "11:00",
        horaCierre: "23:00",
        cerrado: false,
      })
    ).rejects.toThrow(/entero entre 0 y 6/);
  });

  test("guardar dos veces el mismo dia actualiza, no duplica", async () => {
    const t = convexTest(schema, modules);
    const sedeId = await crearSede(t, "Sede Dalia");

    await comoAdmin(t).mutation(api.horarios.guardarDia, {
      sedeId,
      diaSemana: LUNES,
      horaApertura: "10:00",
      horaCierre: "22:00",
      cerrado: false,
    });
    await comoAdmin(t).mutation(api.horarios.guardarDia, {
      sedeId,
      diaSemana: LUNES,
      horaApertura: "11:00",
      horaCierre: "23:00",
      cerrado: false,
    });

    const filas = await t.run(async (ctx) =>
      await ctx.db.query("horariosAtencion").collect()
    );

    // El upsert busca por el par (sedeId, diaSemana). Antes usaba .unique()
    // sobre el dia, que ahora tiraria error al haber varias filas por dia.
    expect(filas).toHaveLength(1);
    expect(filas[0].horaApertura).toBe("11:00");
  });

  test("el general y el de una sede conviven como filas distintas", async () => {
    const t = convexTest(schema, modules);
    const sedeId = await crearSede(t, "Sede Dalia");

    await comoAdmin(t).mutation(api.horarios.guardarDia, {
      diaSemana: LUNES,
      horaApertura: "09:00",
      horaCierre: "21:00",
      cerrado: false,
    });
    await comoAdmin(t).mutation(api.horarios.guardarDia, {
      sedeId,
      diaSemana: LUNES,
      horaApertura: "12:00",
      horaCierre: "23:00",
      cerrado: false,
    });

    const filas = await t.run(async (ctx) =>
      await ctx.db.query("horariosAtencion").collect()
    );
    expect(filas).toHaveLength(2);
  });
});

describe("horarios.volverAlGeneral", () => {
  test("borra el horario propio y el dia vuelve a heredar", async () => {
    const t = convexTest(schema, modules);
    const sedeId = await crearSede(t, "Sede Morichal");

    await comoAdmin(t).mutation(api.horarios.guardarDia, {
      diaSemana: LUNES,
      horaApertura: "09:00",
      horaCierre: "21:00",
      cerrado: false,
    });
    await comoAdmin(t).mutation(api.horarios.guardarDia, {
      sedeId,
      diaSemana: LUNES,
      horaApertura: "12:00",
      horaCierre: "23:00",
      cerrado: false,
    });

    await comoAdmin(t).mutation(api.horarios.volverAlGeneral, {
      sedeId,
      diaSemana: LUNES,
    });

    const horarios = await t.query(api.horarios.listar, { sedeId });
    expect(dia(horarios, LUNES).horaApertura).toBe("09:00");
    expect(dia(horarios, LUNES).heredado).toBe(true);
  });

  test("no toca el horario general", async () => {
    const t = convexTest(schema, modules);
    const sedeId = await crearSede(t, "Sede Morichal");

    await comoAdmin(t).mutation(api.horarios.guardarDia, {
      diaSemana: LUNES,
      horaApertura: "09:00",
      horaCierre: "21:00",
      cerrado: false,
    });
    await comoAdmin(t).mutation(api.horarios.guardarDia, {
      sedeId,
      diaSemana: LUNES,
      horaApertura: "12:00",
      horaCierre: "23:00",
      cerrado: false,
    });

    await comoAdmin(t).mutation(api.horarios.volverAlGeneral, {
      sedeId,
      diaSemana: LUNES,
    });

    // El general es el piso del que cuelga todo lo demas: nunca se borra.
    const general = await t.query(api.horarios.listar, {});
    expect(dia(general, LUNES).horaApertura).toBe("09:00");
  });

  test("sobre un dia que ya hereda no rompe nada", async () => {
    const t = convexTest(schema, modules);
    const sedeId = await crearSede(t, "Sede Morichal");

    await expect(
      comoAdmin(t).mutation(api.horarios.volverAlGeneral, { sedeId, diaSemana: LUNES })
    ).resolves.not.toThrow();
  });

  test("exige sesion de admin", async () => {
    const t = convexTest(schema, modules);
    const sedeId = await crearSede(t, "Sede Morichal");

    await expect(
      t.mutation(api.horarios.volverAlGeneral, { sedeId, diaSemana: LUNES })
    ).rejects.toThrow(/No autorizado/);
  });
});
