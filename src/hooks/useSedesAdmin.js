import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useNotificacion } from '../context/NotificacionContext';
import { mensajeDeError } from '../utils/mensajeDeError';

const SIN_DATOS = [];

/**
 * Pestaña de Sedes. Consulta `listarTodas` (no `listar`) porque el admin
 * necesita ver tambien las inactivas para poder reactivarlas.
 */
export const useSedesAdmin = () => {
  const { notificar, confirmar } = useNotificacion();

  const sedes = useQuery(api.sedes.listarTodas) ?? SIN_DATOS;
  // Convex deduplica suscripciones identicas, asi que pedir los items aca no
  // agrega trafico y mantiene el hook autosuficiente.
  // listarTodos: para contar productos por sede hay que incluir los apagados,
  // o el conteo miente y una sede parece libre para borrar sin estarlo.
  const items = useQuery(api.items.listarTodos) ?? SIN_DATOS;
  const crearSede = useMutation(api.sedes.crear);
  const actualizarSede = useMutation(api.sedes.actualizar);
  const borrarSede = useMutation(api.sedes.borrar);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);

  // Solo cuenta los productos que tienen la sede marcada EXPLICITAMENTE. Los
  // que no tienen `sedeIds` se ven en todas las sedes por el fallback, pero no
  // apuntan a ninguna: borrar una sede no los deja huerfanos.
  const productosPorSede = useMemo(
    () =>
      items.reduce((acc, item) => {
        for (const sedeId of item.sedeIds ?? []) {
          acc[sedeId] = (acc[sedeId] || 0) + 1;
        }
        return acc;
      }, {}),
    [items]
  );

  const abrirNuevo = () => {
    setEditando(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (sede) => {
    setEditando(sede);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
  };

  const guardar = async (formData) => {
    if (!formData.nombre.trim()) {
      notificar.info('El nombre de la sede es obligatorio');
      return;
    }
    // Espejo de la validacion de la mutation. Aca es UX (avisar antes de
    // mandar); la que protege los datos es la del servidor.
    if (!formData.whatsapp.replace(/\D/g, '')) {
      notificar.info('El WhatsApp de la sede es obligatorio');
      return;
    }

    const editandoAhora = !!editando;

    try {
      if (editandoAhora) {
        await actualizarSede({
          id: editando._id,
          campos: {
            nombre: formData.nombre,
            direccion: formData.direccion,
            whatsapp: formData.whatsapp,
            activo: formData.activo,
          },
        });
      } else {
        await crearSede({
          nombre: formData.nombre,
          direccion: formData.direccion,
          whatsapp: formData.whatsapp,
        });
      }

      cerrarModal();
      notificar.exito(editandoAhora ? 'Sede actualizada' : 'Sede creada');
    } catch (error) {
      console.error('Error al guardar sede:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  const eliminar = async (sede) => {
    const productos = productosPorSede[sede._id] || 0;

    // Espejo de la guarda que vive en la mutation. Esta es UX (explicar por
    // que no se puede); la que protege los datos es la del servidor.
    if (productos > 0) {
      await confirmar({
        titulo: 'No se puede eliminar',
        mensaje:
          `"${sede.nombre}" tiene ${productos} producto(s) marcados.\n\n` +
          `Si la borrás, un producto que solo se vendía acá desaparece de todos ` +
          `los menús sin aviso. Sacá la sede de esos productos primero, o ` +
          `desactivala para ocultarla sin perder nada.`,
        textoConfirmar: 'Entendido',
        soloAceptar: true,
      });
      return;
    }

    const confirmado = await confirmar({
      titulo: `¿Eliminar la sede "${sede.nombre}"?`,
      mensaje:
        'Los pedidos que ya se hicieron desde esta sede conservan su nombre en ' +
        'el historial. Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!confirmado) return;

    try {
      await borrarSede({ id: sede._id });
      notificar.exito('Sede eliminada');
    } catch (error) {
      console.error('Error al eliminar sede:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  const alternarActivo = async (sede) => {
    try {
      await actualizarSede({
        id: sede._id,
        campos: { activo: !sede.activo },
      });
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  return {
    sedes,
    productosPorSede,
    resumen: {
      total: sedes.length,
      activas: sedes.filter((s) => s.activo).length,
    },
    modal: { abierto: modalAbierto, editando, abrirNuevo, abrirEdicion, cerrar: cerrarModal },
    acciones: { guardar, eliminar, alternarActivo },
  };
};
