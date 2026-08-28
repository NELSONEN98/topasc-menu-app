import { useState, useEffect } from 'react';
import '../styles/ProductModal.css';

/**
 * El orden NO se edita aca.
 *
 * Habia un input numerico para escribir la posicion a mano. Con dos
 * formas de definir lo mismo, nada impedia asignarle el 3 a una categoria
 * que ya lo tenia, y dos posiciones iguales dejan el menu a merced de un
 * desempate interno. La posicion ahora se define en un solo lugar,
 * arrastrando en la tabla, que ademas siempre produce una secuencia
 * compacta y sin empates.
 */
export const CategoriaModal = ({ isOpen, onClose, categoria, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    activo: true,
  });

  useEffect(() => {
    if (categoria) {
      setFormData({
        nombre: categoria.nombre || '',
        activo: categoria.activo !== false,
      });
    } else {
      setFormData({
        nombre: '',
        activo: true,
      });
    }
    // Mismo criterio que ProductModal: solo al abrir o al cambiar de
    // categoria.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria?._id, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
          <h2>{categoria ? 'Editar Categoría' : 'Agregar Categoría'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="categoria-nombre">Nombre *</label>
            <input
              id="categoria-nombre"
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: Hamburguesas"
              required
              autoFocus
            />
          </div>

          <div className="form-group form-checkbox">
            <label htmlFor="categoria-activo">
              <input
                id="categoria-activo"
                type="checkbox"
                name="activo"
                checked={formData.activo}
                onChange={handleChange}
              />
              Activa (visible en el menú)
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save">
              {categoria ? 'Guardar cambios' : 'Agregar categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
