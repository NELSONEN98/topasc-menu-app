import { useState, useEffect } from 'react';
import { numeroDeInput } from '../../utils/numeroDeInput';
import '../styles/ProductModal.css';

export const GaseosaModal = ({ isOpen, onClose, presentacion, saboresExistentes = [], onSave }) => {
  const [formData, setFormData] = useState({
    sabor: '',
    tamano: '',
    precio: '',
    disponible: true,
  });

  useEffect(() => {
    if (presentacion) {
      setFormData({
        sabor: presentacion.sabor || '',
        tamano: presentacion.tamano || '',
        precio: presentacion.precio ?? '',
        disponible: presentacion.disponible !== false,
      });
    } else {
      setFormData({ sabor: '', tamano: '', precio: '', disponible: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentacion?._id, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const nuevo =
      type === 'checkbox' ? checked : name === 'precio' ? numeroDeInput(value) : value;

    setFormData((prev) => ({ ...prev, [name]: nuevo }));
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
          <h2>{presentacion ? 'Editar presentación' : 'Agregar presentación'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="gaseosa-sabor">Sabor *</label>
            {/*
              Input con datalist y no un select: el admin tiene que poder
              escribir un sabor nuevo, pero cuando carga el segundo tamaño de
              uno que ya existe conviene que lo elija de la lista y no que lo
              vuelva a tipear. "Coca Cola" y "Coca cola" serian dos sabores
              distintos en la pantalla del cliente.
            */}
            <input
              id="gaseosa-sabor"
              type="text"
              name="sabor"
              list="gaseosa-sabores"
              value={formData.sabor}
              onChange={handleChange}
              placeholder="Ej: Coca Cola"
              required
              autoFocus
            />
            <datalist id="gaseosa-sabores">
              {saboresExistentes.map((sabor) => (
                <option key={sabor} value={sabor} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label htmlFor="gaseosa-tamano">Tamaño *</label>
            <input
              id="gaseosa-tamano"
              type="text"
              name="tamano"
              value={formData.tamano}
              onChange={handleChange}
              placeholder="Ej: 2 litros"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="gaseosa-precio">Precio *</label>
            <input
              id="gaseosa-precio"
              type="number"
              name="precio"
              value={formData.precio}
              onChange={handleChange}
              min="0"
              required
            />
            <small style={{ fontSize: '12px', color: '#999', marginTop: '6px' }}>
              Es el precio final de esta combinación, no un adicional.
            </small>
          </div>

          {presentacion && (
            <div className="form-group form-checkbox">
              <label htmlFor="gaseosa-disponible">
                <input
                  id="gaseosa-disponible"
                  type="checkbox"
                  name="disponible"
                  checked={formData.disponible}
                  onChange={handleChange}
                />
                Disponible (se puede pedir hoy)
              </label>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save">
              {presentacion ? 'Guardar cambios' : 'Agregar presentación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
