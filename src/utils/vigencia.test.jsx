import { describe, expect, test } from 'vitest';
import { fechaLocalHoy, estaVigente, estadoVigencia } from './vigencia';

const HOY = '2026-09-18';

const promo = (campos = {}) => ({ activa: true, ...campos });

describe('fechaLocalHoy', () => {
  test('usa la fecha LOCAL, no la UTC', () => {
    // 18 de septiembre, 21:00 hora de Colombia. En UTC ya son las 02:00 del
    // 19: si esto usara toISOString() devolveria "2026-09-19" y una promo que
    // vence hoy se apagaria sola en plena hora pico.
    const nocheEnColombia = new Date(2026, 8, 18, 21, 0, 0);

    expect(fechaLocalHoy(nocheEnColombia)).toBe('2026-09-18');
  });

  test('rellena mes y dia con cero', () => {
    expect(fechaLocalHoy(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('estaVigente', () => {
  test('sin fechas corre siempre: la vigencia la decide solo el switch', () => {
    expect(estaVigente(promo(), HOY)).toBe(true);
  });

  test('todavia no arranco', () => {
    expect(estaVigente(promo({ vigenteDesde: '2026-09-20' }), HOY)).toBe(false);
  });

  test('ya vencio', () => {
    expect(estaVigente(promo({ vigenteHasta: '2026-09-17' }), HOY)).toBe(false);
  });

  test('los extremos son inclusive', () => {
    // Una promo que arranca hoy o vence hoy se muestra TODO el dia de hoy.
    expect(estaVigente(promo({ vigenteDesde: HOY }), HOY)).toBe(true);
    expect(estaVigente(promo({ vigenteHasta: HOY }), HOY)).toBe(true);
    expect(estaVigente(promo({ vigenteDesde: HOY, vigenteHasta: HOY }), HOY)).toBe(true);
  });

  test('dentro de una ventana cerrada', () => {
    const ventana = { vigenteDesde: '2026-09-15', vigenteHasta: '2026-09-30' };

    expect(estaVigente(promo(ventana), HOY)).toBe(true);
    expect(estaVigente(promo(ventana), '2026-09-14')).toBe(false);
    expect(estaVigente(promo(ventana), '2026-10-01')).toBe(false);
  });

  test('compara bien cruzando mes y año', () => {
    const ventana = { vigenteDesde: '2026-12-28', vigenteHasta: '2027-01-03' };

    expect(estaVigente(promo(ventana), '2026-12-31')).toBe(true);
    expect(estaVigente(promo(ventana), '2027-01-03')).toBe(true);
    expect(estaVigente(promo(ventana), '2027-01-04')).toBe(false);
  });
});

describe('estadoVigencia', () => {
  test('apagada gana sobre cualquier fecha', () => {
    const p = promo({ activa: false, vigenteDesde: HOY, vigenteHasta: HOY });

    expect(estadoVigencia(p, HOY)).toBe('apagada');
  });

  test('distingue programada, vencida y vigente', () => {
    expect(estadoVigencia(promo({ vigenteDesde: '2026-09-20' }), HOY)).toBe('programada');
    expect(estadoVigencia(promo({ vigenteHasta: '2026-09-17' }), HOY)).toBe('vencida');
    expect(estadoVigencia(promo(), HOY)).toBe('vigente');
  });
});
