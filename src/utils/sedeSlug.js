import { aSlug } from './qrMesa';

/*
 * El pedacito de URL de la carta de una sede: /menu/<slug>.
 *
 * Mismo esquema que el resto de los campos opcionales de este proyecto: manda el
 * campo guardado y el nombre queda SOLO como respaldo, para las sedes que todavia
 * no lo tienen. Asi los links funcionan desde el dia uno sin ir a completar nada.
 *
 * Por que el campo guardado tiene que ganar: esta URL se imprime en un QR y se
 * pega en la pared. Si saliera siempre del nombre, renombrar la sede mataria los
 * stickers ya repartidos.
 */

/** El slug efectivo de una sede: el guardado, o el nombre slugificado. */
export const slugDeSede = (sede) => {
  if (!sede) return '';

  return sede.slug?.trim() || aSlug(sede.nombre ?? '');
};

/**
 * Busca la sede de un slug de la URL.
 *
 * Compara contra el slug EFECTIVO de cada sede, no solo contra el campo: una sede
 * sin slug guardado tiene que seguir siendo alcanzable por su nombre, o el link
 * dejaria de funcionar justo para las sedes viejas.
 *
 * Devuelve null si no matchea ninguna — quien llama decide que hacer, y en /menu
 * eso es mostrar el selector en vez de una pantalla vacia.
 */
export const sedePorSlug = (sedes, slug) => {
  if (!slug) return null;

  const buscado = slug.trim().toLowerCase();

  return sedes.find((sede) => slugDeSede(sede) === buscado) ?? null;
};

/**
 * Valida un slug escrito a mano en el panel.
 *
 * Solo minusculas, numeros y guiones: es lo que `aSlug` produce, y lo que no se
 * rompe al viajar en una URL ni al dictarse por telefono. Un slug con espacios o
 * tildes se escapa a "%20" y "%C3%A1", que en un QR impreso no se nota hasta que
 * alguien lo escanea.
 *
 * Devuelve el mensaje de error, o null si esta bien.
 */
export const errorDeSlug = (slug) => {
  const valor = String(slug ?? '').trim();

  if (valor === '') return 'La dirección de la carta no puede estar vacía';
  if (!/^[a-z0-9-]+$/.test(valor)) {
    return 'Solo minúsculas, números y guiones (ej: sede-dalia)';
  }
  if (valor.startsWith('-') || valor.endsWith('-')) {
    return 'No puede empezar ni terminar con guión';
  }

  return null;
};
