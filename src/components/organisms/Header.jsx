import './Header.css';

export const Header = ({ title = 'Broaster Topasc', cartCount = 0, onCartClick, variant = 'default' }) => {
  return (
    <header className="header">
      <div className="header__brand">
        <h1 className={`header__title header__title--${variant}`}>{title}</h1>
      </div>
      <button
        className="header__cart-btn"
        onClick={onCartClick}
        aria-label="Ver carrito"
      >
        <span className="header__cart-icon">🛒</span>
        {cartCount > 0 && (
          <span className="header__cart-badge">{cartCount}</span>
        )}
      </button>
    </header>
  );
};
