import { CategoriaModal } from '../CategoriaModal';
import { SeccionHeader } from './SeccionHeader';
import { useCategoriasAdmin } from '../../../hooks/useCategoriasAdmin';

const textoProductos = (cantidad) =>
  cantidad === 0 ? 'Sin productos' : `${cantidad} producto${cantidad === 1 ? '' : 's'}`;

export const CategoriasSection = () => {
  const {
    categorias,
    productosPorCategoria,
    siguienteOrden,
    resumen,
    modal,
    acciones,
  } = useCategoriasAdmin();

  return (
    <div>
      <SeccionHeader
        titulo="Categorías"
        resumen={`${resumen.total} categorías · ${resumen.activas} activas`}
        textoAccion="+ Agregar categoría"
        onAccion={modal.abrirNuevo}
      />

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
            categorias.map((categoria) => {
              const productos = productosPorCategoria[categoria._id] || 0;

              return (
                <div key={categoria._id} className="admin-table-row admin-table-row-categorias">
                  <div className="admin-table-cell-orden" data-label="Orden">
                    {categoria.orden}
                  </div>

                  <div className="admin-table-cell-name">{categoria.nombre}</div>

                  <div className="admin-table-cell-category" data-label="Productos">
                    {textoProductos(productos)}
                  </div>

                  <div className="admin-table-cell-status" data-label="Estado">
                    <button
                      className={`status-toggle ${categoria.activo ? 'active' : ''}`}
                      onClick={() => acciones.alternarActivo(categoria)}
                      title={
                        categoria.activo
                          ? 'Clic para ocultar del menú'
                          : 'Clic para mostrar en el menú'
                      }
                    />
                  </div>

                  <div className="admin-table-actions">
                    <button className="btn-edit" onClick={() => modal.abrirEdicion(categoria)}>
                      Editar
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => acciones.eliminar(categoria)}
                      disabled={productos > 0}
                      title={
                        productos > 0
                          ? 'Tiene productos: movelos o desactivala'
                          : 'Eliminar categoría'
                      }
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <CategoriaModal
        isOpen={modal.abierto}
        onClose={modal.cerrar}
        categoria={modal.editando}
        siguienteOrden={siguienteOrden}
        onSave={acciones.guardar}
      />
    </div>
  );
};
