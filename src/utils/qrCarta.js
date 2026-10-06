import { QR_BASE_URL } from '../config/settings';
import { qrDataUrl, aSlug, descargar } from './qrMesa';
import { slugDeSede } from './sedeSlug';

/*
 * QR de la CARTA de solo lectura (/menu), uno por sede.
 *
 * Es distinto del QR de mesa: ese abre /mesa/<codigo>, deja el pedido clavado a
 * esa mesa y el cliente pide por la app. Este abre /menu?sede=<id>, donde el
 * cliente solo LEE y le pide a quien lo atiende. Va pegado en la pared, en la
 * barra o en una carta plastificada — no en una mesa concreta.
 *
 * `qrDataUrl`, `aSlug` y `descargar` se importan de qrMesa.js y son genericos:
 * no tienen nada de mesas. Viven ahi porque fue el primer QR del proyecto. Si
 * aparece un tercero, conviene sacarlos a un `qr.js` compartido; con dos, mover
 * archivos y sus tests es mas riesgo que beneficio.
 */

// Sin barra final: mas abajo se concatena "/menu" y una barra de mas genera
// "//menu", que no matchea la ruta de React Router y cae en el catch-all. En un
// QR ya impreso eso no se arregla. Mismo cuidado que en qrMesa.js.
const BASE = QR_BASE_URL.trim().replace(/\/+$/, '');

/**
 * La sede va en la RUTA y no en un query param: /menu/sede-dalia.
 *
 * Es para compartir. Un `/menu?sede=j57x8k2m...` con el id de Convex adentro no se
 * puede dictar por telefono, no se entiende al verlo, y pegado en una bio de
 * Instagram parece un link roto. El slug se lee, se escribe a mano y se recuerda.
 *
 * Recibe la SEDE y no el slug suelto para que quien llama no tenga que acordarse
 * de derivarlo: el slug efectivo lo resuelve `slugDeSede` (campo guardado, o el
 * nombre como respaldo).
 *
 * Sin sede se cae a /menu pelado, que muestra el selector. Es el caso del QR
 * "generico" para redes o una tarjeta, donde no hay un local implicito.
 */
export const urlDeCarta = (sede) => {
  const slug = sede ? slugDeSede(sede) : '';

  return slug ? `${BASE}/menu/${slug}` : `${BASE}/menu`;
};

const LIENZO = { ancho: 1000, alto: 1320 };
const QR_PX = 800;

/**
 * La tarjeta imprimible (sede + titulo + QR + instruccion) como PNG data URL.
 *
 * Mismas medidas que la tarjeta de mesa a proposito: las dos se imprimen en el
 * mismo formato y se pegan juntas. Si una saliera mas grande, no se podrian
 * mandar a imprimir en la misma tanda.
 */
export const pngCarta = async ({ sede = null } = {}) => {
  const url = urlDeCarta(sede);

  const imagen = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo dibujar el QR'));
    // El src se asigna DESPUES de los handlers: si se asignara antes y la imagen
    // viniera de cache, `onload` podria dispararse sin que nadie lo escuche.
    qrDataUrl(url).then((dataUrl) => {
      img.src = dataUrl;
    }, reject);
  });

  const canvas = document.createElement('canvas');
  canvas.width = LIENZO.ancho;
  canvas.height = LIENZO.alto;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, LIENZO.ancho, LIENZO.alto);
  ctx.textAlign = 'center';

  // El nombre del local arriba, como en la tarjeta de mesa. Sin sede se aclara
  // que el QR sirve para cualquiera: si saliera en blanco, nadie sabria si el
  // sticker es de un local o de todos.
  ctx.fillStyle = '#E11E2B';
  ctx.font = 'bold 46px Arial, Helvetica, sans-serif';
  ctx.fillText(sede?.nombre || 'Todas las sedes', 500, 92);

  ctx.fillStyle = '#241C15';
  ctx.font = 'bold 76px Arial, Helvetica, sans-serif';
  ctx.fillText('Nuestra carta', 500, 184);

  ctx.drawImage(imagen, (LIENZO.ancho - QR_PX) / 2, 232, QR_PX, QR_PX);

  // Dos lineas y no una: la primera dice que hacer, la segunda administra la
  // expectativa. Sin la segunda el cliente escanea esperando poder pedir por el
  // telefono y se frustra buscando un boton que no existe.
  ctx.fillStyle = '#241C15';
  ctx.font = 'bold 52px Arial, Helvetica, sans-serif';
  ctx.fillText('Escaneá para ver la carta', 500, 1120);

  ctx.fillStyle = '#666666';
  ctx.font = '32px Arial, Helvetica, sans-serif';
  ctx.fillText('Tu pedido lo tomamos acá', 500, 1180);

  return canvas.toDataURL('image/png');
};

/** El PNG se manda suelto por WhatsApp: el nombre del archivo es todo el contexto. */
export const nombreArchivoCarta = ({ sede = null } = {}) =>
  // El slug y no el nombre: asi el archivo se llama igual que la URL a la que
  // apunta, y es trivial ver que sticker corresponde a que link.
  `carta-${sede ? slugDeSede(sede) : 'todas-las-sedes'}.png`;

export { descargar };
