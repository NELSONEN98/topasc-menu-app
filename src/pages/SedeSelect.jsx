import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Hero } from '../components/organisms/Hero';
import './SedeSelect.css';

// Mismo patron que Home.jsx: mientras la query carga, se ve una lista vacia
// por un instante en vez de un loader de pantalla completa aparte. El Splash
// que ya se vio antes de llegar aca cumple ese rol — un segundo loader
// pisandole los talones se ve como una pantalla duplicada.
const SIN_DATOS = [];

export const SedeSelect = ({ onSelectSede }) => {
  const sedes = useQuery(api.sedes.listar) ?? SIN_DATOS;

  return (
    <div className="sede-select">
      <Hero />

      <div className="sede-select__header">
        <p className="sede-select__subtitle">¿Desde qué sede vas a pedir?</p>
      </div>

      <div className="sede-select__buttons">
        {sedes.map((sede) => (
          <button
            key={sede._id}
            className="sede-select__btn"
            onClick={() => onSelectSede(sede)}
          >
            <span className="sede-select__label">{sede.nombre}</span>
            {sede.direccion && (
              <span className="sede-select__direccion">{sede.direccion}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
