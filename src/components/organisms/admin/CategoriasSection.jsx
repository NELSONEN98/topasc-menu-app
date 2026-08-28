import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { CategoriaModal } from '../CategoriaModal';
import { SeccionHeader } from './SeccionHeader';
import { CategoriaFilaSortable } from './CategoriaFilaSortable';
import { useCategoriasAdmin } from '../../../hooks/useCategoriasAdmin';

export const CategoriasSection = () => {
  const { categorias, productosPorCategoria, resumen, modal, acciones } = useCategoriasAdmin();

  const sensores = useSensors(
    useSensor(PointerSensor, {
      // Sin esta distancia minima, apoyar el dedo o el mouse sobre la manija
      // ya arranca un drag y se come el clic. 8px separa "toque" de "arrastre".
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const alSoltar = ({ active, over }) => {
    // `over` viene null si se solto fuera de la lista.
    if (!over || active.id === over.id) return;

    const desde = categorias.findIndex((cat) => cat._id === active.id);
    const hasta = categorias.findIndex((cat) => cat._id === over.id);
    if (desde === -1 || hasta === -1) return;

    // La mutation espera la lista COMPLETA ya acomodada, no un movimiento.
    const idsOrdenados = arrayMove(categorias, desde, hasta).map((cat) => cat._id);
    acciones.reordenar(idsOrdenados);
  };

  return (
    <div>
      <SeccionHeader
        titulo="Categorías"
        resumen={`${resumen.total} categorías · ${resumen.activas} activas`}
        textoAccion="+ Agregar categoría"
        onAccion={modal.abrirNuevo}
      />

      <p className="admin-ayuda">
        Arrastrá una categoría desde la manija para cambiar el orden en que aparece en el
        menú. También podés moverla con el teclado: enfocá la manija, espacio para
        levantarla, flechas para moverla, espacio de nuevo para soltarla.
      </p>

      <div className="admin-table-wrapper">
        <div className="admin-table-header admin-table-header-categorias">
          <div>Orden</div>
          <div>Nombre</div>
          <div>Productos</div>
          <div>Estado</div>
          <div></div>
        </div>

        <div className="admin-table-body">
          {categorias.length === 0 ? (
            <p className="admin-vacio">Todavía no hay categorías cargadas.</p>
          ) : (
            <DndContext
              sensors={sensores}
              collisionDetection={closestCenter}
              onDragEnd={alSoltar}
            >
              <SortableContext
                items={categorias.map((cat) => cat._id)}
                strategy={verticalListSortingStrategy}
              >
                {categorias.map((categoria) => (
                  <CategoriaFilaSortable
                    key={categoria._id}
                    categoria={categoria}
                    productos={productosPorCategoria[categoria._id] || 0}
                    onEditar={modal.abrirEdicion}
                    onEliminar={acciones.eliminar}
                    onAlternarActivo={acciones.alternarActivo}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      <CategoriaModal
        isOpen={modal.abierto}
        onClose={modal.cerrar}
        categoria={modal.editando}
        onSave={acciones.guardar}
      />
    </div>
  );
};
