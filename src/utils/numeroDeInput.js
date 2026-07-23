// Convierte lo que escribe el usuario en un <input type="number">.
//
// La clave: vacio NO es cero. Son dos estados distintos.
// "todavia no escribi nada" != "vale cero pesos".
//
// El patron viejo `parseInt(value) || 0` los aplastaba en uno solo, y eso
// dejaba el campo arrancando en 0 e imposible de borrar: al hacer backspace
// el input quedaba en "", parseInt("") daba NaN, y el `|| 0` lo devolvia a 0.
//
// Devolvemos '' para vacio y lo convertimos a numero recien al guardar.
export const numeroDeInput = (valor) => {
  if (valor === '') return '';

  const numero = Number(valor);
  return Number.isNaN(numero) ? '' : numero;
};

// Coercion en el borde: lo que va a la base SIEMPRE es number.
export const aNumero = (valor, porDefecto = 0) => {
  if (valor === '' || valor === null || valor === undefined) return porDefecto;

  const numero = Number(valor);
  return Number.isNaN(numero) ? porDefecto : numero;
};
