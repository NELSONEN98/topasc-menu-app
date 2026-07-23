import { useState } from 'react';
import { useNotificacion } from '../../context/NotificacionContext';
import './TableNumberModal.css';

export const TableNumberModal = ({ onConfirm, onCancel }) => {
  const [tableNumber, setTableNumber] = useState('');
  const { notificar } = useNotificacion();

  const handleConfirm = () => {
    if (!tableNumber.trim()) {
      notificar.info('Ingresá el número de mesa');
      return;
    }
    onConfirm(tableNumber);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <div className="table-modal-overlay" onClick={onCancel}>
      <div className="table-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="table-modal-header">
          <h2 className="table-modal-title">Número de Mesa</h2>
          <p className="table-modal-subtitle">¿En qué mesa estás sentado?</p>
        </div>

        <div className="table-modal-body">
          <div className="table-modal-icon">🪑</div>
          <input
            type="text"
            className="table-modal-input"
            placeholder="Ej: 5"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            onKeyPress={handleKeyPress}
            autoFocus
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
