import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useNotificacion } from '../context/NotificacionContext';
import { mensajeDeError } from '../utils/mensajeDeError';
import { aNumero } from '../utils/numeroDeInput';
import { ADMIN_ITEMS_PER_PAGE } from '../config/settings';

const SIN_DATOS = [];

export const usePromocionesAdmin = () => {
  const { notificar, confirmar } = useNotificacion();

  const promociones = useQuery(api.promociones.listarTodas) ?? SIN_DATOS;
  // listarTodas y no listar, por lo mismo que en useProductosAdmin: si una
  // sede se desactiva, con `listar` desapareceria del formulario pero seguiria
  // guardada en el `sedeIds` de la promo, invisible e imposible de sacar.
  const sedes = useQuery(api.sedes.listarTodas) ?? SIN_DATOS;
  const crearPromocion = useMutation(api.promociones.crear);
  const actualizarPromocion = useMutation(api.promociones.actualizar);
  const borrarPromocion = useMutation(api.promociones.borrar);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [pagina, setPagina] = useState(1);

  const totalPaginas = Math.ceil(promociones.length / ADMIN_ITEMS_PER_PAGE);
  const desde = (pagina - 1) * ADMIN_ITEMS_PER_PAGE;
  const paginadas = promociones.slice(desde, desde + ADMIN_ITEMS_PER_PAGE);

  const abrirNuevo = () => {
    setEditando(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (promo) => {
    setEditando(promo);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
  };

  const guardar = async (formData) => {
    if (!formData.titulo.trim()) {
      notificar.info('El título de la promo es obligatorio');
      return;
    }
    // Mismo corte que en useProductosAdmin: el server interpreta un array
    // vacio como "todas las sedes" (por las promos previas al campo), asi que
    // guardar sin marcar ninguna lograria lo contrario de lo que el admin cree.
    if (!formData.sedeIds?.length) {
      notificar.info('Elegí al menos una sede');
      return;
    }
    // Se corta acá además del servidor para no hacer viajar un formulario que
    // ya sabemos que va a rebotar. Compara strings porque "YYYY-MM-DD" ordena
    // igual alfabética que cronológicamente.
    if (
      formData.vigenteDesde &&
      formData.vigenteHasta &&
      formData.vigenteDesde > formData.vigenteHasta
    ) {
      notificar.info('La fecha de inicio no puede ser posterior a la de fin');
      return;
    }

    const editandoAhora = !!editando;

    try {
      if (editandoAhora) {
        await actualizarPromocion({
          id: editando._id,
          campos: {
            titulo: formData.titulo,
            descripcion: formData.descripcion || undefined,
            precio: formData.precio === '' ? undefined : aNumero(formData.precio),
            imagenUrl: formData.imagenUrl || undefined,
            activa: formData.activa,
            sedeIds: formData.sedeIds,
            // Van como '' y no como undefined a proposito: es asi como el
            // server distingue "sacale la fecha" de "no la toques".
            vigenteDesde: formData.vigenteDesde,
            vigenteHasta: formData.vigenteHasta,
          },
        });
      } else {
        await crearPromocion({
          titulo: formData.titulo,
          descripcion: formData.descripcion || undefined,
          precio: formData.precio === '' ? undefined : aNumero(formData.precio),
          imagenUrl: formData.imagenUrl || undefined,
          activa: formData.activa,
          sedeIds: formData.sedeIds,
          vigenteDesde: formData.vigenteDesde || undefined,
          vigenteHasta: formData.vigenteHasta || undefined,
        });
      }

      cerrarModal();
      notificar.exito(editandoAhora ? 'Promo actualizada' : 'Promo creada');
    } catch (error) {
      console.error('Error al guardar la promo:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  const eliminar = async (promo) => {
    const confirmado = await confirmar({
      titulo: `¿Eliminar la promo "${promo.titulo}"?`,
      mensaje: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!confirmado) return;

    try {
      await borrarPromocion({ id: promo._id });
      notificar.exito('Promo eliminada');
    } catch (error) {
      console.error('Error al eliminar la promo:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  const alternarActiva = async (promo) => {
    try {
      await actualizarPromocion({
        id: promo._id,
        campos: { activa: !promo.activa },
      });
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  return {
    sedes,
    paginadas,
    pagina,
    setPagina,
    totalPaginas,
    resumen: {
      total: promociones.length,
      activas: promociones.filter((p) => p.activa).length,
    },
    modal: { abierto: modalAbierto, editando, abrirNuevo, abrirEdicion, cerrar: cerrarModal },
    acciones: { guardar, eliminar, alternarActiva },
  };
};
