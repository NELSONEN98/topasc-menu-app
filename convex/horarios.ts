import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requerirAdmin } from "./guardias";

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

/**
 * Los 7 dias resueltos para una sede.
 *
 * Cadena de tres escalones, del mas especifico al mas general:
 *   1. la fila de ESA sede para ese dia
 *   2. la fila GENERAL de ese dia (sedeId ausente) — la que hereda todo el mundo
 *   3. HORARIOS_POR_DEFECTO — horario de fabrica
 *
 * Sin `sedeId` devuelve el horario general, que es lo que corresponde antes de
 * que el cliente elija local: todavia no sabemos de cual hablar.
 *
 * `heredado` viaja en la respuesta para que el panel pueda distinguir "este
 * local abre a las 11 porque alguien lo decidio" de "abre a las 11 porque
 * nadie lo toco". Sin ese dato las dos cosas se ven identicas y el admin no
 * sabe si ya configuro la sede o no.
 */
export const listar = query({
  args: { sedeId: v.optional(v.id("sedes")) },
  handler: async (ctx, { sedeId }) => {
    const guardados = await ctx.db.query("horariosAtencion").collect();

    // Devolvemos siempre los 7 dias: los que todavia nadie edito salen con el
    // valor por defecto. Asi el panel nunca arranca vacio y ningun consumidor
    // tiene que resolver el caso "falta el martes".
    return ORDEN_SEMANA.map((diaSemana) => {
      const porDefecto = HORARIOS_POR_DEFECTO[diaSemana];
      const delDia = guardados.filter((h) => h.diaSemana === diaSemana);

      const propio = sedeId
        ? delDia.find((h) => h.sedeId === sedeId)
        : undefined;
      const general = delDia.find((h) => h.sedeId === undefined);
      const guardado = propio ?? general;

      if (!guardado) {
        return {
          _id: null,
          diaSemana,
          ...porDefecto,
          cerrado: false,
          heredado: true,
        };
      }

      return {
        _id: guardado._id,
        diaSemana,
        horaApertura: guardado.horaApertura ?? porDefecto.horaApertura,
        horaCierre: guardado.horaCierre ?? porDefecto.horaCierre,
        cerrado: guardado.cerrado,
        // Pedimos una sede y contestamos con el general: este dia no esta
        // configurado para ella.
        heredado: propio === undefined,
      };
    });
  },
});

const validarDia = (diaSemana: number) => {
  if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) {
    throw new Error("El dia de la semana debe ser un entero entre 0 y 6");
  }
};

/**
 * Guarda el horario de un dia. Sin `sedeId` guarda el GENERAL, que es el que
 * heredan las sedes que no tengan el suyo.
 *
 * El upsert busca por el par (sedeId, diaSemana) y ya no con `.unique()` sobre
 * el dia: desde que cada sede puede tener el suyo, hay varias filas por dia y
 * `.unique()` tiraria error. Se filtra en memoria porque son 7 dias por sede,
 * no hay volumen que justifique un indice compuesto.
 */
export const guardarDia = mutation({
  args: {
    sedeId: v.optional(v.id("sedes")),
    diaSemana: v.number(),
    horaApertura: v.string(),
    horaCierre: v.string(),
    cerrado: v.boolean(),
  },
  handler: async (ctx, { sedeId, diaSemana, horaApertura, horaCierre, cerrado }) => {
    await requerirAdmin(ctx);

    validarDia(diaSemana);

    const delDia = await ctx.db
      .query("horariosAtencion")
      .withIndex("por_dia", (q) => q.eq("diaSemana", diaSemana))
      .collect();

    const existente = delDia.find((h) => h.sedeId === sedeId);
    const campos = { sedeId, diaSemana, horaApertura, horaCierre, cerrado };

    if (existente) {
      await ctx.db.patch(existente._id, campos);
      return existente._id;
    }

    return await ctx.db.insert("horariosAtencion", campos);
  },
});

/**
 * Borra el horario propio de una sede para un dia: ese dia vuelve a heredar el
 * general.
 *
 * Existe porque sin esto no hay vuelta atras. Una vez que una sede tiene su
 * fila propia, queda desenganchada del general para siempre: cambiar el
 * horario de todos los locales dejaria de alcanzarla, y el admin no tendria
 * forma de darse cuenta ni de revertirlo.
 *
 * Nunca borra el general (`sedeId` es obligatorio aca): ese es el piso del que
 * cuelga todo lo demas.
 */
export const volverAlGeneral = mutation({
  args: {
    sedeId: v.id("sedes"),
    diaSemana: v.number(),
  },
  handler: async (ctx, { sedeId, diaSemana }) => {
    await requerirAdmin(ctx);

    validarDia(diaSemana);

    const delDia = await ctx.db
      .query("horariosAtencion")
      .withIndex("por_dia", (q) => q.eq("diaSemana", diaSemana))
      .collect();

    const propio = delDia.find((h) => h.sedeId === sedeId);
    if (propio) await ctx.db.delete(propio._id);
  },
});
