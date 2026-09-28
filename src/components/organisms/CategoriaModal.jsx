import { useState, useEffect } from 'react';
import {
  categoriaEsBebida,
  categoriaAdmiteLeche,
  categoriaEsGaseosa,
} from '../../utils/categorias';
import '../styles/ProductModal.css';

/**
 * El orden NO se edita aca.
 *
 * Habia un input numerico para escribir la posicion a mano. Con dos
 * formas de definir lo mismo, nada impedia asignarle el 3 a una categoria
 * que ya lo tenia, y dos posiciones iguales dejan el menu a merced de un
 * desempate interno. La posicion ahora se define en un solo lugar,
 * arrastrando en la tabla, que ademas siempre produce una secuencia
 * compacta y sin empates.
 */
export const CategoriaModal = ({ isOpen, onClose, categoria, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    activo: true,
    esBebida: false,
    admiteLeche: false,
    esGaseosa: false,
  });

  useEffect(() => {
    if (categoria) {
      setFormData({
        nombre: categoria.nombre || '',
        activo: categoria.activo !== false,
        // Los dos se hidratan con el valor EFECTIVO y no con el campo crudo. Una
        // categoría vieja sin el campo (como "JUGOS NATURALES" en producción)
        // funciona hoy por el respaldo del nombre: si el checkbox naciera
        // destildado, abrirla para renombrarla y guardar le escribiría un
        // `false` explícito, el campo le ganaría al nombre y se apagaría solo
        // algo que nadie pidió apagar.
        esBebida: categoriaEsBebida(categoria),
        admiteLeche: categoriaAdmiteLeche(categoria),
        esGaseosa: categoriaEsGaseosa(categoria),
      });
    } else {
      setFormData({
        nombre: '',
        activo: true,
        esBebida: false,
        admiteLeche: false,
        esGaseosa: false,
      });
    }
    // Mismo criterio que ProductModal: solo al abrir o al cambiar de
    // categoria.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria?._id, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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

          <div className="form-group form-checkbox">
            <label htmlFor="categoria-esBebida">
              <input
                id="categoria-esBebida"
                type="checkbox"
                name="esBebida"
                checked={formData.esBebida}
                onChange={handleChange}
              />
              Es categoría de bebidas
            </label>
            <small className="form-ayuda">
              Marcala para gaseosas, jugos, limonadas. Sus productos aparecen en el botón
              "¿Desea agregar bebida?" del carrito y nunca piden salsas.
            </small>
          </div>

          <div className="form-group form-checkbox">
            <label htmlFor="categoria-admiteLeche">
              <input
                id="categoria-admiteLeche"
                type="checkbox"
                name="admiteLeche"
                checked={formData.admiteLeche}
                onChange={handleChange}
              />
              Se puede pedir en agua o en leche
            </label>
            <small className="form-ayuda">
              Solo para los jugos. Es lo que hace aparecer el campo{' '}
              <strong>Precio con leche</strong> al cargar un producto de esta categoría.
              Dejala sin marcar en gaseosas: con leche no existen.
            </small>
          </div>

          <div className="form-group form-checkbox">
            <label htmlFor="categoria-esGaseosa">
              <input
                id="categoria-esGaseosa"
                type="checkbox"
                name="esGaseosa"
                checked={formData.esGaseosa}
                onChange={handleChange}
              />
              Son gaseosas de marca
            </label>
            <small className="form-ayuda">
              Coca Cola y Postobón. Al cargar un producto de esta categoría vas a poder
              elegir <strong>marca</strong>, <strong>sabor</strong> y el precio de cada{' '}
              <strong>tamaño</strong> (350 ml a 3 lt). No la marques junto con la de arriba:
              una gaseosa no se prepara con leche.
            </small>
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
