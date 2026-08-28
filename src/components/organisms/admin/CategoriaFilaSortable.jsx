import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const textoProductos = (cantidad) =>
  cantidad === 0 ? 'Sin productos' : `${cantidad} producto${cantidad === 1 ? '' : 's'}`;

/**
 * Manija de arrastre.
 *
 * SVG y no un emoji: el admin ya se limpio de emojis, y ademas un glifo
 * hereda el color y el tamaño del texto de forma distinta en cada sistema.
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
 * Fila de categoria arrastrable.
 *
 * El arrastre vive en una manija dedicada, no en la fila entera. La fila
 * tiene tres controles adentro (activar, editar, eliminar) y si todo el
 * bloque fuera arrastrable cada clic competiria con el inicio de un drag.
 * La manija separa "muevo" de "toco".
 */
export const CategoriaFilaSortable = ({
  categoria,
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
  } = useSortable({ id: categoria._id });

  const estilo = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={estilo}
      className={`admin-table-row admin-table-row-categorias${
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
          aria-label={`Reordenar ${categoria.nombre}, posición ${categoria.orden}`}
          {...attributes}
          {...listeners}
        >
          <IconoManija />
        </button>
        <span className="categoria-orden-numero">{categoria.orden}</span>
      </div>

      <div className="admin-table-cell-name">{categoria.nombre}</div>

      <div className="admin-table-cell-category" data-label="Productos">
        {textoProductos(productos)}
      </div>

      <div className="admin-table-cell-status" data-label="Estado">
        <button
          className={`status-toggle ${categoria.activo ? 'active' : ''}`}
          onClick={() => onAlternarActivo(categoria)}
          title={
            categoria.activo ? 'Clic para ocultar del menú' : 'Clic para mostrar en el menú'
          }
          aria-label={`${categoria.nombre}: ${categoria.activo ? 'visible' : 'oculta'} en el menú`}
          aria-pressed={categoria.activo}
        />
      </div>

      <div className="admin-table-actions">
        <button
          className="btn-edit"
          onClick={() => onEditar(categoria)}
          aria-label={`Editar ${categoria.nombre}`}
        >
          <span className="btn-texto">Editar</span>
        </button>
        <button
          className="btn-delete"
          onClick={() => onEliminar(categoria)}
          disabled={productos > 0}
          title={
            productos > 0 ? 'Tiene productos: movelos o desactivala' : 'Eliminar categoría'
          }
          aria-label={`Eliminar ${categoria.nombre}`}
        >
          <span className="btn-texto">Eliminar</span>
        </button>
      </div>
    </div>
  );
};
