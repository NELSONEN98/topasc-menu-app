import './Toaster.css';

const ICONO = {
  exito: '✓',
  error: '!',
  info: 'i',
};

export const Toaster = ({ toasts, onCerrar }) => {
  if (toasts.length === 0) return null;

  return (
    // aria-live polite: el lector de pantalla lo anuncia sin interrumpir
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map(({ id, tipo, mensaje }) => (
        <div key={id} className={`toast toast--${tipo}`}>
          <span className="toast__icono" aria-hidden="true">
            {ICONO[tipo] || ICONO.info}
          </span>
          <p className="toast__mensaje">{mensaje}</p>
          <button
            type="button"
            className="toast__cerrar"
            onClick={() => onCerrar(id)}
            aria-label="Cerrar notificación"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
