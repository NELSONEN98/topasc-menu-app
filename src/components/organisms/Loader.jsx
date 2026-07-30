import './Loader.css';

// showLogo: el logo es parte de la identidad del MENU del cliente (esta
// pantalla se usa mientras se busca la mesa por QR). En /admin, en cambio, es
// una pantalla de trabajo interno, no de marca — se pasa showLogo={false}
// para esa unica instancia.
export const Loader = ({ message = 'Cargando...', showLogo = true }) => {
  return (
    <div className="loader-screen">
      {showLogo && (
        <img
          className="loader-logo"
          src="/img/logo-no-bg.png"
          alt="Topasc"
          width="200"
          height="200"
        />
      )}
      <div className="loader-title-wrap">
        <p className="loader-title">Topasc</p>
        <p className="loader-tagline">Una historia que contar</p>
      </div>
      <div className="loader-spinner"></div>
      <p className="loader-caption">{message}</p>
    </div>
  );
};
