import './ProductGrid.css';
import { ProductGridCard } from '../molecules/ProductGridCard';

export const ProductGrid = ({ products, cartItems = [], onProductClick }) => {
  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductGridCard
          key={product._id || product.id}
          product={product}
          cartItems={cartItems}
          onProductClick={onProductClick}
        />
      ))}
    </div>
  );
};
