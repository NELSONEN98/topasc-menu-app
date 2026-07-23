import { SeccionHeader } from './SeccionHeader';

// TODO: estos horarios son fijos. La tabla `horariosAtencion` ya existe en
// el schema de Convex, falta la query/mutation y conectarlos acá.
const HORARIOS = [
  { dia: 'Lunes', entrada: '11:00 AM', salida: '11:00 PM', abierto: true },
  { dia: 'Martes', entrada: '11:00 AM', salida: '11:00 PM', abierto: true },
  { dia: 'Miércoles', entrada: '11:00 AM', salida: '11:00 PM', abierto: true },
  { dia: 'Jueves', entrada: '11:00 AM', salida: '11:00 PM', abierto: true },
  { dia: 'Viernes', entrada: '11:00 AM', salida: '12:00 AM', abierto: true },
  { dia: 'Sábado', entrada: '12:00 PM', salida: '12:00 AM', abierto: true },
  { dia: 'Domingo', entrada: '12:00 PM', salida: '10:00 PM', abierto: true },
];

export const HorarioSection = () => (
  <div>
    <SeccionHeader titulo="Horario" resumen="Configura el horario de atención semanal" />

    <div className="horario-container">
      {HORARIOS.map((horario) => (
        <div key={horario.dia} className="horario-card">
          <div className="horario-day">
            <span className="horario-day-badge" />
            {horario.dia}
          </div>

          {horario.abierto ? (
            <div className="horario-times">
              <div className="horario-time-row">
                <span className="horario-time-label">Entrada</span>
                <span className="horario-time-value">{horario.entrada}</span>
              </div>
              <div className="horario-time-row">
                <span className="horario-time-label">Salida</span>
                <span className="horario-time-value">{horario.salida}</span>
              </div>
            </div>
          ) : (
            <div className="horario-closed">Cerrado</div>
          )}

          <button className="horario-edit">Editar</button>
        </div>
      ))}
    </div>
  </div>
);
