import { useState } from 'react';
import { PaymentSelector } from '../molecules/PaymentSelector';
import { DatosCliente, validarDatosCliente } from '../molecules/DatosCliente';
import { useNotificacion } from '../../context/NotificacionContext';
import './TableNumberModal.css';
import './AddressModal.css';

export const AddressModal = ({ onConfirm, onCancel }) => {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [referencia, setReferencia] = useState('');
  const [metodoPago, setMetodoPago] = useState(null);
  const { notificar } = useNotificacion();

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
