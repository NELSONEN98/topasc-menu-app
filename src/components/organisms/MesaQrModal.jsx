import { useState, useEffect } from 'react';
import {
  urlDeMesa,
  pngTarjeta,
  nombreArchivo,
  descargar,
  SIN_SEDE,
} from '../../utils/qrMesa';
import '../styles/ProductModal.css';

export const MesaQrModal = ({ isOpen, onClose, mesa, sedeNombre }) => {
  const [tarjeta, setTarjeta] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !mesa) return;

    // `cancelado` evita pisar el estado si el admin cierra el modal (o salta a
    // otra mesa) mientras se esta generando: sin esto, la tarjeta de la mesa
    // anterior aparecería en el modal de la siguiente.
    let cancelado = false;

    setTarjeta(null);
    setError('');

    pngTarjeta({ sede: sedeNombre, numero: mesa.numero, codigo: mesa.codigo })
      .then((dataUrl) => {
        if (!cancelado) setTarjeta(dataUrl);
      })
      .catch((e) => {
        console.error('Error al generar el QR:', e);
        if (!cancelado) setError('No se pudo generar el QR. Recargá la página.');
      });

    return () => {
      cancelado = true;
    };
  }, [isOpen, mesa?._id, mesa?.numero, mesa?.codigo, sedeNombre]);

  if (!isOpen || !mesa) return null;

  const url = urlDeMesa(mesa.codigo);
  const tieneSede = sedeNombre && sedeNombre !== SIN_SEDE;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>QR de la mesa {mesa.numero}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-form">
          {!tieneSede && (
            <p className="admin-aviso">
              Esta mesa no tiene sede asignada: sus pedidos van al WhatsApp de
              respaldo, no al del local. Asignale una sede antes de imprimir el
              QR.
            </p>
          )}

          <div className="qr-preview">
            {error ? (
              <p className="qr-preview__error">{error}</p>
            ) : tarjeta ? (
              /* Se muestra la MISMA imagen que se descarga, no un QR aparte:
                 así lo que el admin ve en pantalla es exactamente lo que va a
                 imprimir, incluido el aviso de sede faltante. */
              <img
                src={tarjeta}
                alt={`QR de la mesa ${mesa.numero}`}
                className="qr-preview__img"
              />
            ) : (
              <p className="qr-preview__cargando">Generando QR…</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="qr-url">A dónde apunta</label>
            <input id="qr-url" type="text" value={url} readOnly />
            <small className="form-ayuda">
              Un QR impreso apunta acá para siempre. Si el dominio cambia, hay
              que reimprimir los stickers.
            </small>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cerrar
            </button>
            <button
              type="button"
              className="btn-save"
              disabled={!tarjeta}
              onClick={() =>
                descargar(
                  tarjeta,
                  nombreArchivo({
                    sede: sedeNombre,
                    numero: mesa.numero,
                    codigo: mesa.codigo,
                  })
                )
              }
            >
              Descargar PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
