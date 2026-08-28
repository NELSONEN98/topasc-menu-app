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
      {/*
        Arte a sangre completa: la imagen ya trae el fondo rojo dibujado
        adentro. El rojo del contenedor queda atrás como red de seguridad
        para cualquier franja que el cover no alcance a tapar, y para el
        instante previo a que la imagen termine de cargar.
      */}
      <img
        className="splash-screen__art"
        src="/img/loader-logov3.png"
        alt="Topasc — una historia que contar"
        width="1170"
        height="2532"
        fetchpriority="high"
      />
      <div className="splash-screen__loader"></div>
    </div>
  );
};
