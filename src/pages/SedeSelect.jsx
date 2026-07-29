import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Hero } from '../components/organisms/Hero';
import { Loader } from '../components/organisms/Loader';
import './SedeSelect.css';

const SIN_DATOS = [];

export const SedeSelect = ({ onSelectSede }) => {
  const sedes = useQuery(api.sedes.listar);

  // undefined = la query todavia no respondio. Sin esto, en el primer render
  // `sedes` seria `[]` y el cliente veria "no hay sedes" por una fraccion de
  // segundo antes de que carguen — un falso vacio, no un vacio real.
  if (sedes === undefined) {
    return <Loader message="Cargando sedes..." />;
  }

  return (
    <div className="sede-select">
      <Hero />

      <div className="sede-select__header">
        <p className="sede-select__subtitle">¿Desde qué sede vas a pedir?</p>
      </div>

      <div className="sede-select__buttons">
        {(sedes ?? SIN_DATOS).map((sede) => (
          <button
            key={sede._id}
            className="sede-select__btn"
            onClick={() => onSelectSede(sede)}
          >
            <span className="sede-select__label">{sede.nombre}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
