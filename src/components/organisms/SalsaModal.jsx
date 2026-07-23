import { useState, useEffect } from 'react';
import { numeroDeInput } from '../../utils/numeroDeInput';
import '../styles/ProductModal.css';

export const SalsaModal = ({ isOpen, onClose, salsa, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'base',
    precio: '',
    disponible: true,
  });

  useEffect(() => {
    if (salsa) {
      setFormData({
        nombre: salsa.nombre || '',
        tipo: salsa.tipo || 'base',
        precio: salsa.precio ?? '',
        disponible: salsa.disponible !== false,
      });
    } else {
      setFormData({
        nombre: '',
        tipo: 'base',
        precio: '',
        disponible: true,
      });
    }
    // Mismo criterio que ProductModal: solo al abrir o al cambiar de salsa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salsa?._id, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue =
      type === 'checkbox' ? checked : name === 'precio' ? numeroDeInput(value) : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
      // Las salsas base son gratis siempre
      ...(name === 'tipo' && newValue === 'base' ? { precio: 0 } : {}),
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
          <h2>{salsa ? 'Editar Salsa' : 'Agregar Salsa'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="salsa-nombre">Nombre *</label>
            <input
              id="salsa-nombre"
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: Salsa de Ajo"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="salsa-tipo">Tipo *</label>
              <select
                id="salsa-tipo"
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                required
              >
                <option value="base">Base (gratis, incluida)</option>
                <option value="especial">Especial (paga, opcional)</option>
              </select>
            </div>

            {formData.tipo === 'especial' && (
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="salsa-precio">Precio *</label>
                <input
                  id="salsa-precio"
                  type="number"
                  name="precio"
                  value={formData.precio}
                  onChange={handleChange}
                  placeholder="0"
                  required
                  min="0"
                />
              </div>
            )}
          </div>

          <div className="form-group form-checkbox">
            <label htmlFor="salsa-disponible">
              <input
                id="salsa-disponible"
                type="checkbox"
                name="disponible"
                checked={formData.disponible}
                onChange={handleChange}
              />
              Disponible
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save">
              {salsa ? 'Guardar cambios' : 'Agregar salsa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
