import { useState, useEffect } from 'react';
import '../styles/ProductModal.css';

const SIN_DATOS = [];

export const MesaModal = ({ isOpen, onClose, mesa, sedes = SIN_DATOS, onSave }) => {
  const [formData, setFormData] = useState({
    numero: '',
    sedeId: '',
    activo: true,
  });

  useEffect(() => {
    if (mesa) {
      setFormData({
        numero: mesa.numero || '',
        // Una mesa anterior al campo no tiene sede: el select arranca vacio y
        // el hook no deja guardar hasta que se elija una.
        sedeId: mesa.sedeId || '',
        activo: mesa.activo !== false,
      });
    } else {
      setFormData({
        numero: '',
        // A diferencia de las sedes en el modal de producto, aca NO se elige
        // una por defecto: una mesa esta en un local concreto y adivinarlo es
        // justamente lo que manda el pedido al lugar equivocado.
        sedeId: '',
        activo: true,
      });
    }
    // Mismo criterio que los otros modales: solo al abrir o al cambiar de
    // mesa, nunca por `sedes` (query reactiva, cada re-emision trae una
    // referencia nueva y borraria lo que el usuario esta escribiendo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesa?._id, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mesa ? 'Editar Mesa' : 'Agregar Mesa'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="mesa-numero">Número *</label>
            <input
              id="mesa-numero"
              type="text"
              name="numero"
              value={formData.numero}
              onChange={handleChange}
              placeholder="Ej: 5"
              required
              autoFocus
            />
            <small className="form-ayuda">
              La etiqueta que ve el local. Va impresa en el QR y viaja en el
              pedido.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="mesa-sedeId">Sede *</label>
            <select
              id="mesa-sedeId"
              name="sedeId"
              value={formData.sedeId}
              onChange={handleChange}
              required
            >
              <option value="">Elegí en qué local está</option>
              {sedes.map((sede) => (
                <option key={sede._id} value={sede._id}>
                  {sede.nombre}
                  {sede.activo ? '' : ' (desactivada)'}
                </option>
              ))}
            </select>
            <small className="form-ayuda">
              Define a qué WhatsApp llega el pedido de esta mesa y qué menú ve
              quien escanea su QR.
            </small>
          </div>

          {/* El codigo se muestra pero no se edita: es lo que quedo impreso en
              el sticker. Cambiarlo dejaria ese QR apuntando a la nada. */}
          {mesa && (
            <div className="form-group">
              <label htmlFor="mesa-codigo">Código del QR</label>
              <input id="mesa-codigo" type="text" value={mesa.codigo} readOnly disabled />
              <small className="form-ayuda">
                No se puede cambiar: es el código impreso en el QR pegado sobre
                la mesa. Para dar de baja la mesa, desactivala.
              </small>
            </div>
          )}

          {mesa && (
            <div className="form-group form-checkbox">
              <label htmlFor="mesa-activo">
                <input
                  id="mesa-activo"
                  type="checkbox"
                  name="activo"
                  checked={formData.activo}
                  onChange={handleChange}
                />
                Activa (su QR funciona)
              </label>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save">
              {mesa ? 'Guardar cambios' : 'Agregar mesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
