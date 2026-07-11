import './Hero.css';

export const Hero = ({ title = 'Broaster Topasc', imageUrl = '/fondo-test.jpg' }) => {
  return (
    <div className="hero-2a">
      <img
        src={imageUrl}
        alt="Broaster Topasc"
        className="hero-2a-image"
        onError={(e) => {
          e.target.style.background = '#cfcfcf';
        }}
      />
      <div className="hero-2a-gradient"></div>
      <div className="hero-2a-title-block">
        <div className="hero-2a-title-wrap">
          <svg className="hero-2a-crest" width="34" height="20" viewBox="0 0 34 20">
            <circle cx="5" cy="14" r="4" fill="#fff" />
            <circle cx="17" cy="5" r="6" fill="#fff" />
            <circle cx="29" cy="14" r="4" fill="#fff" />
          </svg>
          <p className="hero-2a-title">Broaster</p>
        </div>
        <p className="hero-2a-title">Topasc</p>
      </div>
    </div>
  );
};
