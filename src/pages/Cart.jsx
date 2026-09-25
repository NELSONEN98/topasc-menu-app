import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Header } from '../components/organisms/Header';
import { CartItem } from '../components/molecules/CartItem';
import { Button } from '../components/atoms/Button';
import { OrderConfirmation } from '../components/organisms/OrderConfirmation';
import { TableNumberModal } from '../components/organisms/TableNumberModal';
import { AddressModal } from '../components/organisms/AddressModal';
import { PickupModal } from '../components/organisms/PickupModal';
import { BebidasModal } from '../components/organisms/BebidasModal';
import { ProductDetailModal } from '../components/organisms/ProductDetailModal';
import { useCart, SIN_SALSAS } from '../context/CartContext';
import { useNotificacion } from '../context/NotificacionContext';
import { esCategoriaDeBebida } from '../utils/categorias';
import { DELIVERY_FEES, WHATSAPP_NUMBER } from '../config/settings';
import './Cart.css';

// Referencia estable mientras las queries cargan: un `[]` nuevo por render
// rompe cualquier useMemo que lo tenga como dependencia.
const SIN_DATOS = [];

export const Cart = ({
  onNavigateToHome,
  orderType = 'delivery',
  mesa = null,
  sede = null,
}) => {
  const { cartItems, updateQuantity, removeFromCart, getTotal, clearCart } =
    useCart();
  const crearPedido = useMutation(api.pedidos.crear);
  const { notificar } = useNotificacion();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [address, setAddress] = useState(null);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickup, setPickup] = useState(null);
  const [showBebidas, setShowBebidas] = useState(false);
  const [bebidaElegida, setBebidaElegida] = useState(null);

  // Misma query que el menu, con la misma sede: la bebida que se ofrece aca
  // tiene que venderse en el local del pedido. Sin sede (entrada por QR) el
  // server devuelve el menu completo, igual que en Home.
  const items = useQuery(api.items.listarMenu, { sedeId: sede?._id }) ?? SIN_DATOS;
  const categorias = useQuery(api.categorias.listar) ?? SIN_DATOS;
  // El detalle de producto las necesita: una bebida podria llevar salsa, no
  // hay regla que lo impida.
  const salsas = useQuery(api.salsas.listarDisponibles) ?? SIN_DATOS;

  const bebidas = useMemo(
    () => items.filter((item) => esCategoriaDeBebida(categorias, item.categoriaId)),
    [items, categorias]
  );

  // Se pasa de la lista al detalle en vez de apilarlos: dos hojas abiertas a
  // la vez no dejan claro cual se cierra con el fondo.
  const elegirBebida = (bebida) => {
    setShowBebidas(false);
    setBebidaElegida(bebida);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  /*
   * El domicilio lo pone la sede. `??` y NO `||`: un envio gratis se guarda
   * como 0, y con `||` ese 0 se leeria como "sin configurar" y terminaria
   * cobrando el valor de respaldo. Seria cobrarle a un cliente un envio que
   * el local decidio regalar.
   *
   * Solo aplica a delivery: recoger y comer en el local nunca tienen costo de
   * envio. Antes esto salia de DELIVERY_FEES[orderType], que para 'dine-in'
   * ni siquiera acertaba la clave (el objeto la tiene como `dineIn`) y caia al
   * `|| 0` de casualidad.
   */
  const deliveryFee =
    orderType === 'delivery'
      ? sede?.costoDomicilio ?? DELIVERY_FEES.delivery
      : 0;
  const subtotal = getTotal();
  const total = subtotal + deliveryFee;

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      notificar.info('El carrito está vacío');
      return;
    }

    if (orderType === 'dine-in') {
      // Si viene por QR ya sabemos la mesa: no preguntamos el número
      if (mesa) {
        setShowConfirmation(true);
      } else {
        setShowTableModal(true);
      }
    } else if (orderType === 'delivery') {
      setShowAddressModal(true);
    } else if (orderType === 'pickup') {
      setShowPickupModal(true);
    } else {
      setShowConfirmation(true);
    }
  };

  const handleTableNumberConfirm = (number) => {
    setTableNumber(number);
    setShowTableModal(false);
    setShowConfirmation(true);
  };

  const handleAddressConfirm = (data) => {
    setAddress(data);
    setShowAddressModal(false);
    setShowConfirmation(true);
  };

  const handlePickupConfirm = (data) => {
    setPickup(data);
    setShowPickupModal(false);
    setShowConfirmation(true);
  };

  const handleConfirmationComplete = () => {
    // Persistir el pedido en Convex (fire-and-forget): el envío por WhatsApp
    // es el canal principal, así que un fallo al guardar no debe frenarlo.
    const pedidoItems = cartItems.map((item) => ({
      itemId: item.id,
      nombreSnapshot: item.name,
      precioSnapshot: item.price,
      cantidad: item.quantity,
      salsasBase: item.salsas?.length ? item.salsas : undefined,
      salsasExtra: item.salsasExtra?.length ? item.salsasExtra : undefined,
      presentacion: item.presentacion ?? undefined,
      notas: item.comentario || undefined,
    }));

    // La mesa por QR gana sobre el número tipeado manualmente
    const mesaNumeroFinal =
      orderType === 'dine-in' ? mesa?.numero || tableNumber : undefined;

    // El método de pago viene de la modal de domicilio o de recoger
    const metodoPago = address?.metodoPago ?? pickup?.metodoPago;

    crearPedido({
      tipoPedido: orderType,
      total,
      // Sin sede (pedido por QR) los dos van undefined y Convex los omite: el
      // pedido queda guardado igual, solo que sin local asociado.
      sedeId: sede?._id,
      sedeNombre: sede?.nombre,
      costoDomicilio: orderType === 'delivery' ? deliveryFee : undefined,
      clienteNombre: pickup?.nombre,
      codigoRetiro: pickup?.codigo,
      mesaId: orderType === 'dine-in' ? mesa?._id : undefined,
      mesaNumero: mesaNumeroFinal,
      direccionEntrega: address?.direccion,
      direccionReferencia: address?.referencia || undefined,
      metodoPago,
      items: pedidoItems,
    }).catch((e) =>
      console.error('No se pudo guardar el pedido en Convex:', e)
    );

    // Se aclara la sede en el propio texto: mientras las dos compartan el
    // mismo numero de WhatsApp de pruebas, es la unica forma de saber para
    // cual de los dos locales es el pedido.
    //
    // Formato tipo factura: bloques separados por linea en blanco y titulos
    // en MAYUSCULA en vez de *negrita*. WhatsApp Web/Desktop no siempre
    // interpreta el asterisco cuando el texto llega prellenado por un link
    // wa.me (no tecleado a mano) — queda como asterisco literal en vez de
    // negrita. Mayuscula funciona siempre, en cualquier plataforma.
    const encabezadoSede = sede
      ? `/// PEDIDO PARA ${sede.nombre.toUpperCase()} ///\n\n`
      : '';

    // Cada item es su propio bloque (nombre, presentacion, salsas, extras,
    // nota) separado del siguiente por una linea en blanco — como los
    // renglones de una factura, no una lista apretada de una sola linea.
    const detalleItems = cartItems
      .map((item) => {
        let bloque = `* ${item.name} x${item.quantity}`;
        // Antes que las salsas: sin el sabor y el tamaño, el local no sabe
        // que botella servir. WhatsApp es el canal principal del pedido.
        if (item.presentacion)
          bloque += `\n${item.presentacion.sabor} · ${item.presentacion.tamano}`;
        if (item.salsas?.length > 0)
          bloque +=
            item.salsas[0] === SIN_SALSAS
              ? `\n${SIN_SALSAS}`
              : `\nSALSAS: ${item.salsas.join(', ')}`;
        if (item.salsasExtra?.length > 0)
          bloque += `\nEXTRAS: ${item.salsasExtra.map((extra) => extra.nombre).join(', ')}`;
        if (item.comentario) bloque += `\nNOTA: ${item.comentario}`;
        return bloque;
      })
      .join('\n\n');

    let message = `${encabezadoSede}DETALLES:\n\n${detalleItems}`;

    if (orderType === 'dine-in' && mesaNumeroFinal) {
      message += `\n\nMESA: ${mesaNumeroFinal}`;
    }

    if (orderType === 'delivery' && address) {
      message += `\n\nENTREGAR EN: ${address.direccion}`;
      if (address.referencia) message += `\nREFERENCIA: ${address.referencia}`;
    }

    if (orderType === 'pickup' && pickup) {
      message += `\n\nRECOGE: ${pickup.nombre}`;
      message += `\nCÓDIGO DE RETIRO: ${pickup.codigo}`;
    }

    if (metodoPago) {
      const pagoLabel =
        metodoPago === 'efectivo' ? 'Efectivo' : 'Transferencia';
      message += `\nMÉTODO DE PAGO: ${pagoLabel}`;
    }

    // El total va al final, como el renglon de cierre de una factura.
    message += `\n\nTOTAL: ${formatPrice(total)}`;

    // sede?.whatsapp: numero propio del local elegido. Sin sede (pedido por
    // QR, ver la nota en App.jsx) cae al numero de pruebas de settings.js.
    const numeroWhatsapp = sede?.whatsapp || WHATSAPP_NUMBER;
    const whatsappUrl = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(message)}`;

    setShowConfirmation(false);
    setTableNumber('');
    setAddress(null);
    setPickup(null);
    clearCart();

    // window.open corre fuera del gesto del click (viene del timer de la
    // animación), así que el navegador puede bloquearlo como popup. Si lo
    // bloquea (devuelve null), navegamos la ventana actual, que nunca se bloquea.
    const nuevaVentana = window.open(whatsappUrl, '_blank');
    if (!nuevaVentana) {
      window.location.href = whatsappUrl;
    }
  };

  return (
    <div className="cart">
      <Header title="Tu Orden" variant="neutral" />

      <div className="cart__top-action">
        <Button
          variant="secondary"
          size="md"
          onClick={onNavigateToHome}
          className="cart__continue-btn"
        >
          Seguir agregando +
        </Button>
      </div>

      {cartItems.length === 0 ? (
        <div className="cart__empty">
          <span className="cart__empty-icon">🧾</span>
          <h2 className="cart__empty-title">Tu orden está vacía</h2>
          <p className="cart__empty-message">
            Agrega productos para empezar tu orden
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={onNavigateToHome}
            className="cart__continue-btn"
          >
            Agregar productos
          </Button>
        </div>
      ) : (
        <>
          <div className="cart__items">
            {cartItems.map((item) => (
              <CartItem
                key={item.lineId}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
              />
            ))}
          </div>

          {/* Debajo de los productos y antes del total: es el ultimo momento
              en que el cliente repasa lo que pidio. Si el local no tiene
              bebidas cargadas para esta sede, el boton no aparece — abrir una
              hoja vacia es peor que no ofrecer nada. */}
          {bebidas.length > 0 && (
            <button
              type="button"
              className="cart__bebidas-btn"
              onClick={() => setShowBebidas(true)}
            >
              <span className="cart__bebidas-icono" aria-hidden="true">🥤</span>
              <span className="cart__bebidas-texto">
                <strong>¿Algo para tomar?</strong>
                <small>Agregá una bebida a tu orden</small>
              </span>
              <span className="cart__bebidas-mas" aria-hidden="true">+</span>
            </button>
          )}

          <div className="cart__summary">
            <div className="cart__summary-row">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {orderType === 'delivery' && (
              <div className="cart__summary-row">
                <span>Envío</span>
                <span>{deliveryFee === 0 ? 'Gratis' : formatPrice(deliveryFee)}</span>
              </div>
            )}
            <div className="cart__summary-row cart__summary-row--total">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          <div className="cart__actions">
            <Button
              variant="success"
              size="lg"
              onClick={handleCheckout}
              className="cart__checkout-btn"
            >
              ✓ Confirmar por WhatsApp
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="cart__clear-btn"
            >
              Vaciar orden
            </Button>
          </div>
        </>
      )}

      {showTableModal && (
        <TableNumberModal
          onConfirm={handleTableNumberConfirm}
          onCancel={() => setShowTableModal(false)}
        />
      )}

      {showAddressModal && (
        <AddressModal
          onConfirm={handleAddressConfirm}
          onCancel={() => setShowAddressModal(false)}
        />
      )}

      {showPickupModal && (
        <PickupModal
          onConfirm={handlePickupConfirm}
          onCancel={() => setShowPickupModal(false)}
        />
      )}

      {showBebidas && (
        <BebidasModal
          bebidas={bebidas}
          onElegir={elegirBebida}
          onClose={() => setShowBebidas(false)}
        />
      )}

      {bebidaElegida && (
        <ProductDetailModal
          product={bebidaElegida}
          salsas={salsas}
          onClose={() => setBebidaElegida(null)}
        />
      )}

      {showConfirmation && (
        <OrderConfirmation onComplete={handleConfirmationComplete} />
      )}
    </div>
  );
};
