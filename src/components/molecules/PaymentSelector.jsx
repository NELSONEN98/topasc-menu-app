import './PaymentSelector.css';

const OPCIONES = [
  { id: 'efectivo', label: 'Efectivo', icon: '💵' },
  { id: 'transferencia', label: 'Transferencia', icon: '📱' },
];

export const PaymentSelector = ({ value, onChange }) => {
  return (
    <div className="payment-selector">
      <span className="payment-selector__label">¿Cómo vas a pagar?</span>
      <div className="payment-selector__options">
        {OPCIONES.map((op) => (
          <button
            key={op.id}
            type="button"
            className={`payment-opt ${value === op.id ? 'payment-opt--active' : ''}`}
            onClick={() => onChange(op.id)}
            aria-pressed={value === op.id}
          >
            <span className="payment-opt__icon">{op.icon}</span>
            <span className="payment-opt__label">{op.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
