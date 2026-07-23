// Convex envuelve el mensaje de un `throw` con su propio prefijo y stack.
// Nos quedamos con la primera linea limpia, que es la que escribimos nosotros
// en la mutation y la unica que le sirve a quien esta usando el admin.
export const mensajeDeError = (error) => {
  const texto = error?.message || '';
  const limpio = texto.split('\n')[0].replace(/^.*?Error:\s*/, '');
  return limpio || 'Error inesperado';
};
