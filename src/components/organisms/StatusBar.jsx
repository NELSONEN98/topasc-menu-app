import { BUSINESS_HOURS } from '../../config/settings';
import './StatusBar.css';

export const StatusBar = () => {
  const { openTime, closeTime } = BUSINESS_HOURS;

  return (
    <div className="status-bar">
      <span className="status-bar__schedule">
        Abierto {openTime} - {closeTime}
      </span>
    </div>
  );
};
