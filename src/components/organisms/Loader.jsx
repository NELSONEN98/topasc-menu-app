import './Loader.css';

export const Loader = ({ message = 'Cargando...' }) => {
  return (
    <div className="loader-screen">
      <div className="loader-title-wrap">
        <svg className="loader-crest" width="34" height="20" viewBox="0 0 34 20">
          <circle cx="5" cy="14" r="4" fill="#fff" />
          <circle cx="17" cy="5" r="6" fill="#fff" />
          <circle cx="29" cy="14" r="4" fill="#fff" />
        </svg>
        <p className="loader-title">Topasc</p>
        <p className="loader-tagline">Una historia que contar</p>
      </div>
      <div className="loader-spinner"></div>
      <p className="loader-caption">{message}</p>
    </div>
  );
};
