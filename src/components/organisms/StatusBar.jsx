import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { BUSINESS_HOURS } from '../../config/settings';
import { aFormato12h } from '../../utils/horarios';
import './StatusBar.css';

const rangoAbierto = (apertura, cierre) =>
  `Abierto ${aFormato12h(apertura)} - ${aFormato12h(cierre)}`;

export const StatusBar = () => {
  const horarios = useQuery(api.horarios.listar);

  // El dia se resuelve con la hora local del navegador a proposito: Convex
  // corre en UTC y en Colombia (UTC-5) a partir de las 19:00 el servidor ya
  // esta en el dia siguiente, que es justo el horario fuerte del local.
  const horarioDeHoy = horarios?.find((h) => h.diaSemana === new Date().getDay());

  // Mientras la query carga mostramos el horario por defecto en lugar de un
  // vacio, asi la barra no salta de alto al montarse.
  const texto = !horarioDeHoy
    ? rangoAbierto(BUSINESS_HOURS.openTime, BUSINESS_HOURS.closeTime)
    : horarioDeHoy.cerrado
      ? 'Cerrado hoy'
      : rangoAbierto(horarioDeHoy.horaApertura, horarioDeHoy.horaCierre);

  return (
    <div className="status-bar">
      <span className="status-bar__schedule">{texto}</span>
    </div>
  );
};
