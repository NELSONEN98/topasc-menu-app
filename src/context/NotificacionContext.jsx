import { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { Toaster } from '../components/organisms/Toaster';
import { ConfirmDialog } from '../components/organisms/ConfirmDialog';

const NotificacionContext = createContext(null);

const DURACION_POR_DEFECTO = 3500;
const DURACION_ERROR = 5000;

let contadorId = 0;

export const NotificacionProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmacion, setConfirmacion] = useState(null);

  // Guardamos el `resolve` de la promesa para responderla cuando el usuario
  // elige. Va en un ref y no en estado: cambiarlo no debe re-renderizar.
  const resolverRef = useRef(null);

  const cerrarToast = useCallback((id) => {
    setToasts((actuales) => actuales.filter((t) => t.id !== id));
  }, []);

  const agregarToast = useCallback(
    (tipo, mensaje, duracion) => {
      const id = ++contadorId;
      setToasts((actuales) => [...actuales, { id, tipo, mensaje }]);

      if (duracion > 0) {
        setTimeout(() => cerrarToast(id), duracion);
      }
      return id;
    },
    [cerrarToast]
  );

  // Objeto memoizado: si cambiara de referencia en cada render, romperia
  // cualquier useEffect que lo tenga como dependencia.
  const notificar = useMemo(
    () => ({
      exito: (mensaje, duracion = DURACION_POR_DEFECTO) =>
        agregarToast('exito', mensaje, duracion),
      error: (mensaje, duracion = DURACION_ERROR) =>
        agregarToast('error', mensaje, duracion),
      info: (mensaje, duracion = DURACION_POR_DEFECTO) =>
        agregarToast('info', mensaje, duracion),
    }),
    [agregarToast]
  );

  /**
   * Reemplazo de window.confirm. Devuelve una promesa que resuelve en
   * true/false, asi el codigo que llama se lee igual de lineal que antes:
   *
   *   if (!(await confirmar({ ... }))) return;
   */
  const confirmar = useCallback(
    (opciones) =>
      new Promise((resolve) => {
        resolverRef.current = resolve;
        setConfirmacion(opciones);
      }),
    []
  );

  const responder = useCallback((valor) => {
    setConfirmacion(null);
    const resolver = resolverRef.current;
    resolverRef.current = null;
    resolver?.(valor);
  }, []);

  const valor = useMemo(
    () => ({ notificar, confirmar }),
    [notificar, confirmar]
  );

  return (
    <NotificacionContext.Provider value={valor}>
      {children}
      <Toaster toasts={toasts} onCerrar={cerrarToast} />
      {confirmacion && (
        <ConfirmDialog
          {...confirmacion}
          onConfirmar={() => responder(true)}
          onCancelar={() => responder(false)}
        />
      )}
    </NotificacionContext.Provider>
  );
};

export const useNotificacion = () => {
  const contexto = useContext(NotificacionContext);

  if (!contexto) {
    throw new Error('useNotificacion debe usarse dentro de <NotificacionProvider>');
  }
  return contexto;
};
