import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  TIPO_LABEL,
  PAGO_LABEL,
  ESTADO_LABEL,
  formatearPrecio,
  formatearHora,
} from '../../utils/formatoPedido';
import { formatearTelefono } from '../../utils/telefonoCliente';
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

            {/*
              Con tres locales, de que sede es el pedido es lo primero que el
              admin necesita saber, asi que va en su propia linea y no apretado
              en la fila de arriba. Los pedidos anteriores a este campo (y los
              que entran por QR) no lo traen: ahi no se dibuja nada, en vez de
              mostrar un "Sin sede" que no aporta.
            */}
            {pedido.sedeNombre && (
              <div className="pedido-card__sede">{pedido.sedeNombre}</div>
            )}

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
                  {/* El nombre va arriba de la dirección: los pedidos a
                      domicilio ahora lo traen, y quien sale a repartir necesita
                      saber a quién le toca el timbre. */}
                  {pedido.clienteNombre && (
                    <strong>{pedido.clienteNombre}</strong>
                  )}
                  <span>{pedido.direccionEntrega}</span>
                  {pedido.direccionReferencia && (
                    <span> · {pedido.direccionReferencia}</span>
                  )}
                </div>
              )}

              {/* Enlace tel: y no texto plano: en el celular del mostrador es un
                  toque para llamar, que es exactamente para lo que se pide el
                  número. Los pedidos anteriores a este campo no lo traen y ahí
                  no se dibuja nada. */}
              {pedido.clienteTelefono && (
                <a
                  className="pedido-card__telefono"
                  href={`tel:${pedido.clienteTelefono}`}
                >
                  📱 {formatearTelefono(pedido.clienteTelefono)}
                </a>
              )}
            </div>

            <ul className="pedido-card__items">
              {pedido.items.map((item, i) => (
                <li key={i} className="pedido-item">
                  <span className="pedido-item__cant">{item.cantidad}×</span>
                  <div className="pedido-item__detalle">
                    <span className="pedido-item__nombre">{item.nombreSnapshot}</span>
                    {/* Va primero y no al final: es lo que define COMO se
                        prepara el jugo, no un agregado del pedido. */}
                    {item.preparacion && (
                      <span className="pedido-item__extra">{item.preparacion}</span>
                    )}
                    {/* Va primero y no al final: es lo que define QUE botella
                        se saca de la nevera, no un agregado del pedido. */}
                    {item.presentacion && (
                      <span className="pedido-item__extra">
                        {item.presentacion.sabor} · {item.presentacion.tamano}
                      </span>
                    )}
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
                  Completar
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
