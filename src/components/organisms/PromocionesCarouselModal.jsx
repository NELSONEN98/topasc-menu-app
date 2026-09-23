import { useState } from 'react';
import { formatearPrecio } from '../../utils/formatoPedido';
import './PromocionesCarouselModal.css';

// Se abre una sola vez al entrar al menu, con todas las promos vigentes. El
// admin puede cargar varias: esto las recorre de a una en vez de amontonarlas
// en un solo modal ilegible.
//
// `onPedir` no agrega al carrito directo: abre el detalle del producto, que es
// donde se eligen salsas y presentacion. Una promo es un item como cualquier
// otro y puede necesitar esas dos cosas para poder venderse.
export const PromocionesCarouselModal = ({ promociones, onClose, onPedir }) => {
  const [indice, setIndice] = useState(0);

  // El indice se acota al largo actual en vez de usarse crudo. `promociones`
  // es una query reactiva de Convex: si el admin apaga o borra una promo
  // mientras el cliente tiene el carrusel abierto, la lista se acorta y un
  // `promociones[indice]` viejo devolveria undefined — y la linea siguiente
  // (promocion.imagenUrl) tira la app entera a pantalla en blanco, porque no
  // hay error boundary que lo frene.
  const indiceValido = Math.min(indice, promociones.length - 1);
  const promocion = promociones[indiceValido];
  const esUltima = indiceValido === promociones.length - 1;

  // La lista se vacio entre renders (el admin apago la ultima promo): no hay
  // nada que mostrar. Home igual desmonta el modal, esto es el cinturon.
  if (!promocion) return null;

  // Los dos se frenan en el borde: el boton ya viene deshabilitado ahi, esto
  // es el cinturon por si alguien lo dispara por teclado igual.
  const siguiente = () => setIndice(Math.min(promociones.length - 1, indiceValido + 1));
  const anterior = () => setIndice(Math.max(0, indiceValido - 1));

  return (
    <div className="promo-modal-overlay" onClick={onClose}>
      <div className="promo-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="promo-modal-close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>

        {promocion.imagenUrl && (
          <div className="promo-modal-imagen">
            <img src={promocion.imagenUrl} alt={promocion.nombre} />
          </div>
        )}

        <div className="promo-modal-body">
          <span className="promo-modal-etiqueta">Promoción del día</span>
          <h2 className="promo-modal-titulo">{promocion.nombre}</h2>

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
                  className={`promo-modal-dot ${i === indiceValido ? 'active' : ''}`}
                  onClick={() => setIndice(i)}
                  aria-label={`Ver promoción ${i + 1}`}
                  aria-current={i === indiceValido}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            className="promo-modal-btn promo-modal-btn--principal"
            onClick={() => onPedir(promocion)}
          >
            Pedir esta promo
          </button>

          {/* Los dos de navegacion van juntos y SIEMPRE renderizados, aunque
              no se puedan usar: si "Anterior" apareciera recien en la segunda
              promo, "Siguiente" se correria de lugar y el dedo erraria el
              boton que venia apretando. Se deshabilitan en los extremos en vez
              de esconderse. */}
          {promociones.length > 1 && (
            <div className="promo-modal-nav">
              <button
                type="button"
                className="promo-modal-btn"
                onClick={anterior}
                disabled={indiceValido === 0}
              >
                Anterior
              </button>
              <button
                type="button"
                className="promo-modal-btn"
                onClick={siguiente}
                disabled={esUltima}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
