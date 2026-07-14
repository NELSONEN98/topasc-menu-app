import { useEffect, useState } from 'react';
import './OrderConfirmation.css';

export const OrderConfirmation = ({ onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onComplete, 600);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`order-confirmation ${isExiting ? 'order-confirmation--exit' : ''}`}>
      <div className="order-confirmation__content">
        <div className="order-confirmation__checkmark">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#fff" strokeWidth="3" />
            <path
              d="M 30 50 L 45 65 L 70 35"
              fill="none"
              stroke="#fff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 className="order-confirmation__title">¡Pedido Confirmado!</h2>
        <p className="order-confirmation__message">
          Se abrirá WhatsApp para completar tu orden
        </p>
      </div>
    </div>
  );
};
