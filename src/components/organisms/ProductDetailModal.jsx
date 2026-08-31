import { useState } from 'react';
import './ProductDetailModal.css';
import { useCart, SIN_SALSAS } from '../../context/CartContext';

export const ProductDetailModal = ({
  product,
  salsas = [],
  presentaciones = [],
  onClose,
}) => {
  const { addToCart } = useCart();
  const [salsasSeleccionadas, setSalsasSeleccionadas] = useState([]);
  const [sinSalsas, setSinSalsas] = useState(false);
  const [extrasSeleccionados, setExtrasSeleccionados] = useState([]);
  const [saborElegido, setSaborElegido] = useState(null);
  const [tamanoElegido, setTamanoElegido] = useState(null);
  const [comentario, setComentario] = useState('');
  const [cantidad, setCantidad] = useState(1);

  // undefined = lleva salsas (default); false = bebidas, postres, etc.
  const llevaSalsas = product.llevaSalsas !== false;

  // Al reves que llevaSalsas: aca el default es NO. Ver la nota en schema.ts.
  const llevaPresentacion = product.llevaPresentacion === true;

  const opciones = llevaPresentacion ? presentaciones : [];

  // Sabores unicos, en el orden en que vinieron del servidor.
  const sabores = [...new Set(opciones.map((p) => p.sabor))];

  const tamanos = saborElegido
    ? opciones.filter((p) => p.sabor === saborElegido)
    : [];

  const presentacionElegida =
    opciones.find(
      (p) => p.sabor === saborElegido && p.tamano === tamanoElegido
    ) ?? null;

  const elegirSabor = (sabor) => {
    setSaborElegido(sabor);
    // Se conserva el tamaño solo si existe para el sabor nuevo. Sin este
    // chequeo, pasar de "Coca Cola 2 L" a un sabor que no tiene 2 L dejaria
    // marcado un tamaño inexistente, con `presentacionElegida` en null y el
    // boton bloqueado sin que se entienda por que.
    setTamanoElegido((previo) =>
      opciones.some((p) => p.sabor === sabor && p.tamano === previo)
        ? previo
        : null
    );
  };

  const ingredientes = product.ingredientes || [];

  const salsasBase = llevaSalsas ? salsas.filter((s) => s.tipo === 'base') : [];
  const salsasEspeciales = llevaSalsas
    ? salsas.filter((s) => s.tipo === 'especial')
    : [];

  // Si no hay salsas cargadas no bloqueamos la venta
  const requiereSalsa = salsasBase.length > 0;

  // Una salsa especial TAMBIEN cuenta como eleccion: si el cliente esta
  // pagando por la de la casa, ya eligio salsa. `extrasSeleccionados` es un
  // estado aparte de `salsasSeleccionadas` (que solo guarda las base), asi que
  // hay que mirar los dos o el boton queda bloqueado sin motivo.
  const salsaResuelta =
    !requiereSalsa ||
    salsasSeleccionadas.length > 0 ||
    extrasSeleccionados.length > 0 ||
    sinSalsas;

  // Mismo criterio que con las salsas: si el admin todavia no cargo ninguna
  // presentacion no se bloquea la venta, se cobra el precio del producto.
  const requierePresentacion = opciones.length > 0;
  const presentacionResuelta = !requierePresentacion || presentacionElegida !== null;

  const puedeAgregar = salsaResuelta && presentacionResuelta;

  // El precio de la presentacion REEMPLAZA al del producto, no se suma.
  const precioBase = presentacionElegida
    ? presentacionElegida.precio
    : product.precio ?? product.price;
  const precioExtras = extrasSeleccionados.reduce((sum, s) => sum + s.precio, 0);
  const total = (precioBase + precioExtras) * cantidad;

  const toggleSalsa = (salsa) => {
    // Elegir una salsa real desmarca "Sin salsas"
    setSinSalsas(false);
    setSalsasSeleccionadas((prev) =>
      prev.some((s) => s._id === salsa._id)
        ? prev.filter((s) => s._id !== salsa._id)
        : [...prev, salsa]
    );
  };

  const toggleSinSalsas = () => {
    setSinSalsas((prev) => {
      // Marcar "Sin salsas" limpia cualquier salsa elegida
      if (!prev) setSalsasSeleccionadas([]);
      return !prev;
    });
  };

  const toggleExtra = (salsa) => {
    setExtrasSeleccionados((prev) =>
      prev.some((s) => s._id === salsa._id)
        ? prev.filter((s) => s._id !== salsa._id)
        : [...prev, salsa]
    );
  };

  const handleAgregar = () => {
    if (!puedeAgregar) return;

    addToCart(product, {
      salsas: sinSalsas
        ? [SIN_SALSAS]
        : salsasSeleccionadas.map((s) => s.nombre),
      salsasExtra: extrasSeleccionados.map((s) => ({
        nombre: s.nombre,
        precio: s.precio,
      })),
      presentacion: presentacionElegida
        ? {
            sabor: presentacionElegida.sabor,
            tamano: presentacionElegida.tamano,
            precio: presentacionElegida.precio,
          }
        : null,
      comentario,
      cantidad,
    });
    onClose();
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-content" onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose} aria-label="Cerrar modal">
          ×
        </button>

        <img
          src={product.imagenUrl || product.image}
          alt={product.nombre || product.name}
          className="detail-image"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
          }}
        />

        <div className="detail-body">
          <h2 className="detail-name">{product.nombre || product.name}</h2>
          {(product.descripcion || product.description) && (
            <p className="detail-description">{product.descripcion || product.description}</p>
          )}

          {ingredientes.length > 0 && (
            <ul className="detail-ingredientes">
              {ingredientes.map((ingrediente) => (
                <li key={ingrediente} className="detail-ingrediente">
                  {ingrediente}
                </li>
              ))}
            </ul>
          )}

          <div className="detail-price">
            {formatPrice(precioBase)}
            {/* Mientras no eligio, el precio del producto es un "desde":
                decir el precio a secas seria mentir, porque el de 2 litros
                cuesta mas que el que esta viendo. */}
            {requierePresentacion && !presentacionElegida && (
              <span className="detail-price__desde"> desde</span>
            )}
          </div>

          {requierePresentacion && (
            <>
              <div className="detail-section">
                <div className="detail-section__header">
                  <span className="detail-section__title">Elegí el sabor</span>
                  <span className="detail-section__badge detail-section__badge--required">
                    Obligatorio
                  </span>
                </div>

                <div className="detail-chips" role="group" aria-label="Sabor de la gaseosa">
                  {sabores.map((sabor) => (
                    <button
                      key={sabor}
                      type="button"
                      className={`detail-chip ${saborElegido === sabor ? 'is-selected' : ''}`}
                      onClick={() => elegirSabor(sabor)}
                      aria-pressed={saborElegido === sabor}
                    >
                      {sabor}
                    </button>
                  ))}
                </div>
              </div>

              {saborElegido && (
                <div className="detail-section">
                  <div className="detail-section__header">
                    <span className="detail-section__title">Elegí el tamaño</span>
                    <span className="detail-section__badge detail-section__badge--required">
                      Obligatorio
                    </span>
                  </div>

                  {/* El precio va en cada chip: el tamaño es justamente lo
                      que lo cambia, y esconderlo obliga a tocar cada opcion
                      para descubrir cuanto sale. */}
                  <div className="detail-chips" role="group" aria-label="Tamaño de la gaseosa">
                    {tamanos.map((opcion) => (
                      <button
                        key={opcion._id}
                        type="button"
                        className={`detail-chip ${tamanoElegido === opcion.tamano ? 'is-selected' : ''}`}
                        onClick={() => setTamanoElegido(opcion.tamano)}
                        aria-pressed={tamanoElegido === opcion.tamano}
                      >
                        <span className="detail-chip__nombre">{opcion.tamano}</span>
                        <span className="detail-chip__precio">{formatPrice(opcion.precio)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {requiereSalsa && (
            <div className="detail-section">
              <div className="detail-section__header">
                <span className="detail-section__title">Elegí tus salsas</span>
                <span className="detail-section__badge detail-section__badge--required">
                  Mínimo 1
                </span>
              </div>

              <div className="detail-options" role="group" aria-label="Salsas incluidas">
                {salsasBase.map((salsa) => (
                  <label key={salsa._id} className="detail-option">
                    <input
                      type="checkbox"
                      className="detail-option__input"
                      checked={salsasSeleccionadas.some((s) => s._id === salsa._id)}
                      onChange={() => toggleSalsa(salsa)}
                    />
                    <span className="detail-option__name">{salsa.nombre}</span>
                  </label>
                ))}
                <label className="detail-option detail-option--none">
                  <input
                    type="checkbox"
                    className="detail-option__input"
                    checked={sinSalsas}
                    onChange={toggleSinSalsas}
                  />
                  <span className="detail-option__name">{SIN_SALSAS}</span>
                </label>
              </div>
            </div>
          )}

          {salsasEspeciales.length > 0 && (
            <div className="detail-section">
              <div className="detail-section__header">
                <span className="detail-section__title">Salsas especiales</span>
                <span className="detail-section__badge">Opcional</span>
              </div>

              <div className="detail-options">
                {salsasEspeciales.map((salsa) => (
                  <label key={salsa._id} className="detail-option">
                    <input
                      type="checkbox"
                      className="detail-option__input"
                      checked={extrasSeleccionados.some((s) => s._id === salsa._id)}
                      onChange={() => toggleExtra(salsa)}
                    />
                    <span className="detail-option__name">{salsa.nombre}</span>
                    <span className="detail-option__price">
                      +{formatPrice(salsa.precio)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="detail-section">
            <div className="detail-section__header">
              <span className="detail-section__title">Comentarios</span>
              <span className="detail-section__badge">Opcional</span>
            </div>
            <textarea
              className="detail-comment"
              placeholder="Ej: sin cebolla, bien crocante..."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              maxLength={200}
              rows={2}
            />
          </div>

        </div>

        <div className="detail-footer">
          {cantidad > 1 && llevaSalsas && (
            <p className="detail-hint">
              Las {cantidad} unidades llevan las mismas salsas y nota. Para
              salsas distintas, agregá cada una por separado.
            </p>
          )}
          <div className="detail-footer__row">
            <div className="detail-stepper">
              <button
                className="detail-stepper__btn detail-stepper__btn--dec"
                onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                aria-label="Disminuir cantidad"
              >
                −
              </button>
              <span className="detail-qty">{cantidad}</span>
              <button
                className="detail-stepper__btn detail-stepper__btn--inc"
                onClick={() => setCantidad(cantidad + 1)}
                aria-label="Aumentar cantidad"
              >
                +
              </button>
            </div>

            <button
              className="detail-add-btn"
              onClick={handleAgregar}
              disabled={!puedeAgregar}
            >
              {puedeAgregar
                ? `Agregar · ${formatPrice(total)}`
                : 'Elegí una salsa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
