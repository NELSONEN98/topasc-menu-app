import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Hero } from '../components/organisms/Hero';
import { CartBar } from '../components/organisms/CartBar';
import { BackButton } from '../components/atoms/BackButton';
import { ProductGrid } from '../components/organisms/ProductGrid';
import { ProductDetailModal } from '../components/organisms/ProductDetailModal';
import { useCart } from '../context/CartContext';
import { ITEMS_PER_PAGE } from '../config/settings';
import './Home.css';

// Referencia estable mientras las queries cargan: un `[]` nuevo por render
// rompe cualquier useEffect/useMemo que lo tenga como dependencia.
const SIN_DATOS = [];

export const Home = ({ onNavigateToCart, onNavigateBack, mesa = null }) => {
  const { cartItems, addToCart, getItemCount } = useCart();
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const allItems = useQuery(api.items.listarMenu) ?? SIN_DATOS;
  const allCategorias = useQuery(api.categorias.listar) ?? SIN_DATOS;
  const salsas = useQuery(api.salsas.listarDisponibles) ?? SIN_DATOS;

  const categories = ['Todos', ...allCategorias.map(c => c.nombre)];

  const allFiltered =
    activeCategory === 'Todos'
      ? allItems
      : allItems.filter((p) => p.categoriaId && allCategorias.find(cat => cat._id === p.categoriaId && cat.nombre === activeCategory));

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

      {mesa && (
        <div className="home__mesa-banner">
          Estás en la <strong>Mesa {mesa.numero}</strong>
        </div>
      )}

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
          {allItems === undefined ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
              Cargando menú...
            </div>
          ) : (
            <ProductGrid
              products={filteredProducts}
              onProductClick={setSelectedProduct}
            />
          )}

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

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          salsas={salsas}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};
