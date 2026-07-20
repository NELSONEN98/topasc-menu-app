import './Header.css';

export const Header = ({ title = 'Topasc', variant = 'default' }) => {
  return (
    <header className="header">
      <div className="header__brand">
        <h1 className={`header__title header__title--${variant}`}>{title}</h1>
      </div>
    </header>
  );
};
