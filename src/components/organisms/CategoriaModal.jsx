import { useState, useEffect } from 'react';
import '../styles/ProductModal.css';

export const CategoriaModal = ({ isOpen, onClose, categoria, siguienteOrden, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    orden: 1,
    activo: true,
  });

  useEffect(() => {
    if (categoria) {
      setFormData({
        nombre: categoria.nombre || '',
        orden: categoria.orden ?? 1,
        activo: categoria.activo !== false,
      });
    } else {
      setFormData({
        nombre: '',
        orden: siguienteOrden,
        activo: true,
      });
    }
  }, [categoria, siguienteOrden, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue =
      type === 'checkbox' ? checked : name === 'orden' ? parseInt(value) || 1 : value;

    setFormData((prev) => ({ ...prev, [name]: newValue }));
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

          <div className="form-group">
            <label htmlFor="categoria-orden">Orden</label>
            <input
              id="categoria-orden"
              type="number"
              name="orden"
              value={formData.orden}
              onChange={handleChange}
              min="1"
            />
            <small style={{ fontSize: '12px', color: '#999', marginTop: '6px' }}>
              Define en qué posición aparece en el menú del cliente.
            </small>
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
