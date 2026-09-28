import { describe, expect, test } from 'vitest';
import { normalizarTelefonoCliente, formatearTelefono } from './telefonoCliente';

const normalizar = (valor) => normalizarTelefonoCliente(valor);

describe('normalizarTelefonoCliente — lo que se acepta', () => {
  test('un celular de 10 dígitos', () => {
    expect(normalizar('3001234567')).toEqual({ telefono: '3001234567', error: null });
  });

  test('con espacios, como lo escribe la gente', () => {
    // Nadie escribe diez dígitos pegados: se escribe "300 123 4567".
    expect(normalizar('300 123 4567').telefono).toBe('3001234567');
  });

  test('con guiones y paréntesis', () => {
    expect(normalizar('(300) 123-4567').telefono).toBe('3001234567');
  });

  test('con el código de país se guarda en formato local', () => {
    // El local marca desde Colombia: el 57 adelante no le sirve para nada.
    expect(normalizar('+57 300 123 4567').telefono).toBe('3001234567');
  });

  test('un fijo de 7 dígitos', () => {
    // No se deja afuera a quien solo tiene línea fija: el local igual lo llama.
    expect(normalizar('8901234')).toEqual({ telefono: '8901234', error: null });
  });

  test('un cero de larga distancia adelante se descarta', () => {
    expect(normalizar('03001234567').telefono).toBe('3001234567');
  });
});

describe('normalizarTelefonoCliente — lo que se rechaza', () => {
  test('vacío', () => {
    expect(normalizar('').error).toMatch(/Escribí tu teléfono/);
  });

  test('solo espacios', () => {
    expect(normalizar('   ').error).toMatch(/Escribí tu teléfono/);
  });

  test('undefined no explota', () => {
    // El modal lo llama en cada tecla, también antes de que haya valor.
    expect(normalizar(undefined).error).toMatch(/Escribí tu teléfono/);
  });

  test('demasiado corto', () => {
    // Un "300" no sirve para llamar a nadie: mejor frenarlo en el formulario que
    // descubrirlo cuando hay que avisar que el pedido se demora.
    expect(normalizar('300').error).toMatch(/incompleto/);
  });

  test('demasiado largo', () => {
    expect(normalizar('3001234567890').error).toMatch(/demasiados dígitos/);
  });

  test('letras sueltas cuentan como vacío', () => {
    expect(normalizar('no tengo').error).toMatch(/Escribí tu teléfono/);
  });
});

describe('formatearTelefono', () => {
  test('un celular se parte en grupos legibles', () => {
    // Es el número que el local dicta o marca: diez dígitos pegados se leen mal.
    expect(formatearTelefono('3001234567')).toBe('300 123 4567');
  });

  test('un fijo se devuelve tal cual', () => {
    // Partir 7 dígitos a ciegas inventaría una separación que no significa nada.
    expect(formatearTelefono('8901234')).toBe('8901234');
  });

  test('null no explota', () => {
    expect(formatearTelefono(null)).toBe('');
  });
});
