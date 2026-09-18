import './PromoGridCard.css';
import { formatearPrecio } from '../../utils/formatoPedido';

// A diferencia de ProductGridCard, esto no se agrega al carrito: la promo es
// informativa (imagen, titulo, descripcion, precio). El cliente pide como
// siempre, por WhatsApp o en mesa.
export const PromoGridCard = ({ promocion }) => (
  <div className="grid-card promo-grid-card">
    <div className="grid-card__image-wrap">
      {promocion.imagenUrl ? (
        <img src={promocion.imagenUrl} alt={promocion.titulo} className="grid-card__image" />
      ) : (
        <div className="grid-card__image promo-grid-card__image--vacio" aria-hidden="true" />
      )}
    </div>
    <div className="grid-card__name">{promocion.titulo}</div>
    <div className="grid-card__body">
      {promocion.descripcion && (
        <p className="promo-grid-card__desc">{promocion.descripcion}</p>
      )}
      {promocion.precio != null && (
        <div className="grid-card__price">{formatearPrecio(promocion.precio)}</div>
      )}
    </div>
  </div>
);
