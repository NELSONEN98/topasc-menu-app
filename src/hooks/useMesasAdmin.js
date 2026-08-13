import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useNotificacion } from '../context/NotificacionContext';
import { mensajeDeError } from '../utils/mensajeDeError';

const SIN_DATOS = [];

/**
 * Pestaña de Mesas. Cada mesa tiene que saber en que sede esta: de ahi salen
 * el WhatsApp al que llega su pedido y el menu que ve quien escanea su QR.
 */
export const useMesasAdmin = () => {
  const { notificar, confirmar } = useNotificacion();

  const mesas = useQuery(api.mesas.listar) ?? SIN_DATOS;
  // listarTodas y no listar: una mesa puede estar en una sede desactivada, y
  // el admin tiene que poder verlo y cambiarlo. Mismo criterio que en el modal
  // de productos.
  const sedes = useQuery(api.sedes.listarTodas) ?? SIN_DATOS;
  const crearMesa = useMutation(api.mesas.crear);
  const actualizarMesa = useMutation(api.mesas.actualizar);
  const borrarMesa = useMutation(api.mesas.borrar);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);

  const sedeMap = useMemo(
    () =>
      sedes.reduce((acc, sede) => {
        acc[sede._id] = sede.nombre;
        return acc;
      }, {}),
    [sedes]
  );

  // Orden numerico y no alfabetico: con `numero` como string, la mesa 10 se
  // ordenaria antes que la 2. Es el mismo criterio que usa `npm run qr`.
  const ordenadas = useMemo(
    () => [...mesas].sort((a, b) => Number(a.numero) - Number(b.numero)),
    [mesas]
  );

  const sinSede = useMemo(
    () => mesas.filter((mesa) => !mesa.sedeId).length,
    [mesas]
  );

  const abrirNuevo = () => {
    setEditando(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (mesa) => {
    setEditando(mesa);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
  };

  const guardar = async (formData) => {
    if (!formData.numero.trim()) {
      notificar.info('El número de la mesa es obligatorio');
      return;
    }
    // Sin sede, el pedido de esta mesa cae al numero de respaldo y al menu sin
    // filtrar: exactamente el problema que esta pantalla existe para resolver.
    if (!formData.sedeId) {
      notificar.info('Elegí en qué sede está la mesa');
      return;
    }

    const editandoAhora = !!editando;

    try {
      if (editandoAhora) {
        await actualizarMesa({
          id: editando._id,
          campos: {
            numero: formData.numero,
            sedeId: formData.sedeId,
            activo: formData.activo,
          },
        });
      } else {
        // `codigo` no se manda: lo genera el servidor. Es el token del QR y
        // tiene que ser impredecible.
        await crearMesa({
          numero: formData.numero,
          sedeId: formData.sedeId,
        });
      }

      cerrarModal();
      notificar.exito(editandoAhora ? 'Mesa actualizada' : 'Mesa creada');
    } catch (error) {
      console.error('Error al guardar mesa:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  const eliminar = async (mesa) => {
    const confirmado = await confirmar({
      titulo: `¿Eliminar la mesa ${mesa.numero}?`,
      mensaje:
        `El QR que está pegado en esa mesa deja de funcionar: quien lo escanee ` +
        `va a caer al flujo normal sin entender por qué.\n\n` +
        `Si solo querés sacarla de circulación, desactivala: el sticker sigue ` +
        `sirviendo cuando la vuelvas a habilitar.\n\n` +
        `Los pedidos que ya se hicieron en esta mesa conservan su número en el ` +
        `historial.`,
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!confirmado) return;

    try {
      await borrarMesa({ id: mesa._id });
      notificar.exito('Mesa eliminada');
    } catch (error) {
      console.error('Error al eliminar mesa:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  const alternarActivo = async (mesa) => {
    try {
      await actualizarMesa({
        id: mesa._id,
        campos: { activo: !mesa.activo },
      });
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  return {
    mesas: ordenadas,
    sedes,
    sedeMap,
    resumen: {
      total: mesas.length,
      activas: mesas.filter((m) => m.activo).length,
      sinSede,
    },
    modal: { abierto: modalAbierto, editando, abrirNuevo, abrirEdicion, cerrar: cerrarModal },
    acciones: { guardar, eliminar, alternarActivo },
  };
};
