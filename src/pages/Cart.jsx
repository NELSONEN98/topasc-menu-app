import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Header } from '../components/organisms/Header';
import { CartItem } from '../components/molecules/CartItem';
import { Button } from '../components/atoms/Button';
import { OrderConfirmation } from '../components/organisms/OrderConfirmation';
import { TableNumberModal } from '../components/organisms/TableNumberModal';
import { AddressModal } from '../components/organisms/AddressModal';
import { PickupModal } from '../components/organisms/PickupModal';
import { useCart, SIN_SALSAS } from '../context/CartContext';
import { DELIVERY_FEES, WHATSAPP_NUMBER } from '../config/settings';
import './Cart.css';

export const Cart = ({ onNavigateToHome, orderType = 'delivery', mesa = null }) => {
  const { cartItems, updateQuantity, removeFromCart, getTotal, clearCart } =
    useCart();
  const crearPedido = useMutation(api.pedidos.crear);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [address, setAddress] = useState(null);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickup, setPickup] = useState(null);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const deliveryFee = DELIVERY_FEES[orderType] || 0;
  const subtotal = getTotal();
  const total = subtotal + deliveryFee;

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert('El carrito está vacío');
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

    let message = `Hola, quisiera hacer un pedido por ${formatPrice(total)}. Detalles:\n${cartItems
      .map((item) => {
        let line = `- ${item.name} x${item.quantity}`;
        if (item.salsas?.length > 0)
          line +=
            item.salsas[0] === SIN_SALSAS
              ? `\n  ${SIN_SALSAS}`
              : `\n  Salsas: ${item.salsas.join(', ')}`;
        if (item.salsasExtra?.length > 0)
          line += `\n  Extras: ${item.salsasExtra.map((s) => s.nombre).join(', ')}`;
        if (item.comentario) line += `\n  Nota: ${item.comentario}`;
        return line;
      })
      .join('\n')}`;

    if (orderType === 'dine-in' && mesaNumeroFinal) {
      message += `\n\nMesa: ${mesaNumeroFinal}`;
    }

    if (orderType === 'delivery' && address) {
      message += `\n\nEntregar en: ${address.direccion}`;
      if (address.referencia) message += `\nReferencia: ${address.referencia}`;
    }

    if (orderType === 'pickup' && pickup) {
      message += `\n\nRecoge: ${pickup.nombre}`;
      message += `\nCódigo de retiro: ${pickup.codigo}`;
    }

    if (metodoPago) {
      const pagoLabel =
        metodoPago === 'efectivo' ? 'Efectivo' : 'Transferencia';
      message += `\nPago: ${pagoLabel}`;
    }

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

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

      {showConfirmation && (
        <OrderConfirmation onComplete={handleConfirmationComplete} />
      )}
    </div>
  );
};
