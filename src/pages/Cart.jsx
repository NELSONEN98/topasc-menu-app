import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Header } from '../components/organisms/Header';
import { CartItem } from '../components/molecules/CartItem';
import { Button } from '../components/atoms/Button';
import { OrderConfirmation } from '../components/organisms/OrderConfirmation';
import { TableNumberModal } from '../components/organisms/TableNumberModal';
import { AddressModal } from '../components/organisms/AddressModal';
import { PickupModal } from '../components/organisms/PickupModal';
import { BebidasModal } from '../components/organisms/BebidasModal';
import { ProductDetailModal } from '../components/organisms/ProductDetailModal';
import { useCart } from '../context/CartContext';
import { useNotificacion } from '../context/NotificacionContext';
import { esCategoriaDeBebida } from '../utils/categorias';
import { itemsVisibles } from '../utils/menu';
import { sedesParaElPedido } from '../utils/sedesParaElPedido';
import { armarMensajePedido } from '../utils/mensajePedido';
import { DELIVERY_FEES, WHATSAPP_NUMBER } from '../config/settings';
import './Cart.css';

// Referencia estable mientras las queries cargan: un `[]` nuevo por render
// rompe cualquier useMemo que lo tenga como dependencia.
const SIN_DATOS = [];

export const Cart = ({
  onNavigateToHome,
  orderType = 'delivery',
  mesa = null,
  sede = null,
}) => {
  const { cartItems, updateQuantity, removeFromCart, getTotal, clearCart } =
    useCart();
  const crearPedido = useMutation(api.pedidos.crear);
  const { notificar } = useNotificacion();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [address, setAddress] = useState(null);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickup, setPickup] = useState(null);
  const [showBebidas, setShowBebidas] = useState(false);
  const [bebidaElegida, setBebidaElegida] = useState(null);

  // Misma query que el menu, con la misma sede: la bebida que se ofrece aca
  // tiene que venderse en el local del pedido. Sin sede (entrada por QR) el
  // server devuelve el menu completo, igual que en Home.
  const items = useQuery(api.items.listarMenu, { sedeId: sede?._id }) ?? SIN_DATOS;
  const categorias = useQuery(api.categorias.listar) ?? SIN_DATOS;
  // El detalle de producto las necesita: una bebida podria llevar salsa, no
  // hay regla que lo impida.
  const salsas = useQuery(api.salsas.listarDisponibles) ?? SIN_DATOS;

  // `itemsVisibles` va tambien aca y no solo en el menu: si una promo vigente
  // tapa un jugo, ofrecerlo igual desde el carrito deja la promo sin efecto —
  // el cliente lo pediria al precio de siempre por la puerta de atras.
  const bebidas = useMemo(
    () =>
      itemsVisibles(items).filter((item) =>
        esCategoriaDeBebida(categorias, item.categoriaId)
      ),
    [items, categorias]
  );

  // Se pasa de la lista al detalle en vez de apilarlos: dos hojas abiertas a
  // la vez no dejan claro cual se cierra con el fondo.
  const elegirBebida = (bebida) => {
    setShowBebidas(false);
    setBebidaElegida(bebida);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  /*
   * El domicilio lo pone la sede. `??` y NO `||`: un envio gratis se guarda
   * como 0, y con `||` ese 0 se leeria como "sin configurar" y terminaria
   * cobrando el valor de respaldo. Seria cobrarle a un cliente un envio que
   * el local decidio regalar.
   *
   * Solo aplica a delivery: recoger y comer en el local nunca tienen costo de
   * envio. Antes esto salia de DELIVERY_FEES[orderType], que para 'dine-in'
   * ni siquiera acertaba la clave (el objeto la tiene como `dineIn`) y caia al
   * `|| 0` de casualidad.
   */
  /*
   * La sede efectiva: la que vino de afuera (QR de mesa) o la que el cliente eligio
   * en el modal de domicilio.
   *
   * En domicilio la sede se elige al FINAL, asi que hasta que confirme el modal no
   * hay sede — y sin sede no hay costo de domicilio que mostrar.
   */
  const sedeEfectiva = sede ?? address?.sede ?? null;
  const sedeSinDefinir = orderType === 'delivery' && !sedeEfectiva;

  const deliveryFee =
    orderType === 'delivery' && sedeEfectiva
      ? sedeEfectiva.costoDomicilio ?? DELIVERY_FEES.delivery
      : 0;
  const subtotal = getTotal();
  const total = subtotal + deliveryFee;

  /*
   * Que sedes pueden preparar lo que hay en el carrito.
   *
   * Hace falta porque la sede se elige al final: el cliente navega el menu completo
   * y puede armar un carrito que un local no tiene. En produccion son 3 de 49
   * productos, pero bastan para que un pedido llegue al WhatsApp de una sede que no
   * lo puede preparar.
   *
   * `itemsCompletos` pide el menu SIN sede a proposito: es de ahi que sale el
   * `sedeIds` de cada producto, y filtrado por sede no se podria comparar contra
   * las otras.
   */
  const sedesTodas = useQuery(api.sedes.listar) ?? SIN_DATOS;
  const itemsCompletos = useQuery(api.items.listarMenu, {}) ?? SIN_DATOS;

  const sedesPosibles = useMemo(
    () => sedesParaElPedido(sedesTodas, cartItems, itemsCompletos),
    [sedesTodas, cartItems, itemsCompletos]
  );

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      notificar.info('El carrito está vacío');
      return;
    }

    if (orderType === 'dine-in') {
      // Si viene por QR ya sabemos la mesa: no preguntamos el número
      if (mesa) {
        setShowConfirmation(true);
      } else {
        setShowTableModal(true);
      }
    } else if (orderType === 'delivery') {
      setShowAddressModal(true);
    } else if (orderType === 'pickup') {
      setShowPickupModal(true);
    } else {
      setShowConfirmation(true);
    }
  };

  const handleTableNumberConfirm = (number) => {
    setTableNumber(number);
    setShowTableModal(false);
    setShowConfirmation(true);
  };

  const handleAddressConfirm = (data) => {
    setAddress(data);
    setShowAddressModal(false);
    setShowConfirmation(true);
  };

  const handlePickupConfirm = (data) => {
    setPickup(data);
    setShowPickupModal(false);
    setShowConfirmation(true);
  };

  const handleConfirmationComplete = () => {
    // Persistir el pedido en Convex (fire-and-forget): el envío por WhatsApp
    // es el canal principal, así que un fallo al guardar no debe frenarlo.
    const pedidoItems = cartItems.map((item) => ({
      itemId: item.id,
      nombreSnapshot: item.name,
      precioSnapshot: item.price,
      cantidad: item.quantity,
      salsasBase: item.salsas?.length ? item.salsas : undefined,
      salsasExtra: item.salsasExtra?.length ? item.salsasExtra : undefined,
      preparacion: item.preparacion ?? undefined,
      presentacion: item.presentacion ?? undefined,
      notas: item.comentario || undefined,
    }));

    // La mesa por QR gana sobre el número tipeado manualmente
    const mesaNumeroFinal =
      orderType === 'dine-in' ? mesa?.numero || tableNumber : undefined;

    // El método de pago viene de la modal de domicilio o de recoger
    const metodoPago = address?.metodoPago ?? pickup?.metodoPago;

    // Nombre y teléfono los piden las dos modales con el mismo componente, así
    // que salen del que corresponda al tipo de pedido. En mesa no se piden: el
    // cliente está sentado en un número de mesa conocido y no hay nada que
    // llevarle ni a quién llamar, así que acá quedan en undefined.
    const cliente = address ?? pickup;

    crearPedido({
      tipoPedido: orderType,
      total,
      // `sedeEfectiva` y no `sede`: en domicilio la sede sale del modal, no de la
      // pantalla de entrada. Sin ella (pedido por QR sin sede) los dos van
      // undefined y Convex los omite — el pedido queda guardado igual, solo que
      // sin local asociado.
      sedeId: sedeEfectiva?._id,
      sedeNombre: sedeEfectiva?.nombre,
      costoDomicilio: orderType === 'delivery' ? deliveryFee : undefined,
      // Ya no salen solo de `pickup`: domicilio también los pide, y sin esto el
      // panel mostraba los pedidos a domicilio sin nombre ni forma de llamar.
      clienteNombre: cliente?.nombre,
      clienteTelefono: cliente?.telefono,
      codigoRetiro: pickup?.codigo,
      mesaId: orderType === 'dine-in' ? mesa?._id : undefined,
      mesaNumero: mesaNumeroFinal,
      direccionEntrega: address?.direccion,
      direccionReferencia: address?.referencia || undefined,
      metodoPago,
      items: pedidoItems,
    }).catch((e) =>
      console.error('No se pudo guardar el pedido en Convex:', e)
    );

    // El armado vive en src/utils/mensajePedido.js: es el canal PRINCIPAL del
    // pedido, así que está testeado renglón por renglón en vez de escrito a mano
    // acá adentro. La sede sigue yendo en el propio texto porque mientras los
    // locales compartan número de WhatsApp es lo único que dice para cuál es.
    const message = armarMensajePedido({
      orderType,
      items: cartItems,
      cliente,
      // La sede elegida: es la que el encabezado del mensaje tiene que nombrar.
      sede: sedeEfectiva,
      address,
      pickup,
      mesaNumero: mesaNumeroFinal,
      metodoPago,
      subtotal,
      deliveryFee,
      total,
      formatearPrecio: formatPrice,
    });

    /*
     * El WhatsApp de la sede ELEGIDA. Es la línea más importante de todo esto: de
     * acá depende a qué local le llega el pedido, y las tres sedes tienen números
     * distintos. Mandarlo al que no es significa que un local prepara algo que no
     * le pidieron y el otro nunca se enteró.
     *
     * Sin sede (pedido por QR sin sede asignada, ver la nota en App.jsx) cae al
     * número de respaldo de settings.js.
     */
    const numeroWhatsapp = sedeEfectiva?.whatsapp || WHATSAPP_NUMBER;
    const whatsappUrl = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(message)}`;

    setShowConfirmation(false);
    setTableNumber('');
    setAddress(null);
    setPickup(null);
    clearCart();

    // window.open corre fuera del gesto del click (viene del timer de la
    // animación), así que el navegador puede bloquearlo como popup. Si lo
    // bloquea (devuelve null), navegamos la ventana actual, que nunca se bloquea.
    const nuevaVentana = window.open(whatsappUrl, '_blank');
    if (!nuevaVentana) {
      window.location.href = whatsappUrl;
    }
  };

  return (
    <div className="cart">
      <Header title="Tu Orden" variant="neutral" />

      <div className="cart__top-action">
        <Button
          variant="secondary"
          size="md"
          onClick={onNavigateToHome}
          className="cart__continue-btn"
        >
          Seguir agregando +
        </Button>
      </div>

      {cartItems.length === 0 ? (
        <div className="cart__empty">
          <span className="cart__empty-icon">🧾</span>
          <h2 className="cart__empty-title">Tu orden está vacía</h2>
          <p className="cart__empty-message">
            Agrega productos para empezar tu orden
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={onNavigateToHome}
            className="cart__continue-btn"
          >
            Agregar productos
          </Button>
        </div>
      ) : (
        <>
          <div className="cart__items">
            {cartItems.map((item) => (
              <CartItem
                key={item.lineId}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
              />
            ))}
          </div>

          {/* Debajo de los productos y antes del total: es el ultimo momento
              en que el cliente repasa lo que pidio. Si el local no tiene
              bebidas cargadas para esta sede, el boton no aparece — abrir una
              hoja vacia es peor que no ofrecer nada. */}
          {bebidas.length > 0 && (
            <button
              type="button"
              className="cart__bebidas-btn"
              onClick={() => setShowBebidas(true)}
            >
              <span className="cart__bebidas-icono" aria-hidden="true">🥤</span>
              <span className="cart__bebidas-texto">
                <strong>¿Desea agregar bebida?</strong>
                <small>Agregá una bebida a tu orden</small>
              </span>
              <span className="cart__bebidas-mas" aria-hidden="true">+</span>
            </button>
          )}

          <div className="cart__summary">
            <div className="cart__summary-row">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {/*
              Mientras la sede no esté elegida NO se muestra un número de envío.

              El costo cambia entre sedes —una es gratis y dos cobran $2.000— así
              que mostrar el de respaldo y después cambiarlo sería decirle un precio
              y cobrarle otro. Preferible decir que falta un dato.
            */}
            {orderType === 'delivery' && (
              <div className="cart__summary-row">
                <span>Envío</span>
                <span>
                  {sedeSinDefinir
                    ? 'Según la sede'
                    : deliveryFee === 0
                      ? 'Gratis'
                      : formatPrice(deliveryFee)}
                </span>
              </div>
            )}
            <div className="cart__summary-row cart__summary-row--total">
              <span>Total</span>
              <span>
                {formatPrice(total)}
                {sedeSinDefinir && <span className="cart__summary-aviso"> + envío</span>}
              </span>
            </div>
          </div>

          <div className="cart__actions">
            <Button
              variant="success"
              size="lg"
              onClick={handleCheckout}
              className="cart__checkout-btn"
            >
              ✓ Confirmar por WhatsApp
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="cart__clear-btn"
            >
              Vaciar orden
            </Button>
          </div>
        </>
      )}

      {showTableModal && (
        <TableNumberModal
          onConfirm={handleTableNumberConfirm}
          onCancel={() => setShowTableModal(false)}
        />
      )}

      {showAddressModal && (
        <AddressModal
          onConfirm={handleAddressConfirm}
          onCancel={() => setShowAddressModal(false)}
          sedesPosibles={sedesPosibles}
        />
      )}

      {showPickupModal && (
        <PickupModal
          onConfirm={handlePickupConfirm}
          onCancel={() => setShowPickupModal(false)}
        />
      )}

      {showBebidas && (
        <BebidasModal
          bebidas={bebidas}
          onElegir={elegirBebida}
          onClose={() => setShowBebidas(false)}
        />
      )}

      {bebidaElegida && (
        <ProductDetailModal
          product={bebidaElegida}
          salsas={salsas}
          categorias={categorias}
          onClose={() => setBebidaElegida(null)}
        />
      )}

      {showConfirmation && (
        <OrderConfirmation onComplete={handleConfirmationComplete} />
      )}
    </div>
  );
};
