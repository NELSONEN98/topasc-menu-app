import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useNotificacion } from '../context/NotificacionContext';
import { mensajeDeError } from '../utils/mensajeDeError';
import { aNumero } from '../utils/numeroDeInput';
import { ADMIN_ITEMS_PER_PAGE } from '../config/settings';

const SIN_DATOS = [];

export const useSalsasAdmin = () => {
  const { notificar, confirmar } = useNotificacion();

  const salsas = useQuery(api.salsas.listar) ?? SIN_DATOS;
  const crearSalsa = useMutation(api.salsas.crear);
  const actualizarSalsa = useMutation(api.salsas.actualizar);
  const borrarSalsa = useMutation(api.salsas.borrar);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [pagina, setPagina] = useState(1);

  const totalPaginas = Math.ceil(salsas.length / ADMIN_ITEMS_PER_PAGE);
  const desde = (pagina - 1) * ADMIN_ITEMS_PER_PAGE;
  const paginadas = salsas.slice(desde, desde + ADMIN_ITEMS_PER_PAGE);

  const abrirNuevo = () => {
    setEditando(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (salsa) => {
    setEditando(salsa);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
  };

  const guardar = async (formData) => {
    if (!formData.nombre.trim()) {
      notificar.info('El nombre de la salsa es obligatorio');
      return;
    }

    // Las salsas base son gratis siempre; solo las especiales llevan precio
    const precio = formData.tipo === 'base' ? 0 : aNumero(formData.precio);

    if (formData.tipo === 'especial' && precio <= 0) {
      notificar.info('Las salsas especiales deben tener un precio mayor a 0');
      return;
    }

    const editandoAhora = !!editando;

    try {
      if (editandoAhora) {
        await actualizarSalsa({
          id: editando._id,
          campos: {
            nombre: formData.nombre,
            tipo: formData.tipo,
            precio,
            imagenUrl: formData.imagenUrl || undefined,
            disponible: formData.disponible,
          },
        });
      } else {
        await crearSalsa({
          nombre: formData.nombre,
          tipo: formData.tipo,
          precio,
          imagenUrl: formData.imagenUrl || undefined,
        });
      }

      cerrarModal();
      notificar.exito(editandoAhora ? 'Salsa actualizada' : 'Salsa creada');
    } catch (error) {
      console.error('Error al guardar salsa:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  const eliminar = async (salsa) => {
    const confirmado = await confirmar({
      titulo: `¿Eliminar la salsa "${salsa.nombre}"?`,
      mensaje: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!confirmado) return;

    try {
      await borrarSalsa({ id: salsa._id });
      notificar.exito('Salsa eliminada');
    } catch (error) {
      console.error('Error al eliminar salsa:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  const alternarDisponible = async (salsa) => {
    try {
      await actualizarSalsa({
        id: salsa._id,
        campos: { disponible: !salsa.disponible },
      });
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  return {
    paginadas,
    pagina,
    setPagina,
    totalPaginas,
    resumen: {
      total: salsas.length,
      activas: salsas.filter((s) => s.disponible).length,
    },
    modal: { abierto: modalAbierto, editando, abrirNuevo, abrirEdicion, cerrar: cerrarModal },
    acciones: { guardar, eliminar, alternarDisponible },
  };
};
