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
        {/*
          Una sola imagen con "Topasc" y "una historia que contar" ya
          dibujados adentro, en vez de logo + h1 + p sueltos. Reemplaza a los
          tres elementos anteriores.
        */}
        <img
          className="splash-screen__logo-full"
          src="/img/loader-logo.webp"
          alt="Topasc — una historia que contar"
          width="600"
          height="600"
        />
        <div className="splash-screen__loader"></div>
      </div>
    </div>
  );
};
