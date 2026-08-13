import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { urlDeMesa, aSlug, nombreArchivo, SIN_SEDE } from './qrMesa';
import { QR_BASE_URL } from '../config/settings';

describe('urlDeMesa', () => {
  test('arma la ruta que espera React Router', () => {
    expect(urlDeMesa('K7M2QX')).toBe(`${QR_BASE_URL}/mesa/K7M2QX`);
  });

  test('no genera doble barra aunque la base termine en /', () => {
    // "//mesa/XXXXX" no matchea la ruta /mesa/:codigo y cae en el catch-all.
    // En un QR ya impreso eso no se arregla.
    expect(urlDeMesa('K7M2QX')).not.toContain('//mesa/');
  });
});

describe('nombre del archivo', () => {
  test('incluye sede, mesa y codigo', () => {
    expect(
      nombreArchivo({ sede: 'Sede Dalia', numero: '5', codigo: 'K7M2QX' })
    ).toBe('sede-dalia-mesa-5-K7M2QX.png');
  });

  test('una mesa sin sede queda marcada en el nombre', () => {
    // El PNG se manda suelto por WhatsApp: del otro lado el nombre del archivo
    // es todo el contexto que llega.
    expect(nombreArchivo({ sede: null, numero: '5', codigo: 'K7M2QX' })).toBe(
      'sin-sede-asignada-mesa-5-K7M2QX.png'
    );
  });

  test('dos mesas con el mismo numero en sedes distintas no colisionan', () => {
    const dalia = nombreArchivo({ sede: 'Sede Dalia', numero: '5', codigo: 'AAA111' });
    const morichal = nombreArchivo({ sede: 'Sede Morichal', numero: '5', codigo: 'BBB222' });

    // Cada local numera sus mesas 1..N: varias "Mesa 5" es lo normal, no la
    // excepcion.
    expect(dalia).not.toBe(morichal);
  });
});

describe('aSlug', () => {
  test('saca acentos y eñes', () => {
    expect(aSlug('Sede Peñón Café')).toBe('sede-penon-cafe');
  });

  test('no deja guiones sueltos en los bordes', () => {
    expect(aSlug('  Sede Dalia!  ')).toBe('sede-dalia');
  });
});

/*
 * El panel y `npm run qr` imprimen stickers que conviven pegados en las mesas
 * de un mismo local. Si divergieran, dos tandas hechas en momentos distintos
 * apuntarian a dominios distintos, y eso una vez impreso no se arregla.
 */
describe('panel y script comparten la misma fuente de verdad', () => {
  const script = readFileSync('scripts/generar-qr.js', 'utf8');

  test('el script importa QR_BASE_URL de settings en vez de tener su copia', () => {
    expect(script).toMatch(/import\s*\{\s*QR_BASE_URL\s*\}\s*from\s*["'].*settings\.js["']/);
  });

  test('el script no vuelve a hardcodear un dominio', () => {
    const asignaciones = script.match(/const BASE_URL\s*=\s*["'`]https?:/g);
    expect(asignaciones).toBeNull();
  });

  test('los dos usan la misma etiqueta para las mesas sin sede', () => {
    // Si no coincidieran, el nombre de archivo del panel y el del script
    // saldrian distintos para la misma mesa.
    expect(script).toContain(`"${SIN_SEDE}"`);
  });
});
