import { Stepper } from '../atoms/Stepper';
import './CartItem.css';

export const CartItem = ({ item, onUpdateQuantity, onRemove }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="cart-item">
      <img
        src={item.image}
        alt={item.name}
        className="cart-item__image"
        onError={(e) => {
          e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop';
        }}
      />
      <div className="cart-item__info">
        <h4 className="cart-item__name">{item.name}</h4>
        <p className="cart-item__price">{formatPrice(item.price)}</p>
      </div>
      <div className="cart-item__controls">
        <Stepper
          value={item.quantity}
          onChange={(quantity) => onUpdateQuantity(item.id, quantity)}
        />
        <button
          className="cart-item__remove"
          onClick={() => onRemove(item.id)}
          aria-label="Eliminar producto"
        >
          ×
        </button>
      </div>
    </div>
  );
};
