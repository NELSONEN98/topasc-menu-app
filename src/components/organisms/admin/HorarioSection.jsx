import { HorarioModal } from '../HorarioModal';
import { SeccionHeader } from './SeccionHeader';
import { useHorariosAdmin } from '../../../hooks/useHorariosAdmin';
import { NOMBRE_DIA, aFormato12h } from '../../../utils/horarios';

export const HorarioSection = () => {
  const { horarios, resumen, modal, acciones } = useHorariosAdmin();

  return (
    <div>
      <SeccionHeader
        titulo="Horario"
        resumen={`${resumen.abiertos} días abiertos · ${resumen.cerrados} cerrados`}
      />

      <div className="horario-container">
        {horarios.map((horario) => (
          <div key={horario.diaSemana} className="horario-card">
            <div className="horario-day">
              <span className="horario-day-badge" />
              {NOMBRE_DIA[horario.diaSemana]}
            </div>

            {horario.cerrado ? (
              <div className="horario-closed">Cerrado</div>
            ) : (
              <div className="horario-times">
                <div className="horario-time-row">
                  <span className="horario-time-label">Entrada</span>
                  <span className="horario-time-value">
                    {aFormato12h(horario.horaApertura)}
                  </span>
                </div>
                <div className="horario-time-row">
                  <span className="horario-time-label">Salida</span>
                  <span className="horario-time-value">
                    {aFormato12h(horario.horaCierre)}
                  </span>
                </div>
              </div>
            )}

            <button
              className="horario-edit"
              onClick={() => modal.abrirEdicion(horario)}
              aria-label={`Editar el horario del ${NOMBRE_DIA[horario.diaSemana]}`}
            >
              Editar
            </button>
          </div>
        ))}
      </div>

      <HorarioModal
        isOpen={modal.abierto}
        onClose={modal.cerrar}
        horario={modal.editando}
        onSave={acciones.guardar}
      />
    </div>
  );
};
