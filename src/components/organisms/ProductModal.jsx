import { useState, useEffect } from 'react';
import { IngredientesInput } from '../molecules/IngredientesInput';
import { resizeImage } from '../../utils/resizeImage';
import { numeroDeInput } from '../../utils/numeroDeInput';
import '../styles/ProductModal.css';

// Referencia estable para el fallback: un `[]` nuevo por render no sirve como
// default de una prop que se lee dentro de un efecto.
const SIN_DATOS = [];

export const ProductModal = ({
  isOpen,
  onClose,
  product,
  categorias,
  sedes = SIN_DATOS,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    nombre: '',
    categoriaId: '',
    precio: '',
    descripcion: '',
    ingredientes: [],
    imagenUrl: '',
    disponible: true,
    llevaSalsas: true,
    sedeIds: [],
  });

  const [imagePreview, setImagePreview] = useState('');
  const [imageError, setImageError] = useState('');

  useEffect(() => {
    // Todas las sedes marcadas por defecto: la mayoria de los platos se venden
    // en todos los locales, y es mas rapido destildar una que tildar tres.
    // Un producto viejo sin `sedeIds` hoy se ve en todas las sedes, asi que
    // mostrarlas todas tildadas no cambia su comportamiento — solo lo deja
    // explicito la proxima vez que se guarde.
    const todasLasSedes = sedes.map((s) => s._id);

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
        sedeIds: product.sedeIds?.length ? product.sedeIds : todasLasSedes,
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
        sedeIds: todasLasSedes,
      });
      setImagePreview('');
    }
    // Solo al ABRIR o al cambiar de producto. Nunca por `categorias` ni por
    // `sedes`: son queries reactivas de Convex y cada re-emision traia una
    // referencia nueva, lo que disparaba este efecto y borraba lo que el
    // usuario estaba escribiendo. El efecto las lee para elegir los valores
    // por defecto, pero no debe reaccionar a sus cambios.
    //
    // `sedes.length` SI va como dependencia, y es distinto: es un numero, no
    // una referencia, asi que una re-emision con las mismas sedes no lo mueve.
    // Hace falta porque si el modal se abre antes de que la query resuelva,
    // `todasLasSedes` sale vacio y los checkboxes quedan todos destildados —
    // en una edicion eso hace que un plato que se vende en las tres sedes
    // parezca no venderse en ninguna, y guardarlo asi lo sacaria de dos
    // locales. Cambiar de 0 a 3 tiene que volver a marcar los defaults.
    //
    // Que se dispare a mitad de una edicion y borre el formulario no es un
    // riesgo real: para eso tendria que aparecer o desaparecer una sede, y las
    // sedes solo se tocan con `sedes:sincronizar`, que es una internalMutation
    // que se corre por CLI. Desde la app no hay forma de cambiar ese numero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?._id, isOpen, sedes.length]);

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
          <fieldset className="form-seccion">
            <legend className="form-seccion__titulo">Datos básicos</legend>

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

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="precio">Precio *</label>
                <div className="input-con-prefijo">
                  <span className="input-prefijo" aria-hidden="true">$</span>
                  <input
                    id="precio"
                    type="number"
                    name="precio"
                    value={formData.precio}
                    onChange={handleChange}
                    placeholder="0"
                    required
                    min="0"
                    inputMode="numeric"
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
                  <option value="">Elegí una categoría</option>
                  {categorias.map(cat => (
                    <option key={cat._id} value={cat._id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset className="form-seccion">
            <legend className="form-seccion__titulo">Sedes</legend>

            {sedes.map((sede) => (
              <label
                key={sede._id}
                className="opcion-tarjeta"
                htmlFor={`sede-${sede._id}`}
              >
                <input
                  id={`sede-${sede._id}`}
                  type="checkbox"
                  checked={formData.sedeIds.includes(sede._id)}
                  onChange={() => alternarSede(sede._id)}
                />
                <span className="opcion-tarjeta__texto">
                  <strong>{sede.nombre}</strong>
                  {/* Una sede apagada se sigue mostrando (ver la nota en
                      useProductosAdmin), pero avisando: si no, el admin la
                      marca creyendo que el plato se va a ver ahi. */}
                  <small>
                    {sede.activo
                      ? sede.direccion || 'Se vende en este local.'
                      : 'Sede desactivada: hoy el cliente no puede elegirla.'}
                  </small>
                </span>
              </label>
            ))}

            <small className="form-ayuda">
              El plato solo aparece en el menú de las sedes marcadas. Tiene que
              estar en al menos una.
            </small>
          </fieldset>

          <fieldset className="form-seccion">
            <legend className="form-seccion__titulo">Detalle</legend>

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
              <small className="form-ayuda">
                Texto libre. Los ingredientes van aparte, acá abajo.
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="ingredientes">Ingredientes</label>
              <IngredientesInput
                ingredientes={formData.ingredientes}
                onChange={handleIngredientesChange}
              />
            </div>
          </fieldset>

          <fieldset className="form-seccion">
            <legend className="form-seccion__titulo">Imagen</legend>

            <div className="campo-imagen">
              <div className="campo-imagen__preview">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Vista previa del producto"
                    onError={() => setImagePreview('')}
                  />
                ) : (
                  <span className="campo-imagen__vacio" aria-hidden="true">📷</span>
                )}
              </div>

              <div className="campo-imagen__control">
                <label htmlFor="imageFile" className="campo-imagen__boton">
                  {imagePreview ? 'Cambiar imagen' : 'Subir imagen'}
                </label>
                <input
                  id="imageFile"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="campo-imagen__input"
                />
                <small className="form-ayuda">
                  Se ajusta automáticamente para subirla liviana.
                </small>
                {imageError && (
                  <small className="form-error">{imageError}</small>
                )}
              </div>
            </div>
          </fieldset>

          <fieldset className="form-seccion">
            <legend className="form-seccion__titulo">Disponibilidad</legend>

            <label className="opcion-tarjeta" htmlFor="disponible">
              <input
                id="disponible"
                type="checkbox"
                name="disponible"
                checked={formData.disponible}
                onChange={handleChange}
              />
              <span className="opcion-tarjeta__texto">
                <strong>Disponible</strong>
                <small>Se muestra en el menú del cliente.</small>
              </span>
            </label>

            <label className="opcion-tarjeta" htmlFor="llevaSalsas">
              <input
                id="llevaSalsas"
                type="checkbox"
                name="llevaSalsas"
                checked={formData.llevaSalsas}
                onChange={handleChange}
              />
              <span className="opcion-tarjeta__texto">
                <strong>Lleva salsas</strong>
                <small>El cliente debe elegirlas al pedir.</small>
              </span>
            </label>
          </fieldset>

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
