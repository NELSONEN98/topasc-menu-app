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

describe('urlDeCarta', () => {
  test('con sede entra directo a la carta de ese local', () => {
    // Es el punto del QR por sede: un sticker pegado en la pared de un local ya
    // sabe en qué local está. Preguntarle la sede a quien acaba de escanearlo es
    // pedirle un dato que el sticker ya tiene.
    expect(urlDeCarta('sede_dalia')).toBe(`${BASE}/menu?sede=sede_dalia`);
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
    expect(urlDeCarta('sede_x')).not.toContain('//menu');
    expect(urlDeCarta(null)).not.toContain('//menu');
  });

  test('apunta a /menu y no a la app de pedido', () => {
    // Si apuntara a "/" el cliente caería en el flujo de pedido, que es justo lo
    // que este QR viene a evitar.
    expect(urlDeCarta('sede_x')).toMatch(/\/menu(\?|$)/);
  });
});

describe('nombreArchivoCarta', () => {
  test('lleva el nombre de la sede, sin tildes ni espacios', () => {
    // El PNG se manda suelto por WhatsApp: del otro lado el nombre del archivo es
    // todo el contexto que llega.
    expect(nombreArchivoCarta({ sedeNombre: 'Sede Dalia' })).toBe('carta-sede-dalia.png');
  });

  test('normaliza acentos', () => {
    expect(nombreArchivoCarta({ sedeNombre: 'Sede Morichál' })).toBe(
      'carta-sede-morichal.png'
    );
  });

  test('sin sede se distingue igual', () => {
    // Un archivo llamado "carta-.png" no le dice nada a nadie.
    expect(nombreArchivoCarta()).toBe('carta-todas-las-sedes.png');
    expect(nombreArchivoCarta({ sedeNombre: null })).toBe('carta-todas-las-sedes.png');
  });

  test('se distingue del QR de mesa por el nombre', () => {
    // Los dos PNG se mandan por el mismo WhatsApp: si se llamaran parecido, se
    // termina pegando el de pedir donde iba el de leer.
    expect(nombreArchivoCarta({ sedeNombre: 'Sede Dalia' })).toContain('carta-');
    expect(nombreArchivoCarta({ sedeNombre: 'Sede Dalia' })).not.toContain('mesa');
  });
});
