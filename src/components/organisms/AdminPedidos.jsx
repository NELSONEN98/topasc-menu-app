import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  TIPO_LABEL,
  PAGO_LABEL,
  ESTADO_LABEL,
  formatearPrecio,
  formatearHora,
} from '../../utils/formatoPedido';
import './AdminPedidos.css';

export const AdminPedidos = () => {
  const pedidos = useQuery(api.pedidos.listarActivos);
  const actualizar = useMutation(api.pedidos.actualizar);

  const cambiarEstado = async (id, estado) => {
    try {
      await actualizar({ id, estado });
    } catch (error) {
      console.error('Error al cambiar estado del pedido:', error);
    }
  };

  if (pedidos === undefined) {
    return <div className="pedidos-empty">Cargando pedidos...</div>;
  }

  if (pedidos.length === 0) {
    return (
      <div className="pedidos-empty">
        <span className="pedidos-empty__icon">🧾</span>
        <p>No hay pedidos activos por ahora.</p>
      </div>
    );
  }

  return (
    <div className="pedidos-grid">
      {pedidos.map((pedido) => {
        return (
          <div key={pedido._id} className="pedido-card">
            <div className="pedido-card__top">
              <span className="pedido-card__tipo">
                {TIPO_LABEL[pedido.tipoPedido] || pedido.tipoPedido}
              </span>
              <span className="pedido-card__hora">
                {formatearHora(pedido._creationTime)}
              </span>
              <span className={`pedido-card__estado pedido-card__estado--${pedido.estado}`}>
                {ESTADO_LABEL[pedido.estado] || pedido.estado}
              </span>
            </div>

            <div className="pedido-card__cliente">
              {pedido.tipoPedido === 'pickup' && (
                <>
                  <strong>{pedido.clienteNombre}</strong>
                  {pedido.codigoRetiro && (
                    <span className="pedido-card__codigo">
                      Código {pedido.codigoRetiro}
                    </span>
                  )}
                </>
              )}
              {pedido.tipoPedido === 'dine-in' && (
                <strong>Mesa {pedido.mesaNumero}</strong>
              )}
              {pedido.tipoPedido === 'delivery' && (
                <div className="pedido-card__direccion">
                  <strong>{pedido.direccionEntrega}</strong>
                  {pedido.direccionReferencia && (
                    <span> · {pedido.direccionReferencia}</span>
                  )}
                </div>
              )}
            </div>

            <ul className="pedido-card__items">
              {pedido.items.map((item, i) => (
                <li key={i} className="pedido-item">
                  <span className="pedido-item__cant">{item.cantidad}×</span>
                  <div className="pedido-item__detalle">
                    <span className="pedido-item__nombre">{item.nombreSnapshot}</span>
                    {item.salsasBase?.length > 0 && (
                      <span className="pedido-item__extra">
                        {item.salsasBase.join(', ')}
                      </span>
                    )}
                    {item.salsasExtra?.length > 0 && (
                      <span className="pedido-item__extra">
                        Extras: {item.salsasExtra.map((s) => s.nombre).join(', ')}
                      </span>
                    )}
                    {item.notas && (
                      <span className="pedido-item__nota">"{item.notas}"</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="pedido-card__footer">
              <div className="pedido-card__total-wrap">
                <span className="pedido-card__total">{formatearPrecio(pedido.total)}</span>
                {pedido.metodoPago && (
                  <span className="pedido-card__pago">
                    {PAGO_LABEL[pedido.metodoPago] || pedido.metodoPago}
                  </span>
                )}
              </div>
              <div className="pedido-card__acciones">
                <button
                  className="pedido-btn pedido-btn--cancel"
                  onClick={() => cambiarEstado(pedido._id, 'cancelado')}
                >
                  Cancelar
                </button>
                <button
                  className="pedido-btn pedido-btn--next"
                  onClick={() => cambiarEstado(pedido._id, 'completado')}
                >
                  ✅ Completar
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
