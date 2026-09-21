import { ProductGrid } from './ProductGrid';
import './BebidasModal.css';

/**
 * Hoja inferior con las bebidas del local, para sumarlas sin salir del carrito.
 *
 * No agrega al carrito por su cuenta: elegir una bebida devuelve el producto
 * con `onElegir` y el carrito abre el mismo detalle que el menu. Las gaseosas
 * piden sabor y tamaño obligatorios, y esa eleccion ya vive (y esta probada)
 * en ProductDetailModal — duplicarla aca seria una segunda version que
 * tarde o temprano cobra otro precio.
 */
export const BebidasModal = ({ bebidas, onElegir, onClose }) => (
  <div className="bebidas-overlay" onClick={onClose}>
    <div
      className="bebidas-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bebidas-titulo"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bebidas-header">
        <h2 id="bebidas-titulo" className="bebidas-titulo">
          ¿Algo para tomar?
        </h2>
        <button className="bebidas-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
      </div>

      <div className="bebidas-lista">
        <ProductGrid products={bebidas} onProductClick={onElegir} />
      </div>
    </div>
  </div>
);
