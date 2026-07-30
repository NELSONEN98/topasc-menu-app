import { useEffect, useState } from 'react';
import './SplashScreen.css';

export const SplashScreen = ({ onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`splash-screen ${isExiting ? 'splash-screen--exit' : ''}`}>
      <div className="splash-screen__content">
        <img
          className="splash-screen__logo"
          src="/img/logo-no-bg.png"
          alt="Topasc"
          width="200"
          height="200"
        />
        <h1 className="splash-screen__title">Topasc</h1>
        <p className="splash-screen__tagline">Una historia que contar</p>
        <div className="splash-screen__loader"></div>
      </div>
    </div>
  );
};
