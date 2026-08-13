/*
 * Normaliza el WhatsApp de una sede al formato que necesita wa.me.
 *
 * wa.me exige el numero internacional completo y SOLO digitos: sin +, sin
 * espacios, sin guiones. Un numero sin codigo de pais arma un link que no
 * rutea a nadie — y falla en silencio, que es lo peor: la sede se guarda bien,
 * el panel lo muestra bien, y los pedidos simplemente no llegan nunca.
 *
 * El negocio es 100% colombiano (decision explicita), asi que cuando el numero
 * viene sin codigo de pais se le antepone el 57 en vez de rechazarlo. No es
 * magia oculta: el modal muestra en vivo como va a quedar guardado, y la tabla
 * lo muestra normalizado despues.
 */

export const CODIGO_PAIS = '57';

// Celular colombiano: 10 digitos. Con el codigo de pais adelante son 12.
const LARGO_LOCAL = 10;
const LARGO_COMPLETO = 12;

/**
 * Devuelve `{ numero, error }`.
 *
 * No lanza a proposito: el modal lo usa en cada tecla para mostrar la vista
 * previa, y ahi un throw seria carisimo de manejar.
 */
export const normalizarWhatsapp = (valor) => {
  const digitos = String(valor ?? '')
    .replace(/\D/g, '')
    // Ceros iniciales: "00" es el prefijo internacional de marcado y un "0"
    // suelto el de larga distancia nacional. Ninguno va en un link de wa.me.
    .replace(/^0+/, '');

  if (digitos === '') {
    return { numero: null, error: 'Escribí el número de WhatsApp de la sede' };
  }

  if (digitos.length === LARGO_COMPLETO && digitos.startsWith(CODIGO_PAIS)) {
    return { numero: digitos, error: null };
  }

  if (digitos.length === LARGO_LOCAL) {
    return { numero: CODIGO_PAIS + digitos, error: null };
  }

  return {
    numero: null,
    error:
      `"${valor}" no parece un número colombiano. Van 10 dígitos ` +
      `(3206873870) o 12 con el código de país (573206873870).`,
  };
};
