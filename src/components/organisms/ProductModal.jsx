import { useState, useEffect } from 'react';
import { IngredientesInput } from '../molecules/IngredientesInput';
import { resizeImage } from '../../utils/resizeImage';
import { numeroDeInput } from '../../utils/numeroDeInput';
import '../styles/ProductModal.css';

export const ProductModal = ({ isOpen, onClose, product, categorias, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    categoriaId: '',
    precio: '',
    descripcion: '',
    ingredientes: [],
    imagenUrl: '',
    disponible: true,
    llevaSalsas: true,
  });

  const [imagePreview, setImagePreview] = useState('');
  const [imageError, setImageError] = useState('');

  useEffect(() => {
    if (product) {
      setFormData({
        nombre: product.nombre || '',
        categoriaId: product.categoriaId || '',
        precio: product.precio ?? '',
        descripcion: product.descripcion || '',
        ingredientes: product.ingredientes || [],
        imagenUrl: product.imagenUrl || '',
        disponible: product.disponible !== false,
        llevaSalsas: product.llevaSalsas !== false,
      });
      setImagePreview(product.imagenUrl || '');
    } else {
      setFormData({
        nombre: '',
        categoriaId: categorias[0]?._id || '',
        precio: '',
        descripcion: '',
        ingredientes: [],
        imagenUrl: '',
        disponible: true,
        llevaSalsas: true,
      });
      setImagePreview('');
    }
    // Solo al ABRIR o al cambiar de producto. Nunca por `categorias`:
    // es una query reactiva de Convex y cada re-emision traia una
    // referencia nueva, lo que disparaba este efecto y borraba lo que el
    // usuario estaba escribiendo. El efecto lee `categorias` para elegir
    // la categoria por defecto, pero no debe reaccionar a sus cambios.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?._id, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue =
      type === 'checkbox' ? checked : name === 'precio' ? numeroDeInput(value) : value;

    setFormData(prev => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleIngredientesChange = (ingredientes) => {
    setFormData(prev => ({ ...prev, ingredientes }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setImageError('');
      const base64 = await resizeImage(file);
      setFormData(prev => ({
        ...prev,
        imagenUrl: base64,
      }));
      setImagePreview(base64);
    } catch (error) {
      console.error('Error al procesar la imagen:', error);
      setImageError('No se pudo procesar la imagen. Probá con otro archivo.');
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
            <label htmlFor="descripcion">Descripción</label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Cómo se sirve, para cuántos alcanza, qué lo hace especial..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="ingredientes">Ingredientes</label>
            <IngredientesInput
              ingredientes={formData.ingredientes}
              onChange={handleIngredientesChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="imageFile">Imagen del Producto</label>
            <input
              id="imageFile"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
            />
            <small style={{ fontSize: '12px', color: '#999', marginTop: '6px' }}>
              Se ajusta automáticamente para subirla liviana.
            </small>
            {imageError && (
              <small style={{ fontSize: '12px', color: '#E11E2B', marginTop: '6px' }}>
                {imageError}
              </small>
            )}
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

          <div className="form-group form-checkbox">
            <label htmlFor="llevaSalsas">
              <input
                id="llevaSalsas"
                type="checkbox"
                name="llevaSalsas"
                checked={formData.llevaSalsas}
                onChange={handleChange}
              />
              Lleva salsas (el cliente debe elegirlas al pedir)
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
