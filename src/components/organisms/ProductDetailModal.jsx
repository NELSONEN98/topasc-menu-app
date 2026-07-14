import './ProductDetailModal.css';
import { useCart } from '../../context/CartContext';

export const ProductDetailModal = ({ product, cartItems = [], onClose }) => {
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar modal">
          ×
        </button>

        <img
          src={product.image}
          alt={product.name}
          className="modal-image"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
          }}
        />

        <div className="modal-body">
          <h2 className="modal-name">{product.name}</h2>
          <p className="modal-category">{product.category}</p>
          <p className="modal-description">{product.description}</p>

          <div className="modal-price">{formatPrice(product.price)}</div>

          <div className="modal-actions">
            {quantity === 0 ? (
              <button className="modal-add-btn" onClick={handleAdd}>
                Agregar al carrito
              </button>
            ) : (
              <div className="modal-stepper">
                <button
                  className="modal-stepper__btn modal-stepper__btn--dec"
                  onClick={handleDecrement}
                >
                  −
                </button>
                <span className="modal-qty">{quantity}</span>
                <button
                  className="modal-stepper__btn modal-stepper__btn--inc"
                  onClick={handleIncrement}
                >
                  +
                </button>
              </div>
            )}
          </div>

          <button className="modal-close-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
