import { useState } from 'react';
import { MesaModal } from '../MesaModal';
import { MesaQrModal } from '../MesaQrModal';
import { SeccionHeader } from './SeccionHeader';
import { useMesasAdmin } from '../../../hooks/useMesasAdmin';

export const MesasSection = () => {
  const { mesas, sedes, sedeMap, resumen, modal, acciones } = useMesasAdmin();

  // Estado local y no en el hook: el modal de QR no toca datos, solo dibuja lo
  // que ya esta en la fila. Meterlo en useMesasAdmin lo mezclaria con el ciclo
  // de alta y edicion, que si escribe.
  const [mesaQr, setMesaQr] = useState(null);

  return (
    <div>
      <SeccionHeader
        titulo="Mesas"
        resumen={`${resumen.total} mesas · ${resumen.activas} activas`}
        textoAccion="+ Agregar mesa"
        onAccion={modal.abrirNuevo}
      />

      {/* Las mesas sin sede son las anteriores al campo. No estan rotas, pero
          su pedido cae al numero de respaldo y su menu no se filtra: conviene
          que salte a la vista hasta que se les asigne un local. */}
      {resumen.sinSede > 0 && (
        <p className="admin-aviso">
          {resumen.sinSede} mesa(s) todavía sin sede: sus pedidos por QR van al
          número de respaldo y muestran el menú completo. Editalas para asignarles
          un local.
        </p>
      )}

      <div className="admin-table-wrapper">
        <div className="admin-table-header admin-table-header-mesas">
          <div>Mesa</div>
          <div>Sede</div>
          <div>Código QR</div>
          <div>Estado</div>
          <div></div>
        </div>

        <div className="admin-table-body">
          {mesas.length === 0 ? (
            <p className="admin-vacio">Todavía no hay mesas cargadas.</p>
          ) : (
            mesas.map((mesa) => (
              <div key={mesa._id} className="admin-table-row admin-table-row-mesas">
                <div className="admin-table-cell-name">Mesa {mesa.numero}</div>

                <div className="admin-table-cell-sede-mesa" data-label="Sede">
                  {mesa.sedeId ? (
                    sedeMap[mesa.sedeId] || 'Sede eliminada'
                  ) : (
                    <span className="admin-sin-sede">Sin sede</span>
                  )}
                </div>

                <div className="admin-table-cell-codigo" data-label="Código QR">
                  {mesa.codigo}
                </div>

                <div className="admin-table-cell-status" data-label="Estado">
                  <button
                    className={`status-toggle ${mesa.activo ? 'active' : ''}`}
                    onClick={() => acciones.alternarActivo(mesa)}
                    title={
                      mesa.activo
                        ? 'Clic para desactivar su QR'
                        : 'Clic para reactivar su QR'
                    }
                    aria-label={`Mesa ${mesa.numero}: QR ${mesa.activo ? 'activo' : 'inactivo'}`}
                    aria-pressed={mesa.activo}
                  />
                </div>

                <div className="admin-table-actions">
                  <button
                    className="btn-qr"
                    onClick={() => setMesaQr(mesa)}
                    aria-label={`Ver el QR de la mesa ${mesa.numero}`}
                  >
                    <span className="btn-texto">QR</span>
                  </button>
                  <button
                    className="btn-edit"
                    onClick={() => modal.abrirEdicion(mesa)}
                    aria-label={`Editar mesa ${mesa.numero}`}
                  >
                    <span className="btn-texto">Editar</span>
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => acciones.eliminar(mesa)}
                    aria-label={`Eliminar mesa ${mesa.numero}`}
                  >
                    <span className="btn-texto">Eliminar</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <MesaModal
        isOpen={modal.abierto}
        onClose={modal.cerrar}
        mesa={modal.editando}
        sedes={sedes}
        onSave={acciones.guardar}
      />

      <MesaQrModal
        isOpen={mesaQr !== null}
        onClose={() => setMesaQr(null)}
        mesa={mesaQr}
        sedeNombre={mesaQr?.sedeId ? sedeMap[mesaQr.sedeId] : null}
      />
    </div>
  );
};
