import { useState } from 'react';
import { formatearPrecio } from '../../utils/formatoPedido';
import './PromocionesCarouselModal.css';

// Se abre una sola vez al entrar al menu, con todas las promos activas. El
// admin puede cargar varias: esto las recorre de a una en vez de amontonarlas
// en un solo modal ilegible.
export const PromocionesCarouselModal = ({ promociones, onClose }) => {
  const [indice, setIndice] = useState(0);
  const promocion = promociones[indice];
  const esUltima = indice === promociones.length - 1;

  const siguiente = () => {
    if (esUltima) {
      onClose();
      return;
    }
    setIndice((i) => i + 1);
  };

  const anterior = () => setIndice((i) => Math.max(0, i - 1));

  return (
    <div className="promo-modal-overlay" onClick={onClose}>
      <div className="promo-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="promo-modal-close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>

        {promocion.imagenUrl && (
          <div className="promo-modal-imagen">
            <img src={promocion.imagenUrl} alt={promocion.titulo} />
          </div>
        )}

        <div className="promo-modal-body">
          <span className="promo-modal-etiqueta">Promoción del día</span>
          <h2 className="promo-modal-titulo">{promocion.titulo}</h2>

          {promocion.descripcion && (
            <p className="promo-modal-descripcion">{promocion.descripcion}</p>
          )}

          {promocion.precio != null && (
            <p className="promo-modal-precio">{formatearPrecio(promocion.precio)}</p>
          )}

          {promociones.length > 1 && (
            <div className="promo-modal-dots" role="tablist" aria-label="Promociones">
              {promociones.map((p, i) => (
                <button
                  key={p._id}
                  className={`promo-modal-dot ${i === indice ? 'active' : ''}`}
                  onClick={() => setIndice(i)}
                  aria-label={`Ver promoción ${i + 1}`}
                  aria-current={i === indice}
                />
              ))}
            </div>
          )}

          <div className="promo-modal-acciones">
            {indice > 0 && (
              <button type="button" className="promo-modal-btn promo-modal-btn--secundario" onClick={anterior}>
                Anterior
              </button>
            )}
            <button type="button" className="promo-modal-btn" onClick={siguiente}>
              {esUltima ? 'Ver el menú' : 'Siguiente promo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
