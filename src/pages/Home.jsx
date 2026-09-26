import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Hero } from '../components/organisms/Hero';
import { CartBar } from '../components/organisms/CartBar';
import { BackButton } from '../components/atoms/BackButton';
import { ProductGrid } from '../components/organisms/ProductGrid';
import { ProductDetailModal } from '../components/organisms/ProductDetailModal';
import { PromocionesCarouselModal } from '../components/organisms/PromocionesCarouselModal';
import { useCart } from '../context/CartContext';
import { estaVigente } from '../utils/vigencia';
import { ITEMS_PER_PAGE } from '../config/settings';
import './Home.css';

// Referencia estable mientras las queries cargan: un `[]` nuevo por render
// rompe cualquier useEffect/useMemo que lo tenga como dependencia.
const SIN_DATOS = [];

// Pseudo-categoria: no viene de la tabla `categorias`, se arma con los items
// marcados `esPromo`. Vive en una constante y no como string suelto porque se
// compara en dos lugares (armar la lista de tabs y elegir que se muestra) y
// no pueden desincronizarse.
const CATEGORIA_PROMOS = 'Promociones del día';

export const Home = ({
  onNavigateToCart,
  onNavigateBack,
  mesa = null,
  sede = null,
}) => {
  const { cartItems, addToCart, getItemCount } = useCart();
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [promoCerrada, setPromoCerrada] = useState(false);

  // Sin el `?? SIN_DATOS` todavia en estos dos: hace falta distinguir
  // "no llego la respuesta" (undefined) de "llego y esta vacio" ([]) para
  // saber si corresponde el spinner. Con el fallback en esta misma linea,
  // esa distincion se pierde antes de poder usarla.
  // Sin sede (entrada por QR) el argumento va undefined y el server devuelve
  // el menu completo, en vez de dejar al cliente con la grilla vacia.
  const allItemsCargando = useQuery(api.items.listarMenu, {
    sedeId: sede?._id,
  });
  const allCategoriasCargando = useQuery(api.categorias.listar);
  const cargando = allItemsCargando === undefined || allCategoriasCargando === undefined;

  const allItems = allItemsCargando ?? SIN_DATOS;
  const allCategorias = allCategoriasCargando ?? SIN_DATOS;
  const salsas = useQuery(api.salsas.listarDisponibles) ?? SIN_DATOS;
  // Las promos son items como cualquier otro: salen de la misma query, se
  // agregan al carrito igual y viajan al pedido igual. `esPromo` solo cambia
  // DONDE se muestran.
  //
  // El filtro por fecha va ACA y no en la query a proposito: el dia de hoy lo
  // tiene que resolver el navegador con su hora local. Convex corre en UTC y
  // en Colombia (UTC-5) el server ya esta en el dia siguiente desde las 19:00,
  // asi que una promo que vence hoy se apagaria sola en plena hora pico.
  // Mismo criterio que StatusBar.jsx. Ver src/utils/vigencia.js.
  const promociones = useMemo(
    () => allItems.filter((item) => item.esPromo === true && estaVigente(item)),
    [allItems]
  );

  const hayPromos = promociones.length > 0;
  const esFiltroPromos = activeCategory === CATEGORIA_PROMOS;

  const categories = [
    'Todos',
    ...(hayPromos ? [CATEGORIA_PROMOS] : []),
    ...allCategorias.map(c => c.nombre),
  ];

  const allFiltered = esFiltroPromos
    ? promociones
    : activeCategory === 'Todos'
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
          {cargando ? (
            <div className="home__loading">
              <div className="home__loading-spinner" />
            </div>
          ) : esFiltroPromos && filteredProducts.length === 0 ? (
            <p className="home__vacio">Por ahora no hay promociones activas.</p>
          ) : (
            // Las promos se muestran con la misma tarjeta que el resto: son
            // productos, se agregan al carrito igual.
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
          categorias={allCategorias}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {hayPromos && !promoCerrada && (
        <PromocionesCarouselModal
          promociones={promociones}
          onClose={() => setPromoCerrada(true)}
          onPedir={(promo) => {
            // El carrusel se cierra y queda abierto el detalle: ahi se eligen
            // salsas y presentacion, que es lo que habilita el "Agregar".
            setPromoCerrada(true);
            setSelectedProduct(promo);
          }}
        />
      )}
    </div>
  );
};
