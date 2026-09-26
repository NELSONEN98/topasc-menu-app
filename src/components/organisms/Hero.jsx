import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import './Hero.css';

// Portada de respaldo mientras no haya ninguna cargada desde el admin.
const IMAGEN_POR_DEFECTO = '/fondo-test.jpg';

// Mismo valor que usa convex/configuracion.ts al crear la fila. Cubre el
// instante entre que monta el componente y responde la query.
const NOMBRE_POR_DEFECTO = 'Topasc';

/**
 * El titulo se achica segun cuantos caracteres tenga el nombre.
 *
 * Va escalonado y no en un tamaño fijo porque con un unico tamaño chico un
 * nombre corto como "Topasc" — que es el caso normal — quedaria como una
 * etiqueta perdida sobre la foto.
 *
 * Los numeros son para 'Anton' sobre los 390px de ancho del telefono: es una
 * condensada, gasta ~0.43em por letra, asi que a 2.875rem entran unos 19
 * caracteres y los 30 del tope necesitan ~1.875rem. Si algun dia se cambia la
 * tipografia del titulo, estos escalones se recalculan: una mas ancha recorta
 * antes de llegar al tope.
 *
 * Las medidas viven ACA y no en el CSS a proposito: el umbral y el tamaño que
 * le corresponde son un solo dato. Partidos en dos archivos, cambiar uno sin
 * el otro pasa desapercibido.
 *
 * El titulo va en UNA linea con `overflow: hidden` (ver Hero.css), asi que lo
 * que no entra se recorta sin aviso. El tope de largo lo pone el servidor
 * (LARGO_MAXIMO_NOMBRE en convex/configuracion.ts) y el ultimo escalon de esta
 * tabla tiene que cubrirlo.
 */
const ESCALONES_TITULO = [
  { hasta: 18, tamano: '2.875rem' },
  { hasta: 24, tamano: '2.25rem' },
  { hasta: Infinity, tamano: '1.875rem' },
];

const tamanoTitulo = (nombre) =>
  ESCALONES_TITULO.find(({ hasta }) => nombre.length <= hasta).tamano;

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
        {/* Variable y no `fontSize` inline: un inline le gana a la media query
            de desktop y la dejaria sin efecto. Ver Hero.css. */}
        <p className="hero-2a-title" style={{ '--hero-titulo': tamanoTitulo(nombre) }}>
          {nombre}
        </p>
      </div>
    </div>
  );
};
