import './CartBar.css';

export const CartBar = ({ itemCount = 0, total = 0, onClick, variant = 'red' }) => {
  if (itemCount === 0) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const pluralProductos = itemCount === 1 ? 'producto' : 'productos';

  return (
    <button
      className={`cart-bar cart-bar--${variant}`}
      onClick={onClick}
      aria-label="Ver orden"
    >
      <span className="cart-bar__count">
        {itemCount} {pluralProductos}
      </span>
      <span className="cart-bar__total">
        Ver orden · {formatPrice(total)} ›
      </span>
    </button>
  );
};
