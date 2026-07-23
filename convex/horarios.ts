import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// `diaSemana` sigue la convencion de Date.getDay(): 0 = Domingo ... 6 = Sabado.
// Las horas se guardan en 24h ("23:00") porque es el formato que usa
// <input type="time"> y el que ordena bien comparando strings.
const HORARIOS_POR_DEFECTO: Record<
  number,
  { horaApertura: string; horaCierre: string }
> = {
  0: { horaApertura: "12:00", horaCierre: "22:00" },
  1: { horaApertura: "11:00", horaCierre: "23:00" },
  2: { horaApertura: "11:00", horaCierre: "23:00" },
  3: { horaApertura: "11:00", horaCierre: "23:00" },
  4: { horaApertura: "11:00", horaCierre: "23:00" },
  5: { horaApertura: "11:00", horaCierre: "00:00" },
  6: { horaApertura: "12:00", horaCierre: "00:00" },
};

// Orden de presentacion: la semana arranca el lunes y el domingo va al final.
const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0];

export const listar = query({
  args: {},
  handler: async (ctx) => {
    const guardados = await ctx.db.query("horariosAtencion").collect();

    // Devolvemos siempre los 7 dias: los que todavia nadie edito salen con el
    // valor por defecto. Asi el panel nunca arranca vacio y ningun consumidor
    // tiene que resolver el caso "falta el martes".
    return ORDEN_SEMANA.map((diaSemana) => {
      const porDefecto = HORARIOS_POR_DEFECTO[diaSemana];
      const guardado = guardados.find((h) => h.diaSemana === diaSemana);

      if (!guardado) {
        return { _id: null, diaSemana, ...porDefecto, cerrado: false };
      }

      return {
        _id: guardado._id,
        diaSemana,
        horaApertura: guardado.horaApertura ?? porDefecto.horaApertura,
        horaCierre: guardado.horaCierre ?? porDefecto.horaCierre,
        cerrado: guardado.cerrado,
      };
    });
  },
});

export const guardarDia = mutation({
  args: {
    diaSemana: v.number(),
    horaApertura: v.string(),
    horaCierre: v.string(),
    cerrado: v.boolean(),
  },
  handler: async (ctx, { diaSemana, horaApertura, horaCierre, cerrado }) => {
    if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) {
      throw new Error("El dia de la semana debe ser un entero entre 0 y 6");
    }

    const existente = await ctx.db
      .query("horariosAtencion")
      .withIndex("por_dia", (q) => q.eq("diaSemana", diaSemana))
      .unique();

    const campos = { diaSemana, horaApertura, horaCierre, cerrado };

    if (existente) {
      await ctx.db.patch(existente._id, campos);
      return existente._id;
    }

    return await ctx.db.insert("horariosAtencion", campos);
  },
});
