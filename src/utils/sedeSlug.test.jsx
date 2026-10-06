import { describe, expect, test } from 'vitest';
import { slugDeSede, sedePorSlug, errorDeSlug } from './sedeSlug';

const DALIA = { _id: 'sede_dalia', nombre: 'Sede Dalia', slug: 'dalia' };
const MORICHAL = { _id: 'sede_morichal', nombre: 'Sede Morichal' }; // sin slug guardado
const ACENTOS = { _id: 'sede_acentos', nombre: 'Sede Peñalosa' };

const SEDES = [DALIA, MORICHAL, ACENTOS];

describe('slugDeSede — el campo guardado manda', () => {
  test('usa el slug guardado, no el nombre', () => {
    // Es la razón de ser del campo: esta URL se imprime en un QR y se pega en la
    // pared. Si saliera del nombre, renombrar la sede mataría los stickers.
    expect(slugDeSede(DALIA)).toBe('dalia');
  });

  test('sin slug guardado cae al nombre', () => {
    // Las sedes que ya están en producción no tienen el campo: sus links tienen
    // que funcionar desde el día uno sin ir a completar nada.
    expect(slugDeSede(MORICHAL)).toBe('sede-morichal');
  });

  test('el respaldo normaliza acentos', () => {
    // Un "ñ" en la URL se escapa a %C3%B1, que en un QR impreso no se nota hasta
    // que alguien lo escanea.
    expect(slugDeSede(ACENTOS)).toBe('sede-penalosa');
  });

  test('un slug guardado en blanco se trata como ausente', () => {
    expect(slugDeSede({ nombre: 'Sede Dalia', slug: '   ' })).toBe('sede-dalia');
  });

  test('sin sede devuelve string vacío, no explota', () => {
    expect(slugDeSede(null)).toBe('');
    expect(slugDeSede(undefined)).toBe('');
  });
});

describe('sedePorSlug — resolver la URL', () => {
  test('encuentra por el slug guardado', () => {
    expect(sedePorSlug(SEDES, 'dalia')).toBe(DALIA);
  });

  test('encuentra por el nombre de las que no tienen slug', () => {
    // Si solo comparara el campo, los links dejarían de funcionar justo para las
    // sedes viejas, que son las que ya están en producción.
    expect(sedePorSlug(SEDES, 'sede-morichal')).toBe(MORICHAL);
  });

  test('no distingue mayúsculas', () => {
    // Alguien que escribe la URL a mano o la dicta no va a respetar el caso.
    expect(sedePorSlug(SEDES, 'DALIA')).toBe(DALIA);
    expect(sedePorSlug(SEDES, ' Dalia ')).toBe(DALIA);
  });

  test('un slug que no existe devuelve null', () => {
    // Quien llama decide qué hacer, y en /menu eso es mostrar el selector. Un QR
    // roto molesta; una pantalla en blanco hace creer que el local no existe.
    expect(sedePorSlug(SEDES, 'inventado')).toBe(null);
    expect(sedePorSlug([], 'dalia')).toBe(null);
  });

  test('sin slug devuelve null', () => {
    expect(sedePorSlug(SEDES, '')).toBe(null);
    expect(sedePorSlug(SEDES, null)).toBe(null);
  });

  test('el nombre NO alcanza cuando la sede tiene slug propio', () => {
    // Dalia guardó 'dalia': su URL vieja por nombre ya no responde, y eso es
    // correcto — el admin cambió la dirección a propósito.
    expect(sedePorSlug(SEDES, 'sede-dalia')).toBe(null);
  });
});

describe('errorDeSlug — lo que se puede escribir a mano', () => {
  test('acepta minúsculas, números y guiones', () => {
    expect(errorDeSlug('sede-dalia')).toBe(null);
    expect(errorDeSlug('local2')).toBe(null);
  });

  test('rechaza vacío', () => {
    expect(errorDeSlug('')).toMatch(/no puede estar vacía/);
    expect(errorDeSlug('   ')).toMatch(/no puede estar vacía/);
  });

  test('rechaza espacios, mayúsculas y tildes', () => {
    // Todo eso se escapa en la URL y queda ilegible justo donde más importa que
    // se lea: un link compartido o un QR impreso.
    expect(errorDeSlug('sede dalia')).toMatch(/minúsculas/);
    expect(errorDeSlug('Sede-Dalia')).toMatch(/minúsculas/);
    expect(errorDeSlug('peñalosa')).toMatch(/minúsculas/);
    expect(errorDeSlug('sede/dalia')).toMatch(/minúsculas/);
  });

  test('rechaza guiones en los extremos', () => {
    expect(errorDeSlug('-dalia')).toMatch(/guión/);
    expect(errorDeSlug('dalia-')).toMatch(/guión/);
  });
});
