/*
 * Que productos se ven en el menu.
 *
 * Una promo del dia puede REEMPLAZAR productos: mientras el 2x1 de salchipapas
 * este corriendo, la salchipapa suelta no se ofrece, para que el cliente no
 * pueda pedirla al precio de siempre. Los productos tapados los elige el admin
 * (`items.ocultaItemIds`) y es opcional: una promo puede no tapar nada.
 *
 * Vive en un util y no dentro de Home porque el mismo corte tiene que valer en
 * TODAS las listas que le ofrecen productos al cliente — hoy el menu y el modal
 * de bebidas del carrito. Dos filtros sueltos son dos filtros que se
 * desincronizan: si el de bebidas se olvida, la bebida tapada sigue pedible
 * desde el carrito y la promo queda sin efecto.
 *
 * El corte va en el CLIENTE y no en `listarMenu`: depende de la vigencia, que
 * se resuelve con la fecha local del navegador. Ver src/utils/vigencia.js.
 */

import { estaVigente, fechaLocalHoy } from './vigencia';

/**
 * Que promo tapa a cada producto hoy: Map de `itemId` -> nombres de las promos.
 *
 * Es la primitiva de este modulo. Devuelve los NOMBRES y no solo los ids porque
 * el panel necesita poder decirle al admin "esto no se ve porque lo tapa el 2x1"
 * — un producto que desaparece del menu mientras en el panel figura disponible
 * es exactamente el tipo de bug que nadie puede diagnosticar.
 *
 * Una promo tapa solo si el cliente realmente la esta viendo: `esPromo`,
 * disponible, y dentro de su ventana de fechas. Lo de `disponible` se chequea
 * ACA y no en quien llama: en el menu los items ya vienen disponibles y el
 * chequeo no cambia nada, pero el panel ve tambien los apagados y sin esto una
 * promo apagada figuraria tapando productos que en realidad se estan vendiendo.
 *
 * `items` viene ya filtrado por sede desde `listarMenu`, asi que una promo que
 * no corre en esta sede tampoco tapa nada en este local.
 */
export const promosQueOcultan = (items, hoy = fechaLocalHoy()) => {
  const porItem = new Map();

  for (const item of items) {
    if (item.esPromo !== true) continue;
    if (item.disponible === false) continue;
    if (!estaVigente(item, hoy)) continue;

    for (const id of item.ocultaItemIds ?? []) {
      // Una promo no se tapa a si misma. El formulario ya no la ofrece en la
      // lista, pero un dato viejo o un id copiado a mano la haria desaparecer
      // justo cuando arranca, que es el peor momento posible.
      if (id === item._id) continue;

      if (!porItem.has(id)) porItem.set(id, []);
      porItem.get(id).push(item.nombre);
    }
  }

  return porItem;
};

/**
 * Ids que hoy estan tapados por alguna promo vigente.
 *
 * `hoy` se inyecta solo en los tests: en la app siempre lo resuelve
 * `fechaLocalHoy`, que es el unico reloj confiable para esto.
 */
export const idsOcultosPorPromo = (items, hoy = fechaLocalHoy()) =>
  new Set(promosQueOcultan(items, hoy).keys());

/**
 * El menu sin los productos que hoy tapa una promo.
 *
 * Cuando no hay nada tapado devuelve el MISMO array que entro, no una copia:
 * asi los useMemo que dependen de esto no se recalculan en cada render por un
 * `[]` nuevo, que es el caso normal (la mayoria de los dias no hay promo).
 */
export const itemsVisibles = (items, hoy = fechaLocalHoy()) => {
  const ocultos = idsOcultosPorPromo(items, hoy);
  if (ocultos.size === 0) return items;

  return items.filter((item) => !ocultos.has(item._id));
};
