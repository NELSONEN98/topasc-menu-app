import './ProductGridCard.css';
import { useCart } from '../../context/CartContext';

export const ProductGridCard = ({ product, onProductClick }) => {
  const { getProductQuantity } = useCart();
  const productId = product._id || product.id;
  const quantity = getProductQuantity(productId);

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
      <div className="grid-card__image-wrap">
        <img
          src={imagenUrl}
          alt={nombre}
          className="grid-card__image"
          onClick={() => onProductClick?.(product)}
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop';
          }}
        />
        {quantity > 0 && (
          <span className="grid-card__badge" aria-label={`${quantity} en el carrito`}>
            {quantity}
          </span>
        )}
      </div>
      <div className="grid-card__name">{nombre}</div>
      <div className="grid-card__body">
        <div className="grid-card__price">{formatPrice(precio)}</div>
        <button
          className="grid-card__add"
          onClick={(e) => {
            e.stopPropagation();
            onProductClick?.(product);
          }}
        >
          Agregar
        </button>
      </div>
    </div>
  );
};
