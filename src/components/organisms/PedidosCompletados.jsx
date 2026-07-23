import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  TIPO_LABEL,
  PAGO_LABEL,
  formatearPrecio,
  formatearHora,
  formatearFecha,
  destinoDePedido,
  contarItems,
} from '../../utils/formatoPedido';

const textoItems = (cantidad) => `${cantidad} ítem${cantidad === 1 ? '' : 's'}`;

export const PedidosCompletados = () => {
  const pedidos = useQuery(api.pedidos.listarPorEstado, { estado: 'completado' });

  if (pedidos === undefined) {
    return <div className="pedidos-empty">Cargando historial...</div>;
  }

  if (pedidos.length === 0) {
    return (
      <div className="pedidos-empty">
        <span className="pedidos-empty__icon">📋</span>
        <p>Todavía no hay pedidos completados.</p>
      </div>
    );
  }

  return (
    <div className="admin-table-wrapper">
      <div className="admin-table-header admin-table-header-pedidos">
        <div>Fecha</div>
        <div>Tipo</div>
        <div>Destino</div>
        <div>Ítems</div>
        <div>Pago</div>
        <div>Total</div>
      </div>

      <div className="admin-table-body">
        {pedidos.map((pedido) => (
          <div key={pedido._id} className="admin-table-row admin-table-row-pedidos">
            <div className="admin-table-cell-fecha" data-label="Fecha">
              <span className="pedido-fecha__dia">
                {formatearFecha(pedido._creationTime)}
              </span>
              <span className="pedido-fecha__hora">
                {formatearHora(pedido._creationTime)}
              </span>
            </div>

            <div className="admin-table-cell-tipo" data-label="Tipo">
              {TIPO_LABEL[pedido.tipoPedido] || pedido.tipoPedido}
            </div>

            <div className="admin-table-cell-name">{destinoDePedido(pedido)}</div>

            <div className="admin-table-cell-items" data-label="Ítems">
              {textoItems(contarItems(pedido))}
            </div>

            <div className="admin-table-cell-pago" data-label="Pago">
              {pedido.metodoPago ? PAGO_LABEL[pedido.metodoPago] : '—'}
            </div>

            <div className="admin-table-cell-price" data-label="Total">
              {formatearPrecio(pedido.total)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
