import { query, internalMutation } from "./_generated/server";

// Publica: el cliente elige su sede antes de armar el pedido.
export const listar = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("sedes")
      .filter((q) => q.eq(q.field("activo"), true))
      .collect();
  },
});

// Sedes reales del negocio. Fuente de verdad para `sincronizar`, mismo patron
// que CATEGORIAS_MENU en categorias.ts.
//
// Las dos comparten WHATSAPP_PRUEBA por ahora: todavia no hay un numero de
// domicilio propio por sede. El dia que lo haya, se actualiza el campo
// `whatsapp` de cada una (a mano o subiendo este valor por defecto) — no hace
// falta tocar el front.
const WHATSAPP_PRUEBA = "573206873870";

const SEDES = [
  {
    nombre: "Sede Dalia",
    whatsapp: WHATSAPP_PRUEBA,
    direccion: "Carrera 8 # 18-203",
  },
  {
    nombre: "Sede Manzanares",
    whatsapp: WHATSAPP_PRUEBA,
    direccion: "Carrera 30 oeste # 11-112 sector 13",
  },
];

/**
 * Crea o actualiza las sedes de arriba. Idempotente: correrla de nuevo no
 * duplica nada, solo reconcilia por nombre.
 *
 * `internalMutation` y no `mutation` a proposito: no hay pantalla de admin
 * para esto todavia, y una mutation publica que inserta sedes es una
 * escritura sin dueno que nadie pidio. Las internal functions no son
 * alcanzables por ningun cliente (browser, curl, token robado) — Convex las
 * bloquea a nivel de framework, no con un chequeo en runtime. Se corre asi:
 *
 *   npx convex run sedes:sincronizar
 *   npx convex run sedes:sincronizar --prod
 */
export const sincronizar = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existentes = await ctx.db.query("sedes").collect();
    const porNombre = new Map(existentes.map((s) => [s.nombre, s]));

    const creadas: string[] = [];
    const actualizadas: string[] = [];

    for (const sede of SEDES) {
      const actual = porNombre.get(sede.nombre);

      if (actual) {
        await ctx.db.patch(actual._id, {
          whatsapp: sede.whatsapp,
          direccion: sede.direccion,
          activo: true,
        });
        actualizadas.push(sede.nombre);
      } else {
        await ctx.db.insert("sedes", { ...sede, activo: true });
        creadas.push(sede.nombre);
      }
    }

    return { creadas, actualizadas };
  },
});
