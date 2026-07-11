import './BackButton.css';

export const BackButton = ({ onClick, label = 'Atrás' }) => {
  return (
    <button className="back-btn" onClick={onClick} aria-label={label}>
      <span className="back-btn__icon">‹</span>
      <span className="back-btn__text">{label}</span>
    </button>
  );
};
