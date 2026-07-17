import './ProductGridCard.css';
import { useCart } from '../../context/CartContext';

export const ProductGridCard = ({ product, cartItems = [], onProductClick }) => {
  const { updateQuantity, removeFromCart, addToCart } = useCart();
  const productId = product._id || product.id;
  const cartItem = cartItems.find((item) => (item._id || item.id) === productId);
  const quantity = cartItem ? cartItem.quantity : 0;

  const handleAdd = () => {
    addToCart(product);
  };

  const handleIncrement = () => {
    updateQuantity(productId, quantity + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      updateQuantity(productId, quantity - 1);
    } else {
      removeFromCart(productId);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const imagenUrl = product.imagenUrl || product.image;
  const nombre = product.nombre || product.name;
  const precio = product.precio || product.price;

  return (
    <div className="grid-card">
      <img
        src={imagenUrl}
        alt={nombre}
        className="grid-card__image"
        onClick={() => onProductClick?.(product)}
        onError={(e) => {
          e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop';
        }}
      />
      <div className="grid-card__name">{nombre}</div>
      <div className="grid-card__body">
        <div className="grid-card__price">{formatPrice(precio)}</div>
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
