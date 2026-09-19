import { ProductModal } from '../ProductModal';
import { SeccionHeader } from './SeccionHeader';
import { useProductosAdmin } from '../../../hooks/useProductosAdmin';
import { estadoVigencia } from '../../../utils/vigencia';

// Una promo dentro de su ventana de fechas pero marcada como no disponible NO
// se ve en el menu, y con solo el toggle prendido eso es indistinguible de una
// que si se ve. Sin este aviso el admin la prende, no la encuentra en el menu
// y no tiene forma de saber que el problema es la fecha.
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

/**
 * Vista filtrada de Productos: solo los que estan marcados como promo del dia.
 *
 * No tiene datos ni CRUD propios — una promo ES un producto (asi se puede
 * pedir y entrar en un pedido), asi que se crea y edita con el mismo modal.
 * Esta pestaña existe para poder ver de un vistazo que promos estan corriendo
 * y hasta cuando, que en la tabla de Productos se perderia entre todo el menu.
 */
export const PromocionesSection = () => {
  const { categorias, sedes, modal, acciones, todosLosItems } = useProductosAdmin();

  const promos = todosLosItems.filter((item) => item.esPromo === true);

  return (
    <div>
      <SeccionHeader
        titulo="Promociones del día"
        resumen={`${promos.length} promos · se piden como cualquier producto`}
        textoAccion="+ Agregar promo"
        onAccion={modal.abrirNuevo}
      />

      <p className="admin-ayuda">
        Una promo es un producto con el check "Es promoción del día". Se agrega al carrito
        igual que el resto y aparece además en el filtro "Promociones del día" del menú y en
        el aviso que se abre al entrar.
      </p>

      <div className="admin-table-wrapper">
        <div className="admin-table-header admin-table-header-promos">
          <div></div>
          <div>Producto</div>
          <div>Vigencia</div>
          <div>Precio</div>
          <div>Estado</div>
          <div></div>
        </div>

        <div className="admin-table-body">
          {promos.length === 0 ? (
            <p className="admin-vacio">
              Todavía no hay promociones. Creá una o marcá un producto existente como promo.
            </p>
          ) : (
            promos.map((promo) => (
              <div key={promo._id} className="admin-table-row admin-table-row-promos">
                {promo.imagenUrl ? (
                  <img src={promo.imagenUrl} alt={promo.nombre} className="admin-table-img" />
                ) : (
                  <div className="admin-table-img admin-table-img--empty" title="Sin imagen">
                    📷
                  </div>
                )}

                <div className="admin-table-cell-name">
                  {promo.nombre}
                  {AVISO_VIGENCIA[estadoVigencia({ ...promo, activa: promo.disponible })] && (
                    <span className="admin-table-noimg">
                      {AVISO_VIGENCIA[estadoVigencia({ ...promo, activa: promo.disponible })]}
                    </span>
                  )}
                </div>

                <div className="admin-table-cell-vigencia" data-label="Vigencia">
                  {rangoVigencia(promo)}
                </div>

                <div className="admin-table-cell-price" data-label="Precio">
                  ${promo.precio.toLocaleString()}
                </div>

                <div className="admin-table-cell-status" data-label="Estado">
                  <button
                    className={`status-toggle ${promo.disponible ? 'active' : ''}`}
                    onClick={() => acciones.alternarDisponible(promo)}
                    title={promo.disponible ? 'Clic para inhabilitar' : 'Clic para habilitar'}
                    aria-label={`${promo.nombre}: ${promo.disponible ? 'disponible' : 'no disponible'}`}
                    aria-pressed={promo.disponible}
                  />
                </div>

                <div className="admin-table-actions">
                  <button
                    className="btn-edit"
                    onClick={() => modal.abrirEdicion(promo._id)}
                    aria-label={`Editar ${promo.nombre}`}
                  >
                    <span className="btn-texto">Editar</span>
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => acciones.eliminar(promo)}
                    aria-label={`Eliminar ${promo.nombre}`}
                  >
                    <span className="btn-texto">Eliminar</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ProductModal
        isOpen={modal.abierto}
        onClose={modal.cerrar}
        product={modal.editando}
        categorias={categorias}
        sedes={sedes}
        defaults={{ esPromo: true }}
        onSave={acciones.guardar}
      />
    </div>
  );
};
