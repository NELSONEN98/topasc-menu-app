import { normalizarTelefonoCliente, formatearTelefono } from '../../utils/telefonoCliente';

/*
 * Nombre y teléfono del cliente: los dos obligatorios.
 *
 * Vive en un componente compartido y no copiado en cada modal porque lo piden
 * los dos flujos (domicilio y recoger) con las MISMAS reglas y los mismos
 * textos. Dos copias son dos validaciones que se desincronizan: se ajusta el
 * largo mínimo en una, la otra sigue aceptando basura, y el local se queda sin
 * poder llamar a nadie.
 *
 * El componente no valida al escribir: solo muestra la vista previa del número.
 * Quien corta el guardado es `validarDatosCliente`, que el modal llama al
 * confirmar — misma división que ya usa el resto de los modales (junta datos,
 * valida al confirmar).
 */

/**
 * `{ nombre, telefono, error }`. `error` null significa que está listo.
 *
 * Devuelve los valores ya limpios para que el modal no tenga que volver a
 * hacerles trim ni sacarles los espacios al teléfono.
 */
export const validarDatosCliente = ({ nombre, telefono }) => {
  if (!nombre.trim()) {
    return { nombre: null, telefono: null, error: 'Escribí tu nombre' };
  }

  const { telefono: limpio, error } = normalizarTelefonoCliente(telefono);
  if (error) return { nombre: null, telefono: null, error };

  return { nombre: nombre.trim(), telefono: limpio, error: null };
};

export const DatosCliente = ({ nombre, telefono, onNombreChange, onTelefonoChange, autoFocus = false }) => {
  // Vista previa de cómo queda el número: el mismo criterio que usa el modal de
  // sedes. Es lo que le confirma al cliente que escribió los dígitos que quería
  // antes de mandar el pedido, en vez de enterarse cuando el local no lo puede
  // llamar.
  const { telefono: digitos } = normalizarTelefonoCliente(telefono);
  const vistaPrevia = digitos ? formatearTelefono(digitos) : null;

  return (
    <>
      <input
        type="text"
        className="address-modal-input"
        placeholder="Tu nombre"
        value={nombre}
        onChange={(e) => onNombreChange(e.target.value)}
        autoComplete="name"
        autoFocus={autoFocus}
      />

      <input
        // type="tel" + inputMode: en el celular abre el teclado numérico, que es
        // desde donde se hacen casi todos los pedidos.
        type="tel"
        inputMode="tel"
        className="address-modal-input"
        placeholder="Tu teléfono (300 123 4567)"
        value={telefono}
        onChange={(e) => onTelefonoChange(e.target.value)}
        autoComplete="tel"
      />

      {vistaPrevia && vistaPrevia !== telefono.trim() && (
        <small className="datos-cliente__preview">Te vamos a llamar al {vistaPrevia}</small>
      )}
    </>
  );
};
