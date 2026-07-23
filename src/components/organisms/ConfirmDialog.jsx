import { useEffect, useRef } from 'react';
import './ConfirmDialog.css';

export const ConfirmDialog = ({
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  peligroso = false,
  soloAceptar = false,
  onConfirmar,
  onCancelar,
}) => {
  const dialogoRef = useRef(null);

  useEffect(() => {
    // Escape cancela, como en cualquier dialogo del sistema
    const alPresionar = (e) => {
      if (e.key === 'Escape') onCancelar();
    };

    document.addEventListener('keydown', alPresionar);

    // El foco entra al dialogo para que el teclado no quede atras
    dialogoRef.current?.focus();

    // Sin scroll de fondo mientras el dialogo esta abierto
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.body.style.overflow = overflowPrevio;
    };
  }, [onCancelar]);

  return (
    <div className="confirm-overlay" onClick={onCancelar}>
      <div
        ref={dialogoRef}
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-titulo"
        aria-describedby={mensaje ? 'confirm-mensaje' : undefined}
        tabIndex={-1}
      >
        <h2 id="confirm-titulo" className="confirm-dialog__titulo">
          {titulo}
        </h2>

        {mensaje && (
          <p id="confirm-mensaje" className="confirm-dialog__mensaje">
            {mensaje}
          </p>
        )}

        <div className="confirm-dialog__acciones">
          {!soloAceptar && (
            <button
              type="button"
              className="confirm-btn confirm-btn--cancelar"
              onClick={onCancelar}
            >
              {textoCancelar}
            </button>
          )}
          <button
            type="button"
            className={`confirm-btn ${peligroso ? 'confirm-btn--peligro' : 'confirm-btn--confirmar'}`}
            onClick={onConfirmar}
            autoFocus
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
};
