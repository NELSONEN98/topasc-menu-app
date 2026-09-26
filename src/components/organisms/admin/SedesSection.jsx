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

import { SedeModal } from '../SedeModal';
import { SeccionHeader } from './SeccionHeader';
import { SedeFilaSortable } from './SedeFilaSortable';
import { useSedesAdmin } from '../../../hooks/useSedesAdmin';

export const SedesSection = () => {
  const { sedes, productosPorSede, resumen, modal, acciones } = useSedesAdmin();

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

    const desde = sedes.findIndex((sede) => sede._id === active.id);
    const hasta = sedes.findIndex((sede) => sede._id === over.id);
    if (desde === -1 || hasta === -1) return;

    // La mutation espera la lista COMPLETA ya acomodada, no un movimiento.
    const idsOrdenados = arrayMove(sedes, desde, hasta).map((sede) => sede._id);
    acciones.reordenar(idsOrdenados);
  };

  return (
    <div>
      <SeccionHeader
        titulo="Sedes"
        resumen={`${resumen.total} sedes · ${resumen.activas} activas`}
        textoAccion="+ Agregar sede"
        onAccion={modal.abrirNuevo}
      />

      <p className="admin-ayuda">
        Arrastrá una sede desde la manija para cambiar el orden en que el cliente la ve al
        elegir dónde pedir. También podés moverla con el teclado: enfocá la manija, espacio
        para levantarla, flechas para moverla, espacio de nuevo para soltarla.
      </p>

      <div className="admin-table-wrapper">
        <div className="admin-table-header admin-table-header-sedes">
          <div>Orden</div>
          <div>Nombre</div>
          <div>Dirección</div>
          <div>WhatsApp</div>
          <div>Domicilio</div>
          <div>Productos</div>
          <div>Estado</div>
          <div></div>
        </div>

        <div className="admin-table-body">
          {sedes.length === 0 ? (
            <p className="admin-vacio">Todavía no hay sedes cargadas.</p>
          ) : (
            <DndContext
              sensors={sensores}
              collisionDetection={closestCenter}
              onDragEnd={alSoltar}
            >
              <SortableContext
                items={sedes.map((sede) => sede._id)}
                strategy={verticalListSortingStrategy}
              >
                {sedes.map((sede, indice) => (
                  <SedeFilaSortable
                    key={sede._id}
                    sede={sede}
                    posicion={indice + 1}
                    productos={productosPorSede[sede._id] || 0}
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

      <SedeModal
        isOpen={modal.abierto}
        onClose={modal.cerrar}
        sede={modal.editando}
        onSave={acciones.guardar}
      />
    </div>
  );
};
