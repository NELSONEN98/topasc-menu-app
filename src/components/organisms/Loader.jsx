import './Loader.css';

export const Loader = ({ message = 'Cargando...' }) => {
  return (
    <div className="loader-screen">
      <img
        className="loader-logo"
        src="/img/logo-no-bg.png"
        alt="Topasc"
        width="200"
        height="200"
      />
      <div className="loader-title-wrap">
        <p className="loader-title">Topasc</p>
        <p className="loader-tagline">Una historia que contar</p>
      </div>
      <div className="loader-spinner"></div>
      <p className="loader-caption">{message}</p>
    </div>
  );
};
