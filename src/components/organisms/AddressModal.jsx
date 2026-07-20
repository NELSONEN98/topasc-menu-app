import { useState } from 'react';
import './TableNumberModal.css';
import './AddressModal.css';

export const AddressModal = ({ onConfirm, onCancel }) => {
  const [direccion, setDireccion] = useState('');
  const [referencia, setReferencia] = useState('');

  const handleConfirm = () => {
    if (!direccion.trim()) {
      alert('Por favor ingresa la dirección de entrega');
      return;
    }
    onConfirm({ direccion: direccion.trim(), referencia: referencia.trim() });
  };

  return (
    <div className="table-modal-overlay" onClick={onCancel}>
      <div className="table-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="table-modal-header">
          <h2 className="table-modal-title">Dirección de entrega</h2>
          <p className="table-modal-subtitle">¿A dónde llevamos tu orden?</p>
        </div>

        <div className="table-modal-body">
          <div className="table-modal-icon address-modal-icon">🛵</div>
          <input
            type="text"
            className="address-modal-input"
            placeholder="Calle, número, barrio"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            autoFocus
          />
          <input
            type="text"
            className="address-modal-input"
            placeholder="Referencia (opcional): casa verde, portón..."
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
          />
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
