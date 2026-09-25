import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import './Hero.css';

// Portada de respaldo mientras no haya ninguna cargada desde el admin.
const IMAGEN_POR_DEFECTO = '/fondo-test.jpg';

// Mismo valor que usa convex/configuracion.ts al crear la fila. Cubre el
// instante entre que monta el componente y responde la query.
const NOMBRE_POR_DEFECTO = 'Topasc';

/**
 * El Hero consulta la configuracion por su cuenta en vez de recibirla por
 * prop.
 *
 * Se usa en tres pantallas del flujo del cliente (menu, eleccion de sede y
 * tipo de pedido) y la portada es una sola para toda la app. Pasarla desde
 * arriba obligaria a repetir la misma query en los tres contenedores.
 * Convex deduplica suscripciones identicas, asi que las tres pantallas
 * comparten una sola.
 *
 * `imageUrl` sigue existiendo como override explicito: es lo que permite
 * renderizarlo aislado en un test sin levantar Convex.
 */
export const Hero = ({ title, imageUrl }) => {
  const config = useQuery(api.configuracion.obtener);
  const src = imageUrl ?? config?.imagenHeaderUrl ?? IMAGEN_POR_DEFECTO;

  // Se edita desde el panel (Apariencia). El `title` explicito sigue primero
  // para poder renderizarlo aislado en un test, igual que `imageUrl`, y
  // NOMBRE_POR_DEFECTO cubre el instante en que la query todavia no respondio
  // — sin eso el titulo parpadea vacio en cada carga.
  const nombre = title ?? config?.nombreRestaurante ?? NOMBRE_POR_DEFECTO;

  return (
    <div className="hero-2a">
      <img
        src={src}
        alt={nombre}
        className="hero-2a-image"
        onError={(e) => {
          e.target.style.background = '#cfcfcf';
        }}
      />
      <div className="hero-2a-gradient"></div>
      <div className="hero-2a-title-block">
        <div className="hero-2a-title-wrap">
          <svg className="hero-2a-crest" width="34" height="20" viewBox="0 0 34 20">
            <circle cx="5" cy="14" r="4" fill="#fff" />
            <circle cx="17" cy="5" r="6" fill="#fff" />
            <circle cx="29" cy="14" r="4" fill="#fff" />
          </svg>
          <p className="hero-2a-title">{nombre}</p>
        </div>
      </div>
    </div>
  );
};
