import './ProductGridCard.css';
import { useCart } from '../../context/CartContext';

export const ProductGridCard = ({ product, cartItems = [], onProductClick }) => {
  const { updateQuantity, removeFromCart, addToCart } = useCart();
  const cartItem = cartItems.find((item) => item.id === product.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  const handleAdd = () => {
    addToCart(product);
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
    <div className="grid-card">
      <img
        src={product.image}
        alt={product.name}
        className="grid-card__image"
        onClick={() => onProductClick?.(product)}
        onError={(e) => {
          e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop';
        }}
      />
      <div className="grid-card__name">{product.name}</div>
      <div className="grid-card__body">
        <div className="grid-card__price">{formatPrice(product.price)}</div>
        {quantity === 0 ? (
          <button
            className="grid-card__add"
            onClick={(e) => {
              e.stopPropagation();
              handleAdd();
            }}
          >
            Agregar
          </button>
        ) : (
          <div className="grid-card__stepper">
            <button
              className="grid-card__stepper-btn grid-card__stepper-btn--dec"
              onClick={(e) => {
                e.stopPropagation();
                handleDecrement();
              }}
            >
              −
            </button>
            <span className="grid-card__qty">{quantity}</span>
            <button
              className="grid-card__stepper-btn grid-card__stepper-btn--inc"
              onClick={(e) => {
                e.stopPropagation();
                handleIncrement();
              }}
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
