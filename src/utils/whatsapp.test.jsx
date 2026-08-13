import { describe, expect, test } from 'vitest';
import { normalizarWhatsapp } from './whatsapp';

const numero = (valor) => normalizarWhatsapp(valor).numero;
const error = (valor) => normalizarWhatsapp(valor).error;

describe('normalizarWhatsapp — limpieza', () => {
  test.each([
    ['+57 320 687 3870', '573206873870'],
    ['+57 (320) 687-3870', '573206873870'],
    ['57 320 687 3870', '573206873870'],
    ['  573206873870  ', '573206873870'],
    ['573206873870', '573206873870'],
  ])('limpia %s', (entrada, esperado) => {
    // wa.me solo acepta digitos: cualquier +, espacio o guion rompe el link.
    expect(numero(entrada)).toBe(esperado);
  });
});

describe('normalizarWhatsapp — codigo de pais', () => {
  test('le antepone el 57 a un numero local', () => {
    // El negocio es 100% colombiano, asi que se completa en vez de rechazar.
    expect(numero('3206873870')).toBe('573206873870');
  });

  test('un numero local con espacios tambien se completa', () => {
    expect(numero('320 687 3870')).toBe('573206873870');
  });

  test('no duplica el codigo si ya lo trae', () => {
    expect(numero('573206873870')).toBe('573206873870');
  });

  test('saca el 00 del prefijo internacional', () => {
    expect(numero('00573206873870')).toBe('573206873870');
  });

  test('saca el 0 de larga distancia nacional', () => {
    expect(numero('03206873870')).toBe('573206873870');
  });
});

describe('normalizarWhatsapp — lo que rechaza', () => {
  test('vacio', () => {
    expect(error('')).toMatch(/Escribí el número/);
  });

  test('solo simbolos', () => {
    expect(error('+ - ()')).toMatch(/Escribí el número/);
  });

  test('demasiado corto', () => {
    // El caso "se me escapo un dedo": antes esto se guardaba sin chistar y el
    // link quedaba roto en silencio.
    expect(error('320687')).toMatch(/no parece un número colombiano/);
    expect(numero('320687')).toBeNull();
  });

  test('demasiado largo', () => {
    expect(error('5732068738701234')).toMatch(/no parece un número colombiano/);
  });

  test('once digitos: ni local ni completo', () => {
    expect(numero('32068738701')).toBeNull();
  });

  test('el mensaje dice que escribir, no solo que esta mal', () => {
    // Un error que no te dice como arreglarlo obliga a adivinar.
    expect(error('320687')).toMatch(/3206873870/);
    expect(error('320687')).toMatch(/573206873870/);
  });
});
