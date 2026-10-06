import { useState, useEffect } from 'react';
import {
  categoriaEsBebida,
  categoriaAdmiteLeche,
  tipoBebidaDeCategoria,
} from '../../utils/categorias';
import { TIPOS_BEBIDA_LISTA } from '../../config/bebidas';
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
    // '' = esta categoria no vende bebidas envasadas.
    tipoBebida: '',
    /*
     * Las variantes en que se venden los productos de esta categoria: la pregunta
     * que ve el cliente ("¿Cuántas?") y las opciones.
     *
     * Las opciones van como texto separado por comas y no como un editor de filas:
     * cargar "6, 9, 12, 24, 36" de un tiron es mucho mas rapido que apretar
     * "agregar" cinco veces, y es una lista corta que se escribe de memoria.
     */
    varianteEtiqueta: '',
    varianteOpciones: '',
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
        tipoBebida: tipoBebidaDeCategoria(categoria) ?? '',
        varianteEtiqueta: categoria.variantes?.etiqueta ?? '',
        varianteOpciones: (categoria.variantes?.opciones ?? []).join(', '),
      });
    } else {
      setFormData({
        nombre: '',
        activo: true,
        esBebida: false,
        admiteLeche: false,
        tipoBebida: '',
        varianteEtiqueta: '',
        varianteOpciones: '',
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

          {/* Desplegable y no tres checkboxes: una categoría no puede ser gaseosa
              Y agua a la vez, y tres casillas permitirían justamente ese estado
              imposible. */}
          <div className="form-group">
            <label htmlFor="categoria-tipoBebida">Bebida envasada</label>
            <select
              id="categoria-tipoBebida"
              name="tipoBebida"
              value={formData.tipoBebida}
              onChange={handleChange}
            >
              <option value="">No vende bebidas envasadas</option>
              {TIPOS_BEBIDA_LISTA.map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.etiqueta}
                </option>
              ))}
            </select>
            <small className="form-ayuda">
              Al cargar un producto de esta categoría vas a poder ponerle precio a cada
              tamaño, y el cliente elige el tamaño al pedir. Cada tipo tiene los suyos:{' '}
              <strong>gaseosa</strong> 250 ml a 2.5 lt, <strong>jugo envasado</strong>{' '}
              (Hit, Del Valle) 200 ml a 2 lt, <strong>agua</strong> 600 ml,{' '}
              <strong>cerveza</strong> 473 ml. Los dos primeros además piden marca y sabor.
              Dejalo en "no vende" para los <strong>jugos naturales</strong> que se preparan
              en el local: esos usan el precio con leche de arriba.
            </small>
          </div>

          {/*
            Solo cuando NO es bebida envasada: ahí las variantes ya salen del
            catálogo del tipo (250 ml, 1.5 lt...) y dejar los dos a la vista sería
            ofrecer dos formas de definir lo mismo.

            Es el mecanismo para las alitas x6/x12, las picadas Personal/Familiar y
            cualquier cosa que hoy esté cargada como cinco productos distintos.
          */}
          {!formData.tipoBebida && (
            <>
              <div className="form-group">
                <label htmlFor="categoria-varianteOpciones">Se vende en variantes</label>
                <input
                  id="categoria-varianteOpciones"
                  type="text"
                  name="varianteOpciones"
                  value={formData.varianteOpciones}
                  onChange={handleChange}
                  placeholder="Ej: 6, 9, 12, 24, 36"
                />
                <small className="form-ayuda">
                  Separadas por comas. Al cargar un producto de esta categoría vas a
                  ponerle <strong>un precio a cada una</strong>, y el cliente elige al
                  pedir. Así las alitas son <strong>un</strong> producto con cinco
                  precios en vez de cinco productos. Dejalo vacío si cada producto
                  tiene un solo precio.
                </small>
              </div>

              {/* Solo tiene sentido si hay variantes: sin opciones, una pregunta
                  suelta no se le muestra a nadie. */}
              {formData.varianteOpciones.trim() !== '' && (
                <div className="form-group">
                  <label htmlFor="categoria-varianteEtiqueta">
                    Qué se le pregunta al cliente
                  </label>
                  <input
                    id="categoria-varianteEtiqueta"
                    type="text"
                    name="varianteEtiqueta"
                    value={formData.varianteEtiqueta}
                    onChange={handleChange}
                    placeholder="Ej: ¿Cuántas?"
                  />
                  <small className="form-ayuda">
                    Es el título que ve el cliente arriba de las opciones. En unas alitas
                    va <strong>"¿Cuántas?"</strong>; en una picada,{' '}
                    <strong>"¿Qué tamaño?"</strong>. Preguntarle el tamaño a unas alitas
                    no significa nada.
                  </small>
                </div>
              )}
            </>
          )}

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
