import { useState, useEffect } from 'react';
import { NOMBRE_DIA } from '../../utils/horarios';
import '../styles/ProductModal.css';

export const HorarioModal = ({ isOpen, onClose, horario, onSave }) => {
  const [formData, setFormData] = useState({
    horaApertura: '',
    horaCierre: '',
    cerrado: false,
  });

  useEffect(() => {
    if (!horario) return;

    setFormData({
      horaApertura: horario.horaApertura || '',
      horaCierre: horario.horaCierre || '',
      cerrado: horario.cerrado === true,
    });
    // Mismo criterio que el resto de los modales: solo al abrir o al cambiar
    // de dia, para no pisar lo que el usuario esta editando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horario?.diaSemana, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen || !horario) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Horario del {NOMBRE_DIA[horario.diaSemana]}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group form-checkbox">
            <label htmlFor="horario-cerrado">
              <input
                id="horario-cerrado"
                type="checkbox"
                name="cerrado"
                checked={formData.cerrado}
                onChange={handleChange}
              />
              Cerrado todo el día
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="horario-apertura">Entrada</label>
            <input
              id="horario-apertura"
              type="time"
              name="horaApertura"
              value={formData.horaApertura}
              onChange={handleChange}
              disabled={formData.cerrado}
              required={!formData.cerrado}
            />
          </div>

          <div className="form-group">
            <label htmlFor="horario-cierre">Salida</label>
            <input
              id="horario-cierre"
              type="time"
              name="horaCierre"
              value={formData.horaCierre}
              onChange={handleChange}
              disabled={formData.cerrado}
              required={!formData.cerrado}
            />
            <small style={{ fontSize: '12px', color: '#999', marginTop: '6px' }}>
              Si el local cierra después de medianoche, poné la salida en la
              madrugada (por ejemplo 00:00).
            </small>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save">
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
