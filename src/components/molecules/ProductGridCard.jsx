import './ProductGridCard.css';
import { useCart } from '../../context/CartContext';

/**
 * `soloLectura`: la vista /menu, donde el cliente lee la carta y le pide al mozo.
 *
 * No es lo mismo que deshabilitar el boton: el boton NO se dibuja. Un "Agregar"
 * apagado invita a tocarlo y deja al cliente pensando que la app esta fallando,
 * cuando lo que pasa es que ahi no se pide por la app.
 */
export const ProductGridCard = ({ product, onProductClick, soloLectura = false }) => {
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
        {/* En solo lectura el carrito siempre está vacío, así que el contador no
            tendría nada que contar. Se corta igual de forma explícita: si mañana
            alguien llega a /menu con el carrito ya cargado de otra pestaña, ese
            número ahí no significaría nada. */}
        {!soloLectura && quantity > 0 && (
          <span className="grid-card__badge" aria-label={`${quantity} en el carrito`}>
            {quantity}
          </span>
        )}
      </div>
      <div className="grid-card__name">{nombre}</div>
      <div className="grid-card__body">
        {/* "desde" cuando el precio de arriba es el del tamaño más barato: decir
            $2.500 a secas con la de 2.5 lt en 11.000 sería mentirle al cliente. */}
        <div className="grid-card__price">
          {formatPrice(precio)}
          {product.presentaciones?.length > 1 && (
            <span className="grid-card__desde"> desde</span>
          )}
        </div>
        {!soloLectura && (
          <button
            className="grid-card__add"
            onClick={(e) => {
              e.stopPropagation();
              onProductClick?.(product);
            }}
          >
            Agregar
          </button>
        )}
        {/* En solo lectura reemplaza al "Agregar": el cliente igual quiere abrir
            el detalle para leer qué lleva el plato y en qué tamaños viene. */}
        {soloLectura && (
          <button
            className="grid-card__ver"
            onClick={(e) => {
              e.stopPropagation();
              onProductClick?.(product);
            }}
          >
            Ver
          </button>
        )}
      </div>
    </div>
  );
};
