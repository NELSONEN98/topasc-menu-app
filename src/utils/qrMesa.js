import { QR_BASE_URL } from '../config/settings';

/*
 * Genera los QR de las mesas desde el navegador, para que el admin no dependa
 * de correr `npm run qr` en una terminal.
 *
 * Reproduce el mismo diseño que scripts/generar-qr.js a propósito: los dos
 * caminos tienen que producir el mismo sticker. Si divergen, dos tandas
 * impresas en momentos distintos se ven diferentes y nadie sabe cuál vale.
 */

// Sin barra final: más abajo se concatena "/mesa/<codigo>" y una barra de más
// genera "//mesa/XXXXX", que no matchea la ruta /mesa/:codigo de React Router
// y cae en el catch-all. En un QR ya impreso eso no se arregla.
const BASE = QR_BASE_URL.trim().replace(/\/+$/, '');

export const urlDeMesa = (codigo) => `${BASE}/mesa/${codigo}`;

// Etiqueta de las mesas sin local asignado. Debe coincidir con la del script.
export const SIN_SEDE = 'Sin sede asignada';

const LIENZO = { ancho: 1000, alto: 1320 };
const QR_PX = 800;

/*
 * Import dinámico: `qrcode` solo hace falta cuando el admin abre el QR de una
 * mesa. Cargarlo arriba lo metería en el bundle principal, que es el que baja
 * el CLIENTE para ver el menú desde el celular — y el cliente no genera QR
 * nunca. Se paga solo cuando se usa.
 */
const cargarQRCode = async () => (await import('qrcode')).default;

/** El QR solo, como data URL. Nivel H igual que el script (ver su nota). */
export const qrDataUrl = async (url) => {
  const QRCode = await cargarQRCode();

  return await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: QR_PX,
    color: { dark: '#000000', light: '#ffffff' },
  });
};

const cargarImagen = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo dibujar el QR'));
    img.src = src;
  });

/**
 * La tarjeta completa (sede + número + QR + código) como PNG data URL.
 *
 * Se arma en un <canvas> y no con `sharp` como el script: sharp es una librería
 * de node y no corre en el navegador. El resultado es el mismo PNG.
 */
export const pngTarjeta = async ({ sede, numero, codigo }) => {
  const url = urlDeMesa(codigo);
  const qr = await cargarImagen(await qrDataUrl(url));

  const canvas = document.createElement('canvas');
  canvas.width = LIENZO.ancho;
  canvas.height = LIENZO.alto;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, LIENZO.ancho, LIENZO.alto);
  ctx.textAlign = 'center';

  // Una mesa sin local se imprime igual pero avisando: si saliera con el mismo
  // formato que las demás, se pegaría sin que nadie note que sus pedidos van al
  // número de respaldo.
  const tieneSede = sede && sede !== SIN_SEDE;
  ctx.fillStyle = tieneSede ? '#E11E2B' : '#B00020';
  ctx.font = 'bold 46px Arial, Helvetica, sans-serif';
  ctx.fillText(tieneSede ? sede : '⚠ SIN SEDE — NO PEGAR', 500, 92);

  ctx.fillStyle = '#241C15';
  ctx.font = 'bold 76px Arial, Helvetica, sans-serif';
  ctx.fillText(`Mesa ${numero}`, 500, 184);

  ctx.drawImage(qr, (LIENZO.ancho - QR_PX) / 2, 232, QR_PX, QR_PX);

  // El código separado con espacios en vez de `ctx.letterSpacing`: esa
  // propiedad es reciente y no está en todos los navegadores, y si falta lo
  // hace en silencio (sale pegado, sin error).
  ctx.fillStyle = '#241C15';
  ctx.font = 'bold 58px Consolas, "Courier New", monospace';
  ctx.fillText(String(codigo).split('').join(' '), 500, 1150);

  ctx.fillStyle = '#666666';
  ctx.font = '30px Arial, Helvetica, sans-serif';
  ctx.fillText('Escanea para ver el menú y pedir', 500, 1225);

  return canvas.toDataURL('image/png');
};

// "Sede Dalia" -> "sede-dalia". El PNG se manda suelto por WhatsApp: del otro
// lado el nombre del archivo es todo el contexto que llega.
export const aSlug = (texto) =>
  String(texto)
    .normalize('NFD')
    // \p{Diacritic} y no un rango de combinantes literal: ese rango depende de
    // la codificación del archivo y si se rompe lo hace en silencio.
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const nombreArchivo = ({ sede, numero, codigo }) =>
  `${aSlug(sede || SIN_SEDE)}-mesa-${aSlug(numero)}-${codigo}.png`;

/** Dispara la descarga de un data URL con el nombre indicado. */
export const descargar = (dataUrl, nombre) => {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = nombre;
  // Firefox exige que el <a> esté en el documento para que el click cuente.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
