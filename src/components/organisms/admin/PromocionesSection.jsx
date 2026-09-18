import { PromocionFormModal } from '../PromocionFormModal';
import { Pagination } from '../../molecules/Pagination';
import { SeccionHeader } from './SeccionHeader';
import { usePromocionesAdmin } from '../../../hooks/usePromocionesAdmin';

export const PromocionesSection = () => {
  const { paginadas, pagina, setPagina, totalPaginas, resumen, modal, acciones } =
    usePromocionesAdmin();

  return (
    <div>
      <SeccionHeader
        titulo="Promociones del día"
        resumen={`${resumen.total} promos · ${resumen.activas} activas · se ven en el menú del cliente`}
        textoAccion="+ Agregar promo"
        onAccion={modal.abrirNuevo}
      />

      <div className="admin-table-wrapper">
        <div className="admin-table-header admin-table-header-promos">
          <div></div>
          <div>Título</div>
          <div>Precio</div>
          <div>Estado</div>
          <div></div>
        </div>

        <div className="admin-table-body">
          {paginadas.length === 0 ? (
            <p className="admin-vacio">Todavía no hay promociones cargadas.</p>
          ) : (
            paginadas.map((promo) => (
              <div key={promo._id} className="admin-table-row admin-table-row-promos">
                {promo.imagenUrl ? (
                  <img src={promo.imagenUrl} alt={promo.titulo} className="admin-table-img" />
                ) : (
                  <div className="admin-table-img admin-table-img--empty" title="Sin imagen">
                    📷
                  </div>
                )}

                <div className="admin-table-cell-name">{promo.titulo}</div>

                <div className="admin-table-cell-price" data-label="Precio">
                  {promo.precio != null ? `$${promo.precio.toLocaleString()}` : '—'}
                </div>

                <div className="admin-table-cell-status" data-label="Estado">
                  <button
                    className={`status-toggle ${promo.activa ? 'active' : ''}`}
                    onClick={() => acciones.alternarActiva(promo)}
                    title={promo.activa ? 'Clic para apagar' : 'Clic para activar'}
                    aria-label={`${promo.titulo}: ${promo.activa ? 'activa' : 'apagada'}`}
                    aria-pressed={promo.activa}
                  />
                </div>

                <div className="admin-table-actions">
                  <button
                    className="btn-edit"
                    onClick={() => modal.abrirEdicion(promo)}
                    aria-label={`Editar ${promo.titulo}`}
                  >
                    <span className="btn-texto">Editar</span>
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => acciones.eliminar(promo)}
                    aria-label={`Eliminar ${promo.titulo}`}
                  >
                    <span className="btn-texto">Eliminar</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Pagination currentPage={pagina} totalPages={totalPaginas} onPageChange={setPagina} />

      <PromocionFormModal
        isOpen={modal.abierto}
        onClose={modal.cerrar}
        promocion={modal.editando}
        onSave={acciones.guardar}
      />
    </div>
  );
};
