import { ProductModal } from '../ProductModal';
import { Pagination } from '../../molecules/Pagination';
import { SeccionHeader } from './SeccionHeader';
import { useProductosAdmin } from '../../../hooks/useProductosAdmin';

const sinImagen = (item) => !item.imagenUrl || item.imagenUrl.trim() === '';

export const ProductosSection = () => {
  const {
    categorias,
    categoriaMap,
    paginados,
    pagina,
    setPagina,
    totalPaginas,
    resumen,
    filtros,
    modal,
    acciones,
  } = useProductosAdmin();

  return (
    <div>
      <SeccionHeader
        titulo="Productos"
        resumen={`${resumen.filtrados} de ${resumen.total} productos · ${resumen.activos} activos`}
        textoAccion="+ Agregar producto"
        onAccion={modal.abrirNuevo}
      />

      <div className="admin-filters">
        <div className="filter-group filter-group--ancho">
          <label className="filter-label" htmlFor="filtro-busqueda">Buscar</label>
          <input
            id="filtro-busqueda"
            type="text"
            className="filter-input"
            placeholder="Buscar por nombre..."
            value={filtros.busqueda}
            onChange={(e) => filtros.setBusqueda(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="filtro-categoria">Categoría</label>
          <select
            id="filtro-categoria"
            className="filter-select"
            value={filtros.categoria}
            onChange={(e) => filtros.setCategoria(e.target.value)}
          >
            <option value="">Todas</option>
            {categorias.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="filtro-estado">Estado</label>
          <select
            id="filtro-estado"
            className="filter-select"
            value={filtros.estado}
            onChange={(e) => filtros.setEstado(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>
      </div>

      <div className="admin-table-wrapper">
        <div className="admin-table-header">
          <div></div>
          <div>Nombre</div>
          <div>Categoría</div>
          <div>Precio</div>
          <div>Estado</div>
          <div></div>
        </div>

        <div className="admin-table-body">
          {paginados.length === 0 ? (
            <p className="admin-vacio">No hay productos que coincidan con el filtro.</p>
          ) : (
            paginados.map((item) => (
              <div key={item._id} className="admin-table-row">
                {sinImagen(item) ? (
                  <div className="admin-table-img admin-table-img--empty" title="Sin imagen">
                    📷
                  </div>
                ) : (
                  <img src={item.imagenUrl} alt={item.nombre} className="admin-table-img" />
                )}

                <div className="admin-table-cell-name">
                  {item.nombre}
                  {sinImagen(item) && (
                    <span className="admin-table-noimg">Falta imagen</span>
                  )}
                </div>

                <div className="admin-table-cell-category" data-label="Categoría">
                  {categoriaMap[item.categoriaId] || 'Sin categoría'}
                </div>

                <div className="admin-table-cell-price" data-label="Precio">
                  ${item.precio.toLocaleString()}
                </div>

                <div className="admin-table-cell-status" data-label="Estado">
                  <button
                    className={`status-toggle ${item.disponible ? 'active' : ''}`}
                    onClick={() => acciones.alternarDisponible(item)}
                    title={item.disponible ? 'Clic para inhabilitar' : 'Clic para habilitar'}
                    aria-label={`${item.nombre}: ${item.disponible ? 'disponible' : 'no disponible'}`}
                    aria-pressed={item.disponible}
                  />
                </div>

                <div className="admin-table-actions">
                  <button
                    className="btn-edit"
                    onClick={() => modal.abrirEdicion(item._id)}
                    aria-label={`Editar ${item.nombre}`}
                  >
                    <span className="btn-texto">Editar</span>
                    <span className="btn-icono" aria-hidden="true">✏️</span>
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => acciones.eliminar(item)}
                    aria-label={`Eliminar ${item.nombre}`}
                  >
                    <span className="btn-texto">Eliminar</span>
                    <span className="btn-icono" aria-hidden="true">🗑</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Pagination currentPage={pagina} totalPages={totalPaginas} onPageChange={setPagina} />

      <ProductModal
        isOpen={modal.abierto}
        onClose={modal.cerrar}
        product={modal.editando}
        categorias={categorias}
        onSave={acciones.guardar}
      />
    </div>
  );
};
