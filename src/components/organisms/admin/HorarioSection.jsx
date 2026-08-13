import { HorarioModal } from '../HorarioModal';
import { SeccionHeader } from './SeccionHeader';
import { useHorariosAdmin, SEDE_GENERAL } from '../../../hooks/useHorariosAdmin';
import { NOMBRE_DIA, aFormato12h } from '../../../utils/horarios';

export const HorarioSection = () => {
  const {
    horarios,
    sedes,
    sedeId,
    setSedeId,
    editandoGeneral,
    sedeActual,
    resumen,
    modal,
    acciones,
  } = useHorariosAdmin();

  const resumenTexto = editandoGeneral
    ? `${resumen.abiertos} días abiertos · ${resumen.cerrados} cerrados`
    : `${resumen.abiertos} abiertos · ${resumen.cerrados} cerrados · ${resumen.heredados} siguen al general`;

  return (
    <div>
      <SeccionHeader titulo="Horario" resumen={resumenTexto} />

      <div className="horario-selector">
        <label htmlFor="horario-sede">Editando el horario de</label>
        <select
          id="horario-sede"
          value={sedeId}
          onChange={(e) => setSedeId(e.target.value)}
        >
          <option value={SEDE_GENERAL}>Todas las sedes (general)</option>
          {sedes.map((sede) => (
            <option key={sede._id} value={sede._id}>
              {sede.nombre}
              {sede.activo ? '' : ' (desactivada)'}
            </option>
          ))}
        </select>
      </div>

      <p className="admin-aviso admin-aviso--neutro">
        {editandoGeneral ? (
          <>
            Este es el horario base: lo usa toda sede que no tenga uno propio
            para ese día. Cambiarlo acá alcanza a todos los locales de una vez.
          </>
        ) : (
          <>
            Los días marcados como <strong>General</strong> siguen al horario
            base: si lo cambiás, {sedeActual?.nombre ?? 'esta sede'} lo sigue
            sola. Editá un día solo si este local abre distinto.
          </>
        )}
      </p>

      <div className="horario-container">
        {horarios.map((horario) => (
          <div key={horario.diaSemana} className="horario-card">
            <div className="horario-day">
              <span className="horario-day-badge" />
              {NOMBRE_DIA[horario.diaSemana]}
              {/* Sin esta marca, "abre 11:00 porque alguien lo decidio" y
                  "abre 11:00 porque nadie lo toco" se ven identicos. */}
              {!editandoGeneral && horario.heredado && (
                <span className="horario-badge-general">General</span>
              )}
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

            <div className="horario-acciones">
              <button
                className="horario-edit"
                onClick={() => modal.abrirEdicion(horario)}
                aria-label={`Editar el horario del ${NOMBRE_DIA[horario.diaSemana]}`}
              >
                Editar
              </button>

              {/* Solo si esta sede se desenganchó del general ese dia: si ya
                  lo hereda, no hay nada que restaurar. */}
              {!editandoGeneral && !horario.heredado && (
                <button
                  className="horario-restaurar"
                  onClick={() => acciones.restaurarGeneral(horario)}
                  aria-label={`Volver al horario general el ${NOMBRE_DIA[horario.diaSemana]}`}
                >
                  Volver al general
                </button>
              )}
            </div>
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
