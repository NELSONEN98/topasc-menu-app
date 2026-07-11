import { useState } from 'react';
import { Hero } from '../components/organisms/Hero';
import { CartBar } from '../components/organisms/CartBar';
import { BackButton } from '../components/atoms/BackButton';
import { ItemCard } from '../components/molecules/ItemCard';
import { useCart } from '../context/CartContext';
import { mockProducts, categories } from '../data/products.mock';
import { ITEMS_PER_PAGE } from '../config/settings';
import './Home.css';

export const Home = ({ onNavigateToCart, onNavigateBack }) => {
  const { cartItems, addToCart, getItemCount } = useCart();
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);

  const allFiltered =
    activeCategory === 'Todos'
      ? mockProducts
      : mockProducts.filter((p) => p.category === activeCategory);

  const totalPages = Math.ceil(allFiltered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const filteredProducts = allFiltered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  return (
    <div className="home">
      <Hero />

      {onNavigateBack && (
        <div className="home__back">
          <BackButton onClick={onNavigateBack} label="Cambiar tipo de orden" />
        </div>
      )}

      <nav className="home__categories">
        {categories.map((category) => (
          <button
            key={category}
            className={`home__category-btn ${
              activeCategory === category ? 'active' : ''
            }`}
            onClick={() => handleCategoryChange(category)}
          >
            {category}
          </button>
        ))}
      </nav>

      <div className="home__products-wrapper">
        <div className="home__products">
          {filteredProducts.map((product) => (
            <ItemCard
              key={product.id}
              product={product}
              onAddToCart={addToCart}
              cartItems={cartItems}
            />
          ))}

          {totalPages > 1 && (
            <div className="home__pagination">
              <button
                className="home__pagination-btn"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                aria-label="Página anterior"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  className={`home__pagination-dot ${
                    currentPage === i + 1 ? 'active' : ''
                  }`}
                  onClick={() => setCurrentPage(i + 1)}
                  aria-label={`Página ${i + 1}`}
                  aria-current={currentPage === i + 1 ? 'page' : undefined}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="home__pagination-btn"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                aria-label="Página siguiente"
              >
                ›
              </button>
            </div>
          )}

          {/* Espacio para CartBar flotante */}
          <div className="home__products-spacer"></div>
        </div>

        {getItemCount() > 0 && (
          <CartBar
            itemCount={getItemCount()}
            total={cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)}
            onClick={onNavigateToCart}
            variant="red"
          />
        )}
      </div>
    </div>
  );
};
