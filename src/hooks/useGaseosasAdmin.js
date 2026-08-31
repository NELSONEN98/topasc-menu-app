import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useNotificacion } from '../context/NotificacionContext';
import { mensajeDeError } from '../utils/mensajeDeError';
import { aNumero } from '../utils/numeroDeInput';

const SIN_DATOS = [];

/**
 * Pestaña de Gaseosas: las combinaciones de sabor y tamaño con su precio.
 *
 * Consulta `listarTodas` (no `listarDisponibles`) porque el admin necesita
 * ver tambien las agotadas para poder volver a habilitarlas.
 */
export const useGaseosasAdmin = () => {
  const { notificar, confirmar } = useNotificacion();

  const presentaciones = useQuery(api.presentacionesGaseosa.listarTodas) ?? SIN_DATOS;
  const crearPresentacion = useMutation(api.presentacionesGaseosa.crear);
  const actualizarPresentacion = useMutation(api.presentacionesGaseosa.actualizar);
  const borrarPresentacion = useMutation(api.presentacionesGaseosa.borrar);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);

  // Se agrupan por sabor para que el admin vea la misma estructura que ve el
  // cliente: primero el sabor, adentro los tamaños con su precio.
  const porSabor = useMemo(() => {
    const mapa = new Map();
    for (const p of presentaciones) {
      if (!mapa.has(p.sabor)) mapa.set(p.sabor, []);
      mapa.get(p.sabor).push(p);
    }
    return [...mapa.entries()].map(([sabor, opciones]) => ({ sabor, opciones }));
  }, [presentaciones]);

  const abrirNuevo = () => {
    setEditando(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (presentacion) => {
    setEditando(presentacion);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
  };

  const guardar = async (formData) => {
    if (!formData.sabor.trim()) {
      notificar.info('El sabor es obligatorio');
      return;
    }
    if (!formData.tamano.trim()) {
      notificar.info('El tamaño es obligatorio');
      return;
    }

    const precio = aNumero(formData.precio, 0);
    if (precio <= 0) {
      notificar.info('Poné un precio mayor a cero');
      return;
    }

    const editandoAhora = !!editando;

    try {
      if (editandoAhora) {
        await actualizarPresentacion({
          id: editando._id,
          campos: {
            sabor: formData.sabor,
            tamano: formData.tamano,
            precio,
            disponible: formData.disponible,
          },
        });
      } else {
        await crearPresentacion({
          sabor: formData.sabor,
          tamano: formData.tamano,
          precio,
        });
      }

      cerrarModal();
      notificar.exito(editandoAhora ? 'Presentación actualizada' : 'Presentación creada');
    } catch (error) {
      console.error('Error al guardar la presentación:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  const eliminar = async (presentacion) => {
    const confirmado = await confirmar({
      titulo: `¿Eliminar "${presentacion.sabor} ${presentacion.tamano}"?`,
      mensaje:
        'Los pedidos que ya la incluyen no se tocan: guardan el sabor y el tamaño ' +
        'como texto. Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!confirmado) return;

    try {
      await borrarPresentacion({ id: presentacion._id });
      notificar.exito('Presentación eliminada');
    } catch (error) {
      console.error('Error al eliminar la presentación:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  const alternarDisponible = async (presentacion) => {
    try {
      await actualizarPresentacion({
        id: presentacion._id,
        campos: { disponible: !presentacion.disponible },
      });
    } catch (error) {
      console.error('Error al cambiar disponibilidad:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  return {
    presentaciones,
    porSabor,
    resumen: {
      total: presentaciones.length,
      sabores: porSabor.length,
      disponibles: presentaciones.filter((p) => p.disponible).length,
    },
    modal: { abierto: modalAbierto, editando, abrirNuevo, abrirEdicion, cerrar: cerrarModal },
    acciones: { guardar, eliminar, alternarDisponible },
  };
};
