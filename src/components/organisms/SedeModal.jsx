import { useState, useEffect } from 'react';
import '../styles/ProductModal.css';

export const SedeModal = ({ isOpen, onClose, sede, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    whatsapp: '',
    activo: true,
  });

  useEffect(() => {
    if (sede) {
      setFormData({
        nombre: sede.nombre || '',
        // `direccion` es optional en el schema: una sede puede no tenerla.
        direccion: sede.direccion || '',
        whatsapp: sede.whatsapp || '',
        activo: sede.activo !== false,
      });
    } else {
      setFormData({
        nombre: '',
        direccion: '',
        whatsapp: '',
        activo: true,
      });
    }
    // Mismo criterio que ProductModal y CategoriaModal: solo al abrir o al
    // cambiar de sede. Este modal no lee ninguna query reactiva para armar sus
    // defaults, asi que no hace falta nada mas en las dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sede?._id, isOpen]);

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
          <h2>{sede ? 'Editar Sede' : 'Agregar Sede'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="sede-nombre">Nombre *</label>
            <input
              id="sede-nombre"
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: Sede Morichal"
              required
              autoFocus
            />
            <small className="form-ayuda">
              Es lo que ve el cliente al elegir dónde pedir, y queda guardado en
              cada pedido.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="sede-direccion">Dirección</label>
            <input
              id="sede-direccion"
              type="text"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              placeholder="Ej: Carrera 8 # 18-203"
            />
            <small className="form-ayuda">
              Opcional. Se muestra debajo del nombre en la pantalla de elección.
              Si la dejás vacía, simplemente no aparece.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="sede-whatsapp">WhatsApp *</label>
            <input
              id="sede-whatsapp"
              type="tel"
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleChange}
              placeholder="573206873870"
              inputMode="numeric"
              required
            />
            <small className="form-ayuda">
              Número al que llegan los pedidos de esta sede, con código de país
              y sin el +. Se guardan solo los dígitos.
            </small>
          </div>

          {/* Solo al editar: una sede recién creada nace activa. Mostrar el
              checkbox en el alta invita a crear una sede apagada, que es un
              estado sin ningún uso. */}
          {sede && (
            <div className="form-group form-checkbox">
              <label htmlFor="sede-activo">
                <input
                  id="sede-activo"
                  type="checkbox"
                  name="activo"
                  checked={formData.activo}
                  onChange={handleChange}
                />
                Activa (el cliente puede elegirla)
              </label>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save">
              {sede ? 'Guardar cambios' : 'Agregar sede'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
