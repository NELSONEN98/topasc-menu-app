import { useState, useEffect } from 'react';
import {
  urlDeCarta,
  pngCarta,
  nombreArchivoCarta,
  descargar,
} from '../../utils/qrCarta';
import '../styles/ProductModal.css';

/**
 * QR de la carta de solo lectura (/menu), para pegar en la pared o en la barra.
 *
 * `sede` en null genera el QR generico, que abre el selector de local: sirve para
 * redes o una tarjeta, donde no hay un local implicito. Con sede, el QR entra
 * directo a la carta de ESE local.
 */
export const CartaQrModal = ({ isOpen, onClose, sede = null }) => {
  const [tarjeta, setTarjeta] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    // `cancelado` evita pisar el estado si el admin cierra el modal (o salta a
    // otra sede) mientras se esta generando: sin esto la tarjeta de la sede
    // anterior aparece en el modal de la siguiente. Mismo cuidado que MesaQrModal.
    let cancelado = false;

    setTarjeta(null);
    setError('');

    pngCarta({ sede })
      .then((dataUrl) => {
        if (!cancelado) setTarjeta(dataUrl);
      })
      .catch((e) => {
        console.error('Error al generar el QR de la carta:', e);
        if (!cancelado) setError('No se pudo generar el QR. Recargá la página.');
      });

    return () => {
      cancelado = true;
    };
    // `sede?.slug` va en las dependencias: si el admin le cambia la dirección a la
    // sede, la tarjeta tiene que redibujarse con el QR nuevo. Sin eso seguiría
    // mostrando —y descargando— un QR que apunta a la URL vieja.
  }, [isOpen, sede?._id, sede?.nombre, sede?.slug]);

  if (!isOpen) return null;

  const url = urlDeCarta(sede);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>QR de la carta{sede ? ` — ${sede.nombre}` : ''}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-form">
          <p className="admin-ayuda">
            Este QR abre la <strong>carta de solo lectura</strong>: el cliente ve los
            productos y los precios, pero no puede pedir desde el teléfono. Para que
            pida por la app, usá el QR de una mesa.
          </p>

          {!sede && (
            <p className="admin-aviso">
              Sin sede: este QR le va a pedir al cliente que elija el local. Si lo vas
              a pegar en un local concreto, generalo desde la fila de esa sede — así
              entra directo a su carta.
            </p>
          )}

          <div className="qr-preview">
            {error ? (
              <p className="qr-preview__error">{error}</p>
            ) : tarjeta ? (
              /* Se muestra la MISMA imagen que se descarga, no un QR aparte: lo
                 que el admin ve en pantalla es exactamente lo que va a imprimir. */
              <img src={tarjeta} alt="QR de la carta" className="qr-preview__img" />
            ) : (
              <p className="qr-preview__cargando">Generando QR…</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="qr-carta-url">A dónde apunta</label>
            <input id="qr-carta-url" type="text" value={url} readOnly />
            <small className="form-ayuda">
              Un QR impreso apunta acá para siempre. Si el dominio cambia, hay que
              reimprimir los stickers.
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
                  nombreArchivoCarta({ sede })
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
