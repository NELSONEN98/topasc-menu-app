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

export const OrderType = ({ onSelectType, onVerMenu, sede = null, onChangeSede }) => {
  /*
   * 'dine-in' no se elige aca: se entra por el QR de la mesa.
   *
   * 'pickup' tampoco se ofrece mas: la funcionalidad de RECOGER quedo CONGELADA,
   * no borrada. Todo su codigo sigue vivo a proposito — el literal 'pickup' en la
   * union del schema, "Recoger" en TIPO_LABEL, el PickupModal con su codigo de
   * retiro, y la rama de pickup en Cart.jsx. Los pedidos que ya estan guardados
   * con ese tipo tienen que seguir mostrandose en el panel, y descongelarlo tiene
   * que ser volver a agregar una opcion a este array y nada mas.
   *
   * El orden del array ES el orden en pantalla: la carta va primero porque es la
   * opcion que se elige casi siempre.
   */
  const orderTypes = [
    {
      // `verMenu` y no un `id` de tipoPedido: esta opcion ya NO arranca un pedido,
      // abre la carta de solo lectura en /menu. Marcarlo en los datos y no con un
      // `if` sobre el id deja a la vista que son dos cosas distintas.
      id: 'menu',
      verMenu: true,
      label: 'Ver Menú',
      icon: MenuIcon,
      // La descripcion cambio junto con el destino: antes prometia "haz tu pedido"
      // y ahora lleva a una carta donde no se pide. Dejarla habria sido mentirle
      // al cliente sobre lo que hace el boton.
      description: 'Mirá la carta completa y pedí en el local.',
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
              // Dos destinos distintos: la carta abre /menu, el resto arranca un
              // pedido. La navegación la resuelve quien nos monta (App.jsx), que
              // es donde vive el router — así esta pantalla sigue solo juntando la
              // elección, sin saber de rutas.
              onClick={() => (type.verMenu ? onVerMenu?.() : onSelectType(type.id))}
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
