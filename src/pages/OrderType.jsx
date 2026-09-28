import { Hero } from '../components/organisms/Hero';
import './OrderType.css';

const DeliveryIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 20H40V38C40 39.1046 39.1046 40 38 40H10C8.89543 40 8 39.1046 8 38V20Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 20V10C12 8.89543 12.8954 8 14 8H34C35.1046 8 36 8.89543 36 10V20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 40V44M32 40V44" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// La carta: una tarjeta con su título y sus renglones. Se eligió esto y no un
// cubierto porque el botón dice "Menú", y un tenedor leería como "comer acá" —
// que es justo el tipo de pedido que NO se elige desde esta pantalla (a dine-in
// se entra por el QR de la mesa).
const MenuIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="6" width="24" height="36" rx="3" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
    {/* Renglón del título, más corto y centrado: es lo que hace que la tarjeta
        se lea como una carta y no como una hoja cualquiera. */}
    <path d="M19 15H29" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M17 24H31" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M17 30H31" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M17 36H26" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const OrderType = ({ onSelectType, sede = null, onChangeSede }) => {
  // 'dine-in' ya no se elige acá: se entra automáticamente por el QR de la mesa
  //
  // El orden del array ES el orden en pantalla: "Menú" va primero porque es la
  // opción que se elige casi siempre.
  //
  // El `id` sigue siendo 'pickup' y no se renombra junto con la etiqueta: viaja
  // al pedido como `tipoPedido`, está en la unión del schema de Convex y es lo
  // que el panel traduce con TIPO_LABEL. Cambiarlo dejaría los pedidos ya
  // guardados con un tipo que la app no sabe leer. Lo que cambió es cómo se le
  // presenta al cliente, no qué tipo de pedido es.
  const orderTypes = [
    {
      id: 'pickup',
      label: 'Menú',
      icon: MenuIcon,
      // La descripción es la que ahora carga el significado: la etiqueta ya no
      // dice "recoger", así que sin esto el cliente no sabría que lo tiene que
      // ir a buscar al local.
      description: 'Retira tu pedido en tienda',
    },
    {
      id: 'delivery',
      label: 'Domicilio',
      icon: DeliveryIcon,
      description: 'Recibe tu pedido en casa',
    },
  ];

  return (
    <div className="order-type">
      <Hero />

      {sede && (
        <div className="order-type__sede-banner">
          <span>
            Pides desde: <strong>{sede.nombre}</strong>
          </span>
          <button
            type="button"
            className="order-type__sede-change"
            onClick={onChangeSede}
          >
            Cambiar
          </button>
        </div>
      )}

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
