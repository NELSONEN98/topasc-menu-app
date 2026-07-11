import { Header } from '../components/organisms/Header';
import { CartItem } from '../components/molecules/CartItem';
import { Button } from '../components/atoms/Button';
import { useCart } from '../context/CartContext';
import { DELIVERY_FEES } from '../config/settings';
import './Cart.css';

export const Cart = ({ onNavigateToHome, orderType = 'delivery' }) => {
  const { cartItems, updateQuantity, removeFromCart, getTotal, clearCart } =
    useCart();

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

    // Aquí irá la integración con WhatsApp o backend
    const message = `Hola, quisiera hacer un pedido por $${formatPrice(total)}. Detalles:\n${cartItems
      .map((item) => `- ${item.name} x${item.quantity}`)
      .join('\n')}`;

    const whatsappUrl = `https://wa.me/573123456789?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="cart">
      <Header
        title="Tu Carrito"
        onCartClick={onNavigateToHome}
        variant="neutral"
      />

      <div className="cart__top-action">
        <Button
          variant="secondary"
          size="md"
          onClick={onNavigateToHome}
          className="cart__continue-btn"
        >
          ← Seguir comprando
        </Button>
      </div>

      {cartItems.length === 0 ? (
        <div className="cart__empty">
          <span className="cart__empty-icon">🛒</span>
          <h2 className="cart__empty-title">Carrito Vacío</h2>
          <p className="cart__empty-message">
            Agrega productos para empezar a comprar
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={onNavigateToHome}
            className="cart__continue-btn"
          >
            Continuar comprando
          </Button>
        </div>
      ) : (
        <>
          <div className="cart__items">
            {cartItems.map((item) => (
              <CartItem
                key={item.id}
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
            <div className="cart__summary-row">
              <span>Envío</span>
              <span>{deliveryFee === 0 ? 'Gratis' : formatPrice(deliveryFee)}</span>
            </div>
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
              Limpiar carrito
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
