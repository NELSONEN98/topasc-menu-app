import { SalsaModal } from '../SalsaModal';
import { Pagination } from '../../molecules/Pagination';
import { SeccionHeader } from './SeccionHeader';
import { useSalsasAdmin } from '../../../hooks/useSalsasAdmin';
import { PLACEHOLDER_SALSA } from '../../../config/settings';

export const SalsasSection = () => {
  const { paginadas, pagina, setPagina, totalPaginas, resumen, modal, acciones } =
    useSalsasAdmin();

  return (
    <div>
      <SeccionHeader
        titulo="Salsas"
        resumen={`${resumen.total} salsas · ${resumen.activas} activas`}
        textoAccion="+ Agregar salsa"
        onAccion={modal.abrirNuevo}
      />

      <div className="admin-table-wrapper">
        <div className="admin-table-header admin-table-header-sauces">
          <div></div>
          <div>Nombre</div>
          <div>Precio</div>
          <div>Estado</div>
          <div></div>
        </div>

        <div className="admin-table-body">
          {paginadas.length === 0 ? (
            <p className="admin-vacio">Todavía no hay salsas cargadas.</p>
          ) : (
            paginadas.map((salsa) => (
              <div key={salsa._id} className="admin-table-row admin-table-row-sauces">
                <img
                  src={salsa.imagenUrl || PLACEHOLDER_SALSA}
                  alt={salsa.nombre}
                  className="admin-table-img"
                />

                <div className="admin-table-cell-name">
                  {salsa.nombre}
                  {salsa.tipo === 'especial' && (
                    <span className="admin-badge-especial">Especial</span>
                  )}
                </div>

                <div className="admin-table-cell-price" data-label="Precio">
                  {salsa.tipo === 'base' ? 'Gratis' : `$${salsa.precio.toLocaleString()}`}
                </div>

                <div className="admin-table-cell-status" data-label="Estado">
                  <button
                    className={`status-toggle ${salsa.disponible ? 'active' : ''}`}
                    onClick={() => acciones.alternarDisponible(salsa)}
                    title={salsa.disponible ? 'Clic para inhabilitar' : 'Clic para habilitar'}
                    aria-label={`${salsa.nombre}: ${salsa.disponible ? 'disponible' : 'no disponible'}`}
                    aria-pressed={salsa.disponible}
                  />
                </div>

                <div className="admin-table-actions">
                  <button
                    className="btn-edit"
                    onClick={() => modal.abrirEdicion(salsa)}
                    aria-label={`Editar ${salsa.nombre}`}
                  >
                    <span className="btn-texto">Editar</span>
                    <span className="btn-icono" aria-hidden="true">✏️</span>
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => acciones.eliminar(salsa)}
                    aria-label={`Eliminar ${salsa.nombre}`}
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

      <SalsaModal
        isOpen={modal.abierto}
        onClose={modal.cerrar}
        salsa={modal.editando}
        onSave={acciones.guardar}
      />
    </div>
  );
};
