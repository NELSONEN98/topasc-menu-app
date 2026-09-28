/*
 * Telefono del cliente que hace el pedido.
 *
 * Separado a proposito de `normalizarWhatsapp` (src/utils/whatsapp.js), aunque
 * las dos validen un celular colombiano: ese arma el link de wa.me de la SEDE y
 * necesita el numero internacional completo y solo digitos, porque si se
 * equivoca el pedido no llega a nadie. Este es un numero que el local marca a
 * mano si hay que avisar algo, asi que se guarda en formato local y legible, y
 * los mensajes de error le hablan al cliente, no al admin.
 *
 * Mezclarlos en una sola funcion terminaria con un parametro `esCliente` que
 * cambia el formato de salida Y los textos: dos responsabilidades discutiendo
 * adentro de un if.
 */

// Celular colombiano: 10 digitos, empieza con 3.
const LARGO_CELULAR = 10;
// Fijo con indicativo: 7 u 8 digitos. Se aceptan para no dejar afuera a quien
// solo tiene linea fija — el local igual lo puede llamar.
const LARGO_FIJO_MINIMO = 7;

/**
 * Devuelve `{ telefono, error }`. `telefono` son solo los digitos.
 *
 * No lanza: el modal lo llama en cada tecla para mostrar la vista previa, igual
 * que hace el modal de sedes con `normalizarWhatsapp`.
 */
export const normalizarTelefonoCliente = (valor) => {
  const digitos = String(valor ?? '')
    .replace(/\D/g, '')
    // "00" es el prefijo internacional de marcado y un "0" suelto el de larga
    // distancia nacional. Ninguno es parte del numero.
    .replace(/^0+/, '')
    // 57 adelante de 10 digitos es el codigo de pais: el cliente escribio el
    // numero internacional. Se guarda en formato local, que es como lo marca el
    // local desde Colombia.
    .replace(/^57(?=\d{10}$)/, '');

  if (digitos === '') {
    return { telefono: null, error: 'Escribí tu teléfono' };
  }

  if (digitos.length < LARGO_FIJO_MINIMO) {
    return {
      telefono: null,
      error: 'El teléfono parece incompleto: van 10 dígitos (3001234567)',
    };
  }

  if (digitos.length > LARGO_CELULAR) {
    return {
      telefono: null,
      error: `"${valor}" tiene demasiados dígitos para un teléfono colombiano`,
    };
  }

  return { telefono: digitos, error: null };
};

/**
 * "3001234567" -> "300 123 4567".
 *
 * Solo para mostrar. Un numero de 10 digitos pegado es dificil de leer en
 * pantalla y peor de dictar por telefono, que es justo lo que el local hace con
 * esto. Lo que no tiene 10 digitos se devuelve tal cual: partirlo a ciegas
 * inventaria una separacion que no significa nada.
 */
export const formatearTelefono = (telefono) => {
  const digitos = String(telefono ?? '').replace(/\D/g, '');

  if (digitos.length !== LARGO_CELULAR) return digitos;

  return `${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}`;
};
