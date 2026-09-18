import { useState, useEffect } from 'react';
import { resizeImage } from '../../utils/resizeImage';
import { numeroDeInput } from '../../utils/numeroDeInput';
import '../styles/ProductModal.css';

// Referencia estable para el fallback: un `[]` nuevo por render no sirve como
// default de una prop que se lee dentro de un efecto.
const SIN_DATOS = [];

export const PromocionFormModal = ({
  isOpen,
  onClose,
  promocion,
  sedes = SIN_DATOS,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    precio: '',
    imagenUrl: '',
    activa: true,
    sedeIds: [],
  });
  const [imagePreview, setImagePreview] = useState('');
  const [imageError, setImageError] = useState('');

  useEffect(() => {
    // Todas las sedes marcadas por defecto, igual que en ProductModal: lo
    // normal es que una promo corra en todos los locales, y es mas rapido
    // destildar uno que tildar tres.
    const todasLasSedes = sedes.map((s) => s._id);

    if (promocion) {
      setFormData({
        titulo: promocion.titulo || '',
        descripcion: promocion.descripcion || '',
        precio: promocion.precio ?? '',
        imagenUrl: promocion.imagenUrl || '',
        activa: promocion.activa !== false,
        sedeIds: promocion.sedeIds?.length ? promocion.sedeIds : todasLasSedes,
      });
      setImagePreview(promocion.imagenUrl || '');
    } else {
      setFormData({
        titulo: '',
        descripcion: '',
        precio: '',
        imagenUrl: '',
        activa: true,
        sedeIds: todasLasSedes,
      });
      setImagePreview('');
    }
    // Mismo criterio que ProductModal: solo al abrir o al cambiar de promo.
    // `sedes.length` va como dependencia por la misma razon que alla: si el
    // modal se abre antes de que resuelva la query, `todasLasSedes` sale
    // vacio y los checkboxes quedan todos destildados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promocion?._id, isOpen, sedes.length]);

  const alternarSede = (sedeId) => {
    setFormData((prev) => ({
      ...prev,
      sedeIds: prev.sedeIds.includes(sedeId)
        ? prev.sedeIds.filter((id) => id !== sedeId)
        : [...prev.sedeIds, sedeId],
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const nuevoValor =
      type === 'checkbox' ? checked : name === 'precio' ? numeroDeInput(value) : value;

    setFormData((prev) => ({ ...prev, [name]: nuevoValor }));
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

  const quitarImagen = () => {
    setFormData((prev) => ({ ...prev, imagenUrl: '' }));
    setImagePreview('');
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
          <h2>{promocion ? 'Editar Promo' : 'Agregar Promo'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="promo-titulo">Título *</label>
            <input
              id="promo-titulo"
              type="text"
              name="titulo"
              value={formData.titulo}
              onChange={handleChange}
              placeholder="Ej: 2x1 en salchipapas"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="promo-descripcion">Descripción</label>
            <textarea
              id="promo-descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Ej: Válido solo hoy, de 6 a 9 pm"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="promo-precio">Precio</label>
            <div className="input-con-prefijo">
              <span className="input-prefijo" aria-hidden="true">$</span>
              <input
                id="promo-precio"
                type="number"
                name="precio"
                value={formData.precio}
                onChange={handleChange}
                placeholder="15000"
                min="0"
                inputMode="numeric"
              />
            </div>
            <small className="form-ayuda">
              Opcional. Dejalo vacío si la promo no se resume en un precio único (ej. "10% en
              combos").
            </small>
          </div>

          <fieldset className="form-seccion">
            <legend className="form-seccion__titulo">Sedes</legend>

            {sedes.map((sede) => (
              <label
                key={sede._id}
                className="opcion-tarjeta"
                htmlFor={`promo-sede-${sede._id}`}
              >
                <input
                  id={`promo-sede-${sede._id}`}
                  type="checkbox"
                  checked={formData.sedeIds.includes(sede._id)}
                  onChange={() => alternarSede(sede._id)}
                />
                <span className="opcion-tarjeta__texto">
                  <strong>{sede.nombre}</strong>
                  {/* Una sede apagada se sigue mostrando, igual que en
                      ProductModal: si no, el admin la marca creyendo que la
                      promo se va a ver ahi. */}
                  <small>
                    {sede.activo
                      ? sede.direccion || 'La promo corre en este local.'
                      : 'Sede desactivada: hoy el cliente no puede elegirla.'}
                  </small>
                </span>
              </label>
            ))}

            <small className="form-ayuda">
              La promo solo se muestra a los clientes de las sedes marcadas. Tiene que estar
              en al menos una.
            </small>
          </fieldset>

          <div className="campo-imagen">
            <div className="campo-imagen__preview">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Vista previa de la promo"
                  onError={() => setImagePreview('')}
                />
              ) : (
                <span className="campo-imagen__vacio" aria-hidden="true">📷</span>
              )}
            </div>

            <div className="campo-imagen__control">
              <label htmlFor="promo-imagen" className="campo-imagen__boton">
                {imagePreview ? 'Cambiar imagen' : 'Subir imagen'}
              </label>
              <input
                id="promo-imagen"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="campo-imagen__input"
              />
              <small className="form-ayuda">
                Opcional. Se ajusta automáticamente para subirla liviana.
              </small>
              {imageError && <small className="form-error">{imageError}</small>}
              {imagePreview && (
                <button type="button" className="btn-delete" onClick={quitarImagen}>
                  <span className="btn-texto">Quitar imagen</span>
                </button>
              )}
            </div>
          </div>

          <div className="form-group form-checkbox">
            <label htmlFor="promo-activa">
              <input
                id="promo-activa"
                type="checkbox"
                name="activa"
                checked={formData.activa}
                onChange={handleChange}
              />
              Activa (se muestra en el menú)
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save">
              {promocion ? 'Guardar cambios' : 'Agregar promo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
