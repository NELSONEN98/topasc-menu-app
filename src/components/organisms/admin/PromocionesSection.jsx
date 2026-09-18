import { PromocionFormModal } from '../PromocionFormModal';
import { Pagination } from '../../molecules/Pagination';
import { SeccionHeader } from './SeccionHeader';
import { usePromocionesAdmin } from '../../../hooks/usePromocionesAdmin';
import { estadoVigencia } from '../../../utils/vigencia';

// Una promo `activa` pero fuera de su ventana de fechas NO se ve en el menu,
// y con solo el switch prendido eso es indistinguible de una que si se ve.
// Sin este aviso el admin la prende, no la encuentra en el menu y no tiene
// forma de saber que el problema es la fecha.
const AVISO_VIGENCIA = {
  programada: 'Todavía no arranca',
  vencida: 'Ya venció',
};

const rangoVigencia = ({ vigenteDesde, vigenteHasta }) => {
  if (!vigenteDesde && !vigenteHasta) return 'Sin fechas';
  if (vigenteDesde && vigenteHasta) {
    return vigenteDesde === vigenteHasta
      ? vigenteDesde
      : `${vigenteDesde} → ${vigenteHasta}`;
  }

  return vigenteDesde ? `Desde ${vigenteDesde}` : `Hasta ${vigenteHasta}`;
};

export const PromocionesSection = () => {
  const { sedes, paginadas, pagina, setPagina, totalPaginas, resumen, modal, acciones } =
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
          <div>Vigencia</div>
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

                <div className="admin-table-cell-name">
                  {promo.titulo}
                  {AVISO_VIGENCIA[estadoVigencia(promo)] && (
                    <span className="admin-table-noimg">
                      {AVISO_VIGENCIA[estadoVigencia(promo)]}
                    </span>
                  )}
                </div>

                <div className="admin-table-cell-vigencia" data-label="Vigencia">
                  {rangoVigencia(promo)}
                </div>

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
        sedes={sedes}
        onSave={acciones.guardar}
      />
    </div>
  );
};
