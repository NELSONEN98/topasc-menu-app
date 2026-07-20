import { useState, useMemo } from 'react';
import './TableNumberModal.css';
import './AddressModal.css';

// Código de retiro corto y legible (sin caracteres ambiguos como O/0, I/1).
// Es una referencia para el chat de WhatsApp, no un ID garantizado único —
// cuando los pedidos se persistan en Convex, esto pasa a ser el ID real.
const generarCodigo = () => {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numeros = '23456789';
  const l = letras[Math.floor(Math.random() * letras.length)];
  const n1 = numeros[Math.floor(Math.random() * numeros.length)];
  const n2 = numeros[Math.floor(Math.random() * numeros.length)];
  return `${l}${n1}${n2}`;
};

export const PickupModal = ({ onConfirm, onCancel }) => {
  const [nombre, setNombre] = useState('');
  // Un único código por apertura de la modal
  const codigo = useMemo(() => generarCodigo(), []);

  const handleConfirm = () => {
    if (!nombre.trim()) {
      alert('Por favor ingresa tu nombre');
      return;
    }
    onConfirm({ nombre: nombre.trim(), codigo });
  };

  return (
    <div className="table-modal-overlay" onClick={onCancel}>
      <div className="table-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="table-modal-header">
          <h2 className="table-modal-title">Recoger en el local</h2>
          <p className="table-modal-subtitle">¿A nombre de quién preparamos la orden?</p>
        </div>

        <div className="table-modal-body">
          <div className="table-modal-icon">🏃</div>
          <input
            type="text"
            className="address-modal-input"
            placeholder="Tu nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
          />

          <div className="pickup-code">
            <span className="pickup-code__label">Tu código de retiro</span>
            <span className="pickup-code__value">{codigo}</span>
            <span className="pickup-code__hint">
              Mostralo o decilo al recoger tu orden
            </span>
          </div>
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
