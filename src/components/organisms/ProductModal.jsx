import { useState, useEffect } from 'react';
import '../styles/ProductModal.css';

export const ProductModal = ({ isOpen, onClose, product, categorias, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    categoriaId: '',
    precio: 0,
    descripcion: '',
    imagenUrl: '',
    disponible: true,
  });

  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    if (product) {
      setFormData({
        nombre: product.nombre || '',
        categoriaId: product.categoriaId || '',
        precio: product.precio || 0,
        descripcion: product.descripcion || '',
        imagenUrl: product.imagenUrl || '',
        disponible: product.disponible !== false,
      });
      setImagePreview(product.imagenUrl || '');
    } else {
      setFormData({
        nombre: '',
        categoriaId: categorias[0]?._id || '',
        precio: 0,
        descripcion: '',
        imagenUrl: '',
        disponible: true,
      });
      setImagePreview('');
    }
  }, [product, categorias, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : name === 'precio' ? parseInt(value) || 0 : value;

    setFormData(prev => ({
      ...prev,
      [name]: newValue,
    }));

    if (name === 'imagenUrl') {
      setImagePreview(value);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        setFormData(prev => ({
          ...prev,
          imagenUrl: base64,
        }));
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{product ? 'Editar Producto' : 'Agregar Producto'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
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

            <div className="form-group" style={{ flex: 1 }}>
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
            <label htmlFor="descripcion">Descripción / Ingredientes</label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Descripción y ingredientes del producto"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Imagen del Producto</label>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <input
                id="imageFile"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ flex: 1 }}
              />
            </div>
            <label htmlFor="imagenUrl" style={{ fontSize: '12px', color: '#999', display: 'block', marginBottom: '8px' }}>
              O pegá una URL de imagen
            </label>
            <input
              id="imagenUrl"
              type="url"
              name="imagenUrl"
              value={formData.imagenUrl}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {imagePreview && (
            <div style={{
              padding: '16px',
              background: '#F8F5F0',
              borderRadius: '8px',
              textAlign: 'center',
              marginBottom: '20px',
            }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Vista previa
              </label>
              <img
                src={imagePreview}
                alt="preview"
                style={{
                  maxWidth: '200px',
                  maxHeight: '200px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  border: '1px solid #ddd',
                }}
                onError={() => setImagePreview('')}
              />
            </div>
          )}

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
