import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatearPrecio } from '../../../utils/formatoPedido';

const textoProductos = (cantidad) =>
  cantidad === 0 ? 'Sin productos' : `${cantidad} producto${cantidad === 1 ? '' : 's'}`;

// Los tres estados del costo de domicilio son distintos y hay que poder
// distinguirlos de un vistazo: sin configurar, gratis, o un monto.
const textoDomicilio = (costo) => {
  if (costo === undefined || costo === null) return 'Por defecto';
  if (costo === 0) return 'Gratis';
  return formatearPrecio(costo);
};

/**
 * Manija de arrastre. Misma que en CategoriaFilaSortable: SVG y no un emoji,
 * porque el admin ya se limpio de emojis y un glifo hereda color y tamaño de
 * forma distinta en cada sistema.
 */
const IconoManija = () => (
  <svg
    width="10"
    height="16"
    viewBox="0 0 10 16"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="2" cy="3" r="1.4" />
    <circle cx="8" cy="3" r="1.4" />
    <circle cx="2" cy="8" r="1.4" />
    <circle cx="8" cy="8" r="1.4" />
    <circle cx="2" cy="13" r="1.4" />
    <circle cx="8" cy="13" r="1.4" />
  </svg>
);

/**
 * Fila de sede arrastrable.
 *
 * El arrastre vive en una manija dedicada y no en la fila entera: la fila tiene
 * tres controles adentro (activar, editar, eliminar) y si todo el bloque fuera
 * arrastrable cada clic competiria con el inicio de un drag.
 */
export const SedeFilaSortable = ({
  sede,
  posicion,
  productos,
  onEditar,
  onEliminar,
  onAlternarActivo,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sede._id });

  const estilo = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={estilo}
      className={`admin-table-row admin-table-row-sedes${
        isDragging ? ' admin-table-row--arrastrando' : ''
      }`}
    >
      <div className="admin-table-cell-orden" data-label="Orden">
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="categoria-manija"
          // dnd-kit conecta el teclado por aca: espacio levanta la fila,
          // flechas la mueven, espacio la suelta, escape cancela.
          aria-label={`Reordenar ${sede.nombre}, posición ${posicion}`}
          {...attributes}
          {...listeners}
        >
          <IconoManija />
        </button>
        {/* La posicion que se muestra es la de la lista, no `sede.orden`: las
            sedes que nunca se reordenaron no tienen ese campo y se veria
            vacio. */}
        <span className="categoria-orden-numero">{posicion}</span>
      </div>

      <div className="admin-table-cell-name">{sede.nombre}</div>

      {/* Clases distintas para Direccion y Productos aunque se vean igual: en
          mobile cada celda se ubica en la grilla por su clase, y dos celdas
          con la misma se superponen. */}
      <div className="admin-table-cell-direccion" data-label="Dirección">
        {sede.direccion || 'Sin dirección'}
      </div>

      <div className="admin-table-cell-whatsapp" data-label="WhatsApp">
        {sede.whatsapp}
      </div>

      <div className="admin-table-cell-domicilio" data-label="Domicilio">
        {textoDomicilio(sede.costoDomicilio)}
      </div>

      <div className="admin-table-cell-productos" data-label="Productos">
        {textoProductos(productos)}
      </div>

      <div className="admin-table-cell-status" data-label="Estado">
        <button
          className={`status-toggle ${sede.activo ? 'active' : ''}`}
          onClick={() => onAlternarActivo(sede)}
          title={
            sede.activo
              ? 'Clic para ocultarla del selector de sedes'
              : 'Clic para mostrarla en el selector de sedes'
          }
          aria-label={`${sede.nombre}: ${sede.activo ? 'visible' : 'oculta'} para el cliente`}
          aria-pressed={sede.activo}
        />
      </div>

      <div className="admin-table-actions">
        <button
          className="btn-edit"
          onClick={() => onEditar(sede)}
          aria-label={`Editar ${sede.nombre}`}
        >
          <span className="btn-texto">Editar</span>
        </button>
        <button
          className="btn-delete"
          onClick={() => onEliminar(sede)}
          disabled={productos > 0}
          title={
            productos > 0
              ? 'Tiene productos marcados: sacásela o desactivala'
              : 'Eliminar sede'
          }
          aria-label={`Eliminar ${sede.nombre}`}
        >
          <span className="btn-texto">Eliminar</span>
        </button>
      </div>
    </div>
  );
};
