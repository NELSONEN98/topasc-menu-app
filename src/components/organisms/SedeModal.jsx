import { useState, useEffect } from 'react';
import { numeroDeInput } from '../../utils/numeroDeInput';
import { normalizarWhatsapp } from '../../utils/whatsapp';
import '../styles/ProductModal.css';

export const SedeModal = ({ isOpen, onClose, sede, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    whatsapp: '',
    costoDomicilio: '',
    activo: true,
  });

  useEffect(() => {
    if (sede) {
      setFormData({
        nombre: sede.nombre || '',
        // `direccion` es optional en el schema: una sede puede no tenerla.
        direccion: sede.direccion || '',
        whatsapp: sede.whatsapp || '',
        // `?? ''` y no `|| ''`: un domicilio gratis vale 0, y con `||` ese 0
        // se veria como campo vacio y al guardar volveria al valor de respaldo.
        costoDomicilio: sede.costoDomicilio ?? '',
        activo: sede.activo !== false,
      });
    } else {
      setFormData({
        nombre: '',
        direccion: '',
        whatsapp: '',
        costoDomicilio: '',
        activo: true,
      });
    }
    // Mismo criterio que ProductModal y CategoriaModal: solo al abrir o al
    // cambiar de sede. Este modal no lee ninguna query reactiva para armar sus
    // defaults, asi que no hace falta nada mas en las dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sede?._id, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // numeroDeInput mantiene "" como estado propio: vacio NO es cero. Sin eso
    // el campo no se puede borrar (backspace -> "" -> NaN -> vuelve a 0).
    const nuevoValor =
      type === 'checkbox'
        ? checked
        : name === 'costoDomicilio'
          ? numeroDeInput(value)
          : value;

    setFormData((prev) => ({ ...prev, [name]: nuevoValor }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  // Se recalcula en cada render y no en un useMemo: es una regex sobre un
  // string de doce caracteres, memoizarlo cuesta mas que hacerlo.
  const previewWhatsapp = normalizarWhatsapp(formData.whatsapp);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{sede ? 'Editar Sede' : 'Agregar Sede'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="sede-nombre">Nombre *</label>
            <input
              id="sede-nombre"
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: Sede Morichal"
              required
              autoFocus
            />
            <small className="form-ayuda">
              Es lo que ve el cliente al elegir dónde pedir, y queda guardado en
              cada pedido.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="sede-direccion">Dirección</label>
            <input
              id="sede-direccion"
              type="text"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              placeholder="Ej: Carrera 8 # 18-203"
            />
            <small className="form-ayuda">
              Opcional. Se muestra debajo del nombre en la pantalla de elección.
              Si la dejás vacía, simplemente no aparece.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="sede-whatsapp">WhatsApp *</label>
            <input
              id="sede-whatsapp"
              type="tel"
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleChange}
              placeholder="573206873870"
              inputMode="numeric"
              required
            />
            {/* Vista previa en vivo de como va a quedar guardado. Sin esto,
                que el sistema agregue el 57 solo seria magia invisible: el
                admin escribe una cosa, se guarda otra, y nunca se entera. */}
            <small className="form-ayuda">
              {previewWhatsapp.numero ? (
                <>
                  Se va a guardar como{' '}
                  <strong className="form-ayuda__dato">
                    {previewWhatsapp.numero}
                  </strong>
                  . Es el número al que llegan los pedidos de esta sede.
                </>
              ) : (
                <>
                  Número al que llegan los pedidos de esta sede. Podés escribirlo
                  con espacios o con +57: se limpia solo.
                </>
              )}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="sede-costoDomicilio">Costo de domicilio</label>
            <div className="input-con-prefijo">
              <span className="input-prefijo" aria-hidden="true">$</span>
              <input
                id="sede-costoDomicilio"
                type="number"
                name="costoDomicilio"
                value={formData.costoDomicilio}
                onChange={handleChange}
                placeholder="10000"
                min="0"
                inputMode="numeric"
              />
            </div>
            <small className="form-ayuda">
              Lo que cobra esta sede por llevar el pedido. Poné <strong>0</strong> si
              el envío es gratis. Si lo dejás vacío se usa el valor por defecto
              de la app.
            </small>
          </div>

          {/* Solo al editar: una sede recién creada nace activa. Mostrar el
              checkbox en el alta invita a crear una sede apagada, que es un
              estado sin ningún uso. */}
          {sede && (
            <div className="form-group form-checkbox">
              <label htmlFor="sede-activo">
                <input
                  id="sede-activo"
                  type="checkbox"
                  name="activo"
                  checked={formData.activo}
                  onChange={handleChange}
                />
                Activa (el cliente puede elegirla)
              </label>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save">
              {sede ? 'Guardar cambios' : 'Agregar sede'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
