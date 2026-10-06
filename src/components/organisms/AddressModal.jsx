import { useState } from 'react';
import { PaymentSelector } from '../molecules/PaymentSelector';
import { DatosCliente, validarDatosCliente } from '../molecules/DatosCliente';
import { useNotificacion } from '../../context/NotificacionContext';
import './TableNumberModal.css';
import './AddressModal.css';

/*
 * `sedesPosibles`: una fila por sede con `{ sede, puede, faltantes }`.
 *
 * La sede se elige ACA y no al entrar a la app: el cliente navega el menu completo
 * y recien al dejar sus datos dice de donde quiere que se lo manden. Eso le ahorra
 * un paso al principio, pero abre un agujero — puede armar un carrito que un local
 * no puede preparar. Por eso cada fila trae si esa sede puede y que le falta.
 *
 * El calculo vive afuera (src/utils/sedesParaElPedido.js) para que este modal siga
 * solo juntando datos, igual que el resto.
 */
export const AddressModal = ({ onConfirm, onCancel, sedesPosibles = [] }) => {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [referencia, setReferencia] = useState('');
  const [metodoPago, setMetodoPago] = useState(null);
  /*
   * Arranca en null aunque haya una sola sede posible: que el cliente vea de donde
   * sale su pedido y lo confirme es parte del pedido, no un detalle. Y el costo del
   * domicilio cambia entre sedes —en produccion una es gratis y dos cobran $2.000—,
   * asi que elegir por el no seria elegir por el: seria cobrarle lo que no eligio.
   */
  const [sedeElegida, setSedeElegida] = useState(null);
  const { notificar } = useNotificacion();

  const filaElegida = sedesPosibles.find((f) => f.sede._id === sedeElegida) ?? null;

  const handleConfirm = () => {
    // El cliente va primero porque es el primer campo del formulario: avisar por
    // el método de pago cuando falta el nombre manda a mirar al lugar equivocado.
    const cliente = validarDatosCliente({ nombre, telefono });
    if (cliente.error) {
      notificar.info(cliente.error);
      return;
    }
    if (!direccion.trim()) {
      notificar.info('Ingresá la dirección de entrega');
      return;
    }
    if (!filaElegida) {
      notificar.info('Elegí desde qué sede te lo enviamos');
      return;
    }
    /*
     * El corte va también acá y no solo en el botón deshabilitado: el pedido llega
     * al WhatsApp de ESA sede, así que mandarlo a un local que no tiene lo que le
     * pidieron se descubre por teléfono con el cliente esperando.
     */
    if (!filaElegida.puede) {
      notificar.info(
        `${filaElegida.sede.nombre} no tiene: ${filaElegida.faltantes.join(', ')}`
      );
      return;
    }
    if (!metodoPago) {
      notificar.info('Elegí el método de pago');
      return;
    }
    onConfirm({
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      direccion: direccion.trim(),
      referencia: referencia.trim(),
      metodoPago,
      // La sede completa y no solo el id: de ella salen el WhatsApp al que va el
      // pedido, el costo del domicilio y el nombre que queda guardado.
      sede: filaElegida.sede,
    });
  };

  return (
    <div className="table-modal-overlay" onClick={onCancel}>
      <div className="table-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="table-modal-header">
          <h2 className="table-modal-title">Datos de entrega</h2>
          <p className="table-modal-subtitle">¿Quién recibe y a dónde llevamos la orden?</p>
        </div>

        <div className="table-modal-body">
          <div className="table-modal-icon address-modal-icon">🛵</div>

          <DatosCliente
            nombre={nombre}
            telefono={telefono}
            onNombreChange={setNombre}
            onTelefonoChange={setTelefono}
            autoFocus
          />

          <input
            type="text"
            className="address-modal-input"
            placeholder="Calle, número, barrio"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
          />
          <input
            type="text"
            className="address-modal-input"
            placeholder="Referencia (opcional): casa verde, portón..."
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
          />

          {/*
            De qué sede sale el pedido. Va acá abajo, después de la dirección, por
            el orden en que el cliente piensa: primero a dónde va, después de dónde
            sale.

            El costo del domicilio se muestra en cada una porque CAMBIA entre sedes
            —en producción una es gratis y dos cobran $2.000— y es un dato con el
            que el cliente querrá elegir. Esconderlo hasta el total final sería
            cobrarle sin decirle.
          */}
          <div className="sede-pedido">
            <span className="sede-pedido__titulo">¿Desde qué sede te lo enviamos?</span>

            {sedesPosibles.map(({ sede, puede, faltantes }) => (
              <label
                key={sede._id}
                className={`sede-pedido__opcion ${puede ? '' : 'is-no-puede'}`}
                htmlFor={`sede-${sede._id}`}
              >
                <input
                  id={`sede-${sede._id}`}
                  type="radio"
                  name="sedePedido"
                  checked={sedeElegida === sede._id}
                  onChange={() => setSedeElegida(sede._id)}
                  // Deshabilitado y no escondido: el cliente ve que la sede existe
                  // y por qué no le sirve, en vez de una lista más corta sin
                  // explicación.
                  disabled={!puede}
                />
                <span className="sede-pedido__texto">
                  <strong>{sede.nombre}</strong>
                  {puede ? (
                    <small>
                      {/* `?? ` y nunca `||`: un envío gratis vale 0, y con `||` ese
                          0 se leería como "sin configurar". */}
                      {(sede.costoDomicilio ?? null) === 0
                        ? 'Envío gratis'
                        : sede.costoDomicilio != null
                          ? `Envío $${sede.costoDomicilio.toLocaleString('es-CO')}`
                          : 'Envío a confirmar'}
                    </small>
                  ) : (
                    <small className="sede-pedido__falta">
                      No tiene: {faltantes.join(', ')}
                    </small>
                  )}
                </span>
              </label>
            ))}
          </div>

          <PaymentSelector value={metodoPago} onChange={setMetodoPago} />
        </div>

        <div className="table-modal-actions">
          <button className="table-modal-btn table-modal-btn--cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button className="table-modal-btn table-modal-btn--confirm" onClick={handleConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};
