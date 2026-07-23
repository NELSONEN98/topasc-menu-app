import { useState, useEffect } from 'react';
import { resizeImage } from '../../utils/resizeImage';
import '../styles/ProductModal.css';

export const SalsaModal = ({ isOpen, onClose, salsa, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'base',
    precio: 0,
    imagenUrl: '',
    disponible: true,
  });

  const [imagePreview, setImagePreview] = useState('');
  const [imageError, setImageError] = useState('');

  useEffect(() => {
    if (salsa) {
      setFormData({
        nombre: salsa.nombre || '',
        tipo: salsa.tipo || 'base',
        precio: salsa.precio || 0,
        imagenUrl: salsa.imagenUrl || '',
        disponible: salsa.disponible !== false,
      });
      setImagePreview(salsa.imagenUrl || '');
    } else {
      setFormData({
        nombre: '',
        tipo: 'base',
        precio: 0,
        imagenUrl: '',
        disponible: true,
      });
      setImagePreview('');
    }
  }, [salsa, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue =
      type === 'checkbox' ? checked : name === 'precio' ? parseInt(value) || 0 : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
      // Las salsas base son gratis siempre
      ...(name === 'tipo' && newValue === 'base' ? { precio: 0 } : {}),
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setImageError('');
      const base64 = await resizeImage(file);
      setFormData((prev) => ({ ...prev, imagenUrl: base64 }));
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

          <div className="form-group">
            <label htmlFor="salsa-imageFile">Imagen de la salsa (opcional)</label>
            <input
              id="salsa-imageFile"
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
