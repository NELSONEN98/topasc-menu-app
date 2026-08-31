import { GaseosaModal } from '../GaseosaModal';
import { SeccionHeader } from './SeccionHeader';
import { useGaseosasAdmin } from '../../../hooks/useGaseosasAdmin';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(precio);

export const GaseosasSection = () => {
  const { porSabor, resumen, modal, acciones } = useGaseosasAdmin();

  const saboresExistentes = porSabor.map((g) => g.sabor);

  return (
    <div>
      <SeccionHeader
        titulo="Gaseosas"
        resumen={`${resumen.sabores} sabores · ${resumen.total} presentaciones · ${resumen.disponibles} disponibles`}
        textoAccion="+ Agregar presentación"
        onAccion={modal.abrirNuevo}
      />

      <p className="admin-ayuda">
        Cada fila es una combinación de sabor y tamaño con su propio precio. El cliente
        elige primero el sabor y después el tamaño, y paga el precio de la combinación
        exacta. Para que un producto pida esta elección, marcá
        «Lleva presentación» al editarlo en Productos.
      </p>

      {porSabor.length === 0 ? (
        <div className="admin-table-wrapper">
          <p className="admin-vacio">
            Todavía no hay presentaciones cargadas. Agregá la primera con el botón de
            arriba.
          </p>
        </div>
      ) : (
        porSabor.map(({ sabor, opciones }) => (
          <div key={sabor} className="gaseosa-grupo">
            <h2 className="gaseosa-grupo__titulo">{sabor}</h2>

            <div className="admin-table-wrapper">
              <div className="admin-table-header admin-table-header-gaseosas">
                <div>Tamaño</div>
                <div>Precio</div>
                <div>Disponible</div>
                <div></div>
              </div>

              <div className="admin-table-body">
                {opciones.map((opcion) => (
                  <div
                    key={opcion._id}
                    className="admin-table-row admin-table-row-gaseosas"
                  >
                    <div className="admin-table-cell-name">{opcion.tamano}</div>

                    <div className="admin-table-cell-price" data-label="Precio">
                      {formatearPrecio(opcion.precio)}
                    </div>

                    <div className="admin-table-cell-status" data-label="Disponible">
                      <button
                        className={`status-toggle ${opcion.disponible ? 'active' : ''}`}
                        onClick={() => acciones.alternarDisponible(opcion)}
                        title={
                          opcion.disponible
                            ? 'Clic para marcar como agotada'
                            : 'Clic para volver a habilitarla'
                        }
                        aria-label={`${sabor} ${opcion.tamano}: ${
                          opcion.disponible ? 'disponible' : 'agotada'
                        }`}
                        aria-pressed={opcion.disponible}
                      />
                    </div>

                    <div className="admin-table-actions">
                      <button
                        className="btn-edit"
                        onClick={() => modal.abrirEdicion(opcion)}
                        aria-label={`Editar ${sabor} ${opcion.tamano}`}
                      >
                        <span className="btn-texto">Editar</span>
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => acciones.eliminar(opcion)}
                        aria-label={`Eliminar ${sabor} ${opcion.tamano}`}
                      >
                        <span className="btn-texto">Eliminar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))
      )}

      <GaseosaModal
        isOpen={modal.abierto}
        onClose={modal.cerrar}
        presentacion={modal.editando}
        saboresExistentes={saboresExistentes}
        onSave={acciones.guardar}
      />
    </div>
  );
};
