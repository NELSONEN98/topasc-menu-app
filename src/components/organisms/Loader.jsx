import './Loader.css';

// showLogo: el logo es parte de la identidad del MENU del cliente (esta
// pantalla se usa mientras se busca la mesa por QR). En /admin, en cambio, es
// una pantalla de trabajo interno, no de marca — se pasa showLogo={false}
// para esa unica instancia.
export const Loader = ({ message = 'Cargando...', showLogo = true }) => {
  return (
    <div className="loader-screen">
      {/*
        Una sola imagen con "Topasc" y "una historia que contar" ya
        dibujados adentro, en vez de logo + titulo + tagline sueltos.
      */}
      {showLogo && (
        <img
          className="loader-logo-full"
          src="/img/loader-logo.webp"
          alt="Topasc — una historia que contar"
          width="600"
          height="600"
        />
      )}
      <div className="loader-spinner"></div>
      <p className="loader-caption">{message}</p>
    </div>
  );
};
