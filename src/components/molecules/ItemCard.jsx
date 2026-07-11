import './ItemCard.css';
import { useCart } from '../../context/CartContext';

export const ItemCard = ({ product, onAddToCart, cartItems = [] }) => {
  const { updateQuantity, removeFromCart } = useCart();
  const cartItem = cartItems.find((item) => item.id === product.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  const handleAdd = () => {
    onAddToCart(product);
  };

  const handleIncrement = () => {
    updateQuantity(product.id, quantity + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      updateQuantity(product.id, quantity - 1);
    } else {
      removeFromCart(product.id);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="item-row">
      <img
        src={product.image}
        alt={product.name}
        className="item-row-image"
        onError={(e) => {
          e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop';
        }}
      />
      <div className="item-row-info">
        <div className="item-row-name">{product.name}</div>
        <div className="item-row-desc">{product.description}</div>
        <div className="item-row-price">{formatPrice(product.price)}</div>
      </div>
      <div className="item-row-action">
        {quantity === 0 ? (
          <button className="item-add-btn" onClick={handleAdd} aria-label="Agregar al carrito">
            +
          </button>
        ) : (
          <div className="item-stepper">
            <button
              className="item-stepper__btn item-stepper__btn--dec"
              onClick={handleDecrement}
              aria-label="Disminuir"
            >
              −
            </button>
            <span className="item-stepper__qty">{quantity}</span>
            <button
              className="item-stepper__btn item-stepper__btn--inc"
              onClick={handleIncrement}
              aria-label="Aumentar"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
