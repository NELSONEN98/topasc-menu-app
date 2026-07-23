// Los horarios se guardan en 24h ("23:00") porque es el formato de
// <input type="time">. Para mostrarlos usamos 12h, que es como venia
// escrito el horario en el panel y como lo lee el cliente.

export const NOMBRE_DIA = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

export const aFormato12h = (hora) => {
  if (!hora) return '';

  const [horasStr, minutos = '00'] = hora.split(':');
  const horas = Number(horasStr);
  if (Number.isNaN(horas)) return hora;

  const periodo = horas >= 12 ? 'PM' : 'AM';
  const horas12 = horas % 12 === 0 ? 12 : horas % 12;

  return `${horas12}:${minutos} ${periodo}`;
};
