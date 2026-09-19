/*
 * Vigencia de las promociones del dia.
 *
 * El dia de HOY se resuelve con la hora LOCAL del navegador, nunca en el
 * servidor: Convex corre en UTC y en Colombia (UTC-5) a partir de las 19:00
 * el servidor ya esta en el dia siguiente — justo la hora fuerte del local.
 * Una promo "de hoy" filtrada en el server se apagaria sola a las 7 de la
 * tarde. Mismo criterio que usa StatusBar.jsx para el dia de la semana.
 *
 * Todo se compara como string "YYYY-MM-DD". Es seguro porque ese formato
 * ordena igual alfabetica y cronologicamente, y evita `new Date("...")`, que
 * interpreta la fecha como medianoche UTC y corre el dia.
 */

// Fecha local en "YYYY-MM-DD". Se arma a mano y no con toISOString(), que
// convierte a UTC y devolveria el dia equivocado despues de las 19:00.
export const fechaLocalHoy = (ahora = new Date()) => {
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');

  return `${ahora.getFullYear()}-${mes}-${dia}`;
};

/**
 * ¿Esta promo corre hoy?
 *
 * Los extremos son INCLUSIVE: una promo que vence "hoy" se sigue mostrando
 * todo el dia de hoy. Si no tiene fechas, la vigencia la decide solamente el
 * switch `activa` del admin, que es como se comportaba antes de este campo.
 */
export const estaVigente = (promocion, hoy = fechaLocalHoy()) => {
  if (promocion.vigenteDesde && hoy < promocion.vigenteDesde) return false;
  if (promocion.vigenteHasta && hoy > promocion.vigenteHasta) return false;

  return true;
};

// Por que una promo no se esta viendo. Lo usa el panel: sin esto, una promo
// prendida pero fuera de su ventana se ve igual que una que si se muestra, y
// el admin no entiende por que el cliente no la ve.
//
// `activa` es el interruptor manual de quien llama (para un item del menu, su
// `disponible`): se separa de las fechas porque son dos motivos distintos por
// los que una promo puede no estar a la vista.
export const estadoVigencia = (promocion, hoy = fechaLocalHoy()) => {
  if (!promocion.activa) return 'apagada';
  if (promocion.vigenteDesde && hoy < promocion.vigenteDesde) return 'programada';
  if (promocion.vigenteHasta && hoy > promocion.vigenteHasta) return 'vencida';

  return 'vigente';
};
