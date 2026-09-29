import { useState } from 'react';
import './ProductDetailModal.css';
import { useCart, SIN_SALSAS } from '../../context/CartContext';
import { esCategoriaDeBebida } from '../../utils/categorias';

// Referencia estable para el fallback: un `[]` nuevo por render no sirve como
// default de una prop.
const SIN_DATOS = [];

// Las dos preparaciones posibles de un jugo. Viajan como texto al pedido y al
// mensaje de WhatsApp, asi que son lo que lee la cocina.
export const EN_AGUA = 'En agua';
export const EN_LECHE = 'En leche';

export const ProductDetailModal = ({
  product,
  salsas = SIN_DATOS,
  categorias = SIN_DATOS,
  onClose,
  /*
   * `soloLectura`: la carta de /menu, donde el cliente lee y le pide al mozo.
   *
   * Se esconde TODO lo que es armar un pedido —salsas, preparación, tamaño,
   * cantidad, comentarios y el botón de agregar— y queda lo que uno quiere saber
   * de un plato antes de pedirlo: qué lleva y cuánto sale.
   *
   * Los precios de cada tamaño pasan a mostrarse como lista de lectura en vez de
   * un desplegable para elegir: en una carta eso es justamente la información,
   * no un paso del pedido.
   */
  soloLectura = false,
}) => {
  const { addToCart } = useCart();
  const [salsasSeleccionadas, setSalsasSeleccionadas] = useState([]);
  const [sinSalsas, setSinSalsas] = useState(false);
  const [extrasSeleccionados, setExtrasSeleccionados] = useState([]);
  const [comentario, setComentario] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [preparacion, setPreparacion] = useState(null);
  const [tamano, setTamano] = useState(null);

  /*
   * Una bebida NUNCA pide salsas, sin importar que diga el dato guardado.
   *
   * El flag `llevaSalsas` tiene el default al reves que el resto (undefined =
   * SI lleva), y el formulario del admin solo lo apaga cuando alguien abre y
   * guarda ese producto. Un jugo cargado antes de esa regla quedaba en `true`
   * y el boton de agregar se bloqueaba pidiendo elegir una salsa — para un
   * jugo. Paso de verdad con "Jugo tamarindo".
   *
   * Mirar la categoria y no solo el flag corta el problema en la raiz: el
   * dato puede estar viejo o mal cargado, la categoria manda.
   */
  const esBebida = esCategoriaDeBebida(categorias, product.categoriaId);

  // undefined = lleva salsas (default); false = bebidas, postres, etc.
  const llevaSalsas = !esBebida && product.llevaSalsas !== false;

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

  /*
   * Preparacion del jugo: en agua o en leche.
   *
   * La opcion existe si el producto tiene `precioConLeche` cargado — ese campo
   * ES el interruptor, no hay un booleano aparte que pueda contradecirlo (ver
   * la nota en schema.ts).
   *
   * Es obligatoria cuando existe: sin elegir, el local no sabe que preparar y
   * el precio de la linea seria una adivinanza.
   */
  const precioConLeche = product.precioConLeche;
  const ofrecePreparacion = precioConLeche != null && precioConLeche > 0;

  const preparaciones = ofrecePreparacion
    ? [
        { etiqueta: EN_AGUA, precio: product.precio ?? product.price },
        { etiqueta: EN_LECHE, precio: precioConLeche },
      ]
    : [];

  const preparacionElegida =
    preparaciones.find((p) => p.etiqueta === preparacion) ?? null;

  const preparacionResuelta = !ofrecePreparacion || preparacionElegida !== null;

  /*
   * Tamaño de la gaseosa: 350 ml, 1 lt, etc.
   *
   * La opcion existe si el producto trae `presentaciones` cargadas — ese array ES
   * el interruptor, igual que `precioConLeche` para los jugos (ver schema.ts). No
   * hay un booleano aparte que pueda contradecir a los datos, que es la leccion
   * que dejaron `llevaSalsas` y `llevaPresentacion`.
   *
   * Es obligatorio cuando existe: `product.precio` es el "desde $X" de la
   * tarjeta, no el precio de ninguna presentacion concreta, asi que sin elegir no
   * hay precio que cobrar.
   */
  const presentaciones = product.presentaciones ?? [];

  /*
   * Con UN solo tamaño no hay nada que elegir, asi que queda elegido de entrada y
   * el selector no se dibuja. Es el caso del agua (600 ml) y la cerveza (473 ml):
   * mostrarle al cliente un unico boton y bloquearle el "Agregar" hasta que lo
   * toque es friccion pura, y encima el precio ya seria ese mismo.
   *
   * Igual se registra: el pedido dice "600 ml" y el local no tiene que deducirlo
   * del nombre del producto.
   */
  const tamanoUnico = presentaciones.length === 1 ? presentaciones[0].tamano : null;
  const ofreceTamano = presentaciones.length > 1;

  const tamanoElegido =
    presentaciones.find((p) => p.tamano === (tamano ?? tamanoUnico)) ?? null;
  const tamanoResuelto = !ofreceTamano || tamanoElegido !== null;

  const puedeAgregar = salsaResuelta && preparacionResuelta && tamanoResuelto;

  // El precio de la preparacion REEMPLAZA al del producto, no se suma: el de
  // agua ya es `product.precio`. El del tamaño elegido funciona igual.
  const precioBase = preparacionElegida
    ? preparacionElegida.precio
    : tamanoElegido
      ? tamanoElegido.precio
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
      preparacion: preparacionElegida,
      // El carrito ya sabe manejar `presentacion`: le reemplaza el precio y la
      // mete en la clave de linea (para que una 500 ml no se fusione con una
      // 2 lt), y de ahi viaja al pedido y al mensaje de WhatsApp sin plomeria
      // nueva. Por eso se arma con la forma que ese contrato espera —
      // `{ sabor, tamano, precio }` — y el sabor sale del producto.
      presentacion: tamanoElegido
        ? {
            sabor: product.sabor ?? product.nombre ?? product.name,
            tamano: tamanoElegido.tamano,
            precio: tamanoElegido.precio,
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
            {/* Mientras no eligio, el precio del jugo es un "desde": decirlo a
                secas seria mentir, porque con leche cuesta mas. */}
            {ofrecePreparacion && !preparacionElegida && (
              <span className="detail-price__desde"> desde</span>
            )}
            {/* Igual con los tamaños: el precio del producto es el de la 350 ml,
                decirlo a secas cuando la 3 lt cuesta el triple seria mentir. */}
            {ofreceTamano && !tamanoElegido && (
              <span className="detail-price__desde"> desde</span>
            )}
          </div>

          {/*
            En la carta los precios por tamaño son INFORMACIÓN, no un paso del
            pedido: van como lista de lectura y no como desplegable. Así el cliente
            ve de una todo lo que puede pedirle al mozo, sin tener que abrir nada.
          */}
          {soloLectura && presentaciones.length > 0 && (
            <ul className="detail-lista-precios">
              {presentaciones.map((opcion) => (
                <li key={opcion.tamano} className="detail-lista-precios__fila">
                  <span>{opcion.tamano}</span>
                  <span className="detail-lista-precios__precio">
                    {formatPrice(opcion.precio)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Mismo criterio para los jugos: en agua y en leche con su precio. */}
          {soloLectura && ofrecePreparacion && (
            <ul className="detail-lista-precios">
              {preparaciones.map((opcion) => (
                <li key={opcion.etiqueta} className="detail-lista-precios__fila">
                  <span>{opcion.etiqueta}</span>
                  <span className="detail-lista-precios__precio">
                    {formatPrice(opcion.precio)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {ofreceTamano && !soloLectura && (
            <div className="detail-section">
              <div className="detail-section__header">
                <label className="detail-section__title" htmlFor="detail-tamano">
                  ¿Qué tamaño?
                </label>
                <span className="detail-section__badge detail-section__badge--required">
                  Obligatorio
                </span>
              </div>

              {/*
                Desplegable y no botones: una gaseosa puede tener seis tamaños, y
                seis botones con nombre y precio apilados ocupan media pantalla del
                celular — el cliente tiene que scrollear para volver a encontrar el
                "Agregar". Con dos o tres opciones los botones se leen mejor, pero
                acá el que manda es el caso peor.

                El precio va DENTRO de cada opción: es justamente lo que cambia
                entre un tamaño y otro, y esconderlo obliga a abrir el desplegable
                varias veces para comparar.

                Solo se ofrecen los tamaños que el local cargó con precio: los que
                dejó vacíos no se venden y no llegan hasta acá.
              */}
              <select
                id="detail-tamano"
                className="detail-select"
                value={tamano ?? ''}
                onChange={(e) => setTamano(e.target.value || null)}
              >
                <option value="">Elegí el tamaño</option>
                {presentaciones.map((opcion) => (
                  <option key={opcion.tamano} value={opcion.tamano}>
                    {opcion.tamano} — {formatPrice(opcion.precio)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {ofrecePreparacion && !soloLectura && (
            <div className="detail-section">
              <div className="detail-section__header">
                <span className="detail-section__title">¿Cómo lo preparamos?</span>
                <span className="detail-section__badge detail-section__badge--required">
                  Obligatorio
                </span>
              </div>

              {/* El precio va en cada opcion: es justamente lo que cambia entre
                  una y otra, y esconderlo obliga a tocar las dos para saber
                  cuanto sale. */}
              <div className="detail-chips" role="group" aria-label="Preparación del jugo">
                {preparaciones.map((opcion) => (
                  <button
                    key={opcion.etiqueta}
                    type="button"
                    className={`detail-chip ${
                      preparacion === opcion.etiqueta ? 'is-selected' : ''
                    }`}
                    onClick={() => setPreparacion(opcion.etiqueta)}
                    aria-pressed={preparacion === opcion.etiqueta}
                  >
                    <span className="detail-chip__nombre">{opcion.etiqueta}</span>
                    <span className="detail-chip__precio">{formatPrice(opcion.precio)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/*
            En la carta las salsas se MUESTRAN, no se eligen. Mismo criterio que los
            tamaños: el cliente quiere saber con qué viene el plato para pedírselo al
            mozo, y elegirlas es un paso del pedido que acá no existe.

            Las incluidas van en una línea corrida y no como lista vertical: son
            cinco o seis nombres cortos, y una fila por cada uno estiraría el modal
            sin agregar nada.
          */}
          {soloLectura && salsasBase.length > 0 && (
            <div className="detail-section">
              <div className="detail-section__header">
                <span className="detail-section__title">Salsas a elección</span>
                <span className="detail-section__badge">Incluidas</span>
              </div>

              <p className="detail-salsas-lectura">
                {salsasBase.map((salsa) => salsa.nombre).join(' · ')}
              </p>
            </div>
          )}

          {/* Las especiales van con su precio, igual que los tamaños: es lo que
              cambia entre una y otra y lo que el cliente necesita saber antes de
              pedirla. */}
          {soloLectura && salsasEspeciales.length > 0 && (
            <div className="detail-section">
              <div className="detail-section__header">
                <span className="detail-section__title">Salsas especiales</span>
                <span className="detail-section__badge">Tienen costo</span>
              </div>

              <ul className="detail-lista-precios">
                {salsasEspeciales.map((salsa) => (
                  <li key={salsa._id} className="detail-lista-precios__fila">
                    <span>{salsa.nombre}</span>
                    <span className="detail-lista-precios__precio">
                      + {formatPrice(salsa.precio)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {requiereSalsa && !soloLectura && (
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

          {salsasEspeciales.length > 0 && !soloLectura && (
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

          {/* Los comentarios son para el pedido: en la carta no hay pedido al que
              agregarlos. */}
          {!soloLectura && (
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
          )}

        </div>

        {/*
          En la carta el pie cambia por completo: no hay cantidad ni botón de
          agregar, y en su lugar se le dice al cliente qué tiene que hacer.

          Sin esa línea el modal termina en la nada y queda la duda de si falta
          un botón que no cargó — es justo el momento en que hay que decirle "esto
          se pide en el mostrador", no dejarlo adivinando.
        */}
        {soloLectura ? (
          <div className="detail-footer">
            <p className="detail-solo-lectura">
              Para pedir este producto, mostrale la carta a quien te atiende.
            </p>
          </div>
        ) : (
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
              {/* El texto dice QUE falta. Un "Elegí una salsa" fijo mandaba a
                  buscar salsas en un jugo al que solo le faltaba la
                  preparacion. */}
              {puedeAgregar
                ? `Agregar · ${formatPrice(total)}`
                : !tamanoResuelto
                  ? 'Elegí el tamaño'
                  : !preparacionResuelta
                    ? 'Elegí la preparación'
                    : 'Elegí una salsa'}
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};
