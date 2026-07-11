import { Button } from '../atoms/Button';
import './ProductCard.css';

export const ProductCard = ({ product, onAddToCart }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="product-card">
      <div className="product-card__image-wrapper">
        <img
          src={product.image}
          alt={product.name}
          className="product-card__image"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop';
          }}
        />
      </div>
      <div className="product-card__content">
        <h3 className="product-card__name">{product.name}</h3>
        <p className="product-card__category">{product.category}</p>
        <p className="product-card__price">{formatPrice(product.price)}</p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onAddToCart(product)}
          className="product-card__btn"
        >
          Agregar al carrito
        </Button>
      </div>
    </div>
  );
};
