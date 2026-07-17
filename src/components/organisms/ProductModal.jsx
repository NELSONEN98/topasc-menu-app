import { useState, useEffect } from 'react';
import '../styles/ProductModal.css';

export const ProductModal = ({ isOpen, onClose, product, categorias, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    categoriaId: '',
    precio: 0,
    descripcion: '',
    disponible: true,
  });

  useEffect(() => {
    if (product) {
      setFormData(product);
    } else {
      setFormData({
        nombre: '',
        categoriaId: categorias[0]?._id || '',
        precio: 0,
        descripcion: '',
        disponible: true,
      });
    }
  }, [product, categorias, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name === 'precio' ? parseInt(value) : value,
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
          <h2>{product ? 'Editar Producto' : 'Agregar Producto'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="nombre">Nombre *</label>
            <input
              id="nombre"
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: Salchipapa Sencilla"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="categoriaId">Categoría *</label>
            <select
              id="categoriaId"
              name="categoriaId"
              value={formData.categoriaId}
              onChange={handleChange}
              required
            >
              <option value="">Selecciona una categoría</option>
              {categorias.map(cat => (
                <option key={cat._id} value={cat._id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="precio">Precio *</label>
            <input
              id="precio"
              type="number"
              name="precio"
              value={formData.precio}
              onChange={handleChange}
              placeholder="0"
              required
              min="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="descripcion">Descripción</label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Descripción del producto"
              rows="3"
            />
          </div>

          <div className="form-group form-checkbox">
            <label htmlFor="disponible">
              <input
                id="disponible"
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
              {product ? 'Guardar cambios' : 'Agregar producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
