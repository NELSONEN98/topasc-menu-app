import { SedeModal } from '../SedeModal';
import { SeccionHeader } from './SeccionHeader';
import { useSedesAdmin } from '../../../hooks/useSedesAdmin';

const textoProductos = (cantidad) =>
  cantidad === 0 ? 'Sin productos' : `${cantidad} producto${cantidad === 1 ? '' : 's'}`;

export const SedesSection = () => {
  const { sedes, productosPorSede, resumen, modal, acciones } = useSedesAdmin();

  return (
    <div>
      <SeccionHeader
        titulo="Sedes"
        resumen={`${resumen.total} sedes · ${resumen.activas} activas`}
        textoAccion="+ Agregar sede"
        onAccion={modal.abrirNuevo}
      />

      <div className="admin-table-wrapper">
        <div className="admin-table-header admin-table-header-sedes">
          <div>Nombre</div>
          <div>Dirección</div>
          <div>WhatsApp</div>
          <div>Productos</div>
          <div>Estado</div>
          <div></div>
        </div>

        <div className="admin-table-body">
          {sedes.length === 0 ? (
            <p className="admin-vacio">Todavía no hay sedes cargadas.</p>
          ) : (
            sedes.map((sede) => {
              const productos = productosPorSede[sede._id] || 0;

              return (
                <div key={sede._id} className="admin-table-row admin-table-row-sedes">
                  <div className="admin-table-cell-name">{sede.nombre}</div>

                  {/* Clases distintas para Direccion y Productos aunque se vean
                      igual: en mobile cada celda se ubica en la grilla por su
                      clase, y dos celdas con la misma se superponen. */}
                  <div className="admin-table-cell-direccion" data-label="Dirección">
                    {sede.direccion || 'Sin dirección'}
                  </div>

                  <div className="admin-table-cell-whatsapp" data-label="WhatsApp">
                    {sede.whatsapp}
                  </div>

                  <div className="admin-table-cell-productos" data-label="Productos">
                    {textoProductos(productos)}
                  </div>

                  <div className="admin-table-cell-status" data-label="Estado">
                    <button
                      className={`status-toggle ${sede.activo ? 'active' : ''}`}
                      onClick={() => acciones.alternarActivo(sede)}
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
                      onClick={() => modal.abrirEdicion(sede)}
                      aria-label={`Editar ${sede.nombre}`}
                    >
                      <span className="btn-texto">Editar</span>
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => acciones.eliminar(sede)}
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
            })
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
