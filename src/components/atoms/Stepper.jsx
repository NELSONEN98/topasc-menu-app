import './Stepper.css';

export const Stepper = ({ value, onChange, min = 1, max = 99 }) => {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <div className="stepper">
      <button
        className="stepper__btn stepper__btn--minus"
        onClick={handleDecrement}
        disabled={value <= min}
        aria-label="Disminuir cantidad"
      >
        −
      </button>
      <span className="stepper__value">{value}</span>
      <button
        className="stepper__btn stepper__btn--plus"
        onClick={handleIncrement}
        disabled={value >= max}
        aria-label="Aumentar cantidad"
      >
        +
      </button>
    </div>
  );
};
