import { describe, expect, test } from 'vitest';
import { urlDeCarta, nombreArchivoCarta } from './qrCarta';
import { QR_BASE_URL } from '../config/settings';

/*
 * Lo que se testea acá es la URL y el nombre del archivo, no el PNG.
 *
 * El dibujo en canvas no se puede verificar de forma útil en jsdom —no hay motor
 * de render— y tampoco es donde está el riesgo. El riesgo está en la URL: un QR
 * impreso apunta ahí para siempre, y si sale mal hay que reimprimir los stickers.
 */

const BASE = QR_BASE_URL.trim().replace(/\/+$/, '');

const DALIA = { _id: 'sede_dalia', nombre: 'Sede Dalia', slug: 'dalia' };
const MORICHAL = { _id: 'sede_morichal', nombre: 'Sede Morichal' }; // sin slug propio

describe('urlDeCarta', () => {
  test('la sede va en la RUTA, no en un query param', () => {
    // Es lo que hace el link compartible: un "/menu?sede=j57x8k2m..." con el id de
    // Convex adentro no se puede dictar por teléfono, no se entiende al verlo, y
    // pegado en una bio de Instagram parece un link roto.
    expect(urlDeCarta(DALIA)).toBe(`${BASE}/menu/dalia`);
    expect(urlDeCarta(DALIA)).not.toContain('?');
  });

  test('una sede sin slug propio usa su nombre', () => {
    // Las que ya están en producción no tienen el campo: su QR tiene que funcionar
    // igual desde el día uno.
    expect(urlDeCarta(MORICHAL)).toBe(`${BASE}/menu/sede-morichal`);
  });

  test('sin sede cae al menú pelado, que muestra el selector', () => {
    // El QR genérico para redes o una tarjeta, donde no hay local implícito.
    expect(urlDeCarta(null)).toBe(`${BASE}/menu`);
    expect(urlDeCarta(undefined)).toBe(`${BASE}/menu`);
  });

  test('NO genera doble barra', () => {
    // Una barra de más hace "//menu", que no matchea la ruta de React Router y cae
    // en el catch-all. En un QR ya impreso eso no se arregla — es el mismo cuidado
    // que se tuvo con el QR de mesa.
    expect(urlDeCarta(DALIA)).not.toContain('//menu');
    expect(urlDeCarta(null)).not.toContain('//menu');
  });

  test('apunta a /menu y no a la app de pedido', () => {
    // Si apuntara a "/" el cliente caería en el flujo de pedido, que es justo lo
    // que este QR viene a evitar.
    expect(urlDeCarta(DALIA)).toMatch(/\/menu\//);
  });
});

describe('nombreArchivoCarta', () => {
  test('el archivo se llama igual que la URL a la que apunta', () => {
    // Es lo que hace trivial ver qué sticker corresponde a qué link. El PNG se
    // manda suelto por WhatsApp: del otro lado el nombre del archivo es todo el
    // contexto que llega.
    expect(nombreArchivoCarta({ sede: DALIA })).toBe('carta-dalia.png');
  });

  test('una sede sin slug propio usa su nombre normalizado', () => {
    expect(nombreArchivoCarta({ sede: MORICHAL })).toBe('carta-sede-morichal.png');
  });

  test('sin sede se distingue igual', () => {
    // Un archivo llamado "carta-.png" no le dice nada a nadie.
    expect(nombreArchivoCarta()).toBe('carta-todas-las-sedes.png');
    expect(nombreArchivoCarta({ sede: null })).toBe('carta-todas-las-sedes.png');
  });

  test('se distingue del QR de mesa por el nombre', () => {
    // Los dos PNG se mandan por el mismo WhatsApp: si se llamaran parecido, se
    // termina pegando el de pedir donde iba el de leer.
    expect(nombreArchivoCarta({ sede: DALIA })).toContain('carta-');
    expect(nombreArchivoCarta({ sede: DALIA })).not.toContain('mesa');
  });
});
