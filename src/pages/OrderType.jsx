import { Hero } from '../components/organisms/Hero';
import './OrderType.css';

const DeliveryIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 20H40V38C40 39.1046 39.1046 40 38 40H10C8.89543 40 8 39.1046 8 38V20Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 20V10C12 8.89543 12.8954 8 14 8H34C35.1046 8 36 8.89543 36 10V20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 40V44M32 40V44" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PickupIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 16H38V40C38 41.1046 37.1046 42 36 42H12C10.8954 42 10 41.1046 10 40V16Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 16V12C14 10.8954 14.8954 10 16 10H32C33.1046 10 34 10.8954 34 12V16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 26L24 32L36 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DineInIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 10H36C37.1046 10 38 10.8954 38 12V22C38 23.1046 37.1046 24 36 24H12C10.8954 24 10 23.1046 10 22V12C10 10.8954 10.8954 10 12 10Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 24V36M24 24V36M32 24V36" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 36H34" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const OrderType = ({ onSelectType }) => {
  const orderTypes = [
    {
      id: 'dine-in',
      label: 'Pedir a la mesa',
      icon: DineInIcon,
      description: 'Come aquí en nuestro local',
    },
    {
      id: 'delivery',
      label: 'Domicilio',
      icon: DeliveryIcon,
      description: 'Recibe tu pedido en casa',
    },
    {
      id: 'pickup',
      label: 'Recoger',
      icon: PickupIcon,
      description: 'Retira tu pedido en tienda',
    },
  ];

  return (
    <div className="order-type">
      <Hero />

      <div className="order-type__header">
        <p className="order-type__subtitle">¿Cómo prefieres tu orden?</p>
      </div>

      <div className="order-type__buttons">
        {orderTypes.map((type) => {
          const IconComponent = type.icon;
          return (
            <button
              key={type.id}
              className="order-type__btn"
              onClick={() => onSelectType(type.id)}
              aria-label={type.label}
            >
              <div className="order-type__icon">
                <IconComponent />
              </div>
              <span className="order-type__label">{type.label}</span>
              <span className="order-type__desc">{type.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
