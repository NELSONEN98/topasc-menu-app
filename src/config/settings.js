/* ============================================================
   BROASTER TOPASC — Configuración
   Variables que se pueden cambiar fácilmente
   ============================================================ */

// Horario de respaldo: el horario real vive en la tabla `horariosAtencion` y se
// edita por día desde el admin. Esto solo se muestra mientras la query carga.
export const BUSINESS_HOURS = {
  openTime: '11:00',
  closeTime: '22:00',
};

// Domicilio de RESPALDO. El valor real lo pone cada sede desde el panel
// (`sedes.costoDomicilio`), porque el reparto de cada local cubre distancias
// distintas. Esto solo se usa si la sede todavia no lo tiene cargado.
//
// Recoger y comer en el local nunca pagan envio: eso ya no vive en este objeto
// sino en la condicion de Cart.jsx, que es donde se decide.
export const DELIVERY_FEES = {
  delivery: 10000,      // Domicilio: $10.000
};

// Moneda y formato
export const CURRENCY = {
  code: 'COP',
  symbol: '$',
  locale: 'es-CO',
};

// Nombre del negocio
export const BUSINESS_NAME = 'Topasc';

/*
 * Dominio al que apuntan los QR de las mesas.
 *
 * UN QR IMPRESO APUNTA ACA PARA SIEMPRE. Poner el dominio propio (topasc.com),
 * no la URL del hosting: si algun dia se migra de Vercel, el papel pegado en la
 * mesa tiene que seguir funcionando.
 *
 * Vive aca y no en el script de QR para que haya UNA sola fuente de verdad: el
 * panel y `npm run qr` generan el mismo codigo. Si cada uno tuviera la suya,
 * alcanzaria con que alguien cambie una para terminar con dos tandas de
 * stickers apuntando a dominios distintos, y eso no se arregla en el papel.
 *
 * A proposito NO se usa `window.location.origin`: el admin puede estar entrando
 * desde una URL de preview de Vercel, y esa URL quedaria impresa.
 */
export const QR_BASE_URL = 'https://topasc-menu-app.vercel.app';

// Número de WhatsApp para contacto (sin +, sin espacios)
export const WHATSAPP_NUMBER = '573206873870';

// Cantidad de productos por página en el menú del cliente
export const ITEMS_PER_PAGE = 6;

// Filas por página en las tablas del admin (pantalla más grande que el menú)
export const ADMIN_ITEMS_PER_PAGE = 8;

// Imagen por defecto cuando un producto se crea sin foto.
// Las salsas no llevan imagen.
export const PLACEHOLDER_PRODUCTO =
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop';
