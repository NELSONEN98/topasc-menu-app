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
        <h1 className="splash-screen__title">Broaster</h1>
        <p className="splash-screen__subtitle">Topasc</p>
        <div className="splash-screen__loader"></div>
      </div>
    </div>
  );
};
