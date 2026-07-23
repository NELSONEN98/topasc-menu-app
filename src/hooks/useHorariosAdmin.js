import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useNotificacion } from '../context/NotificacionContext';
import { mensajeDeError } from '../utils/mensajeDeError';

const SIN_DATOS = [];

export const useHorariosAdmin = () => {
  const { notificar } = useNotificacion();

  // `listar` siempre devuelve los 7 dias, asi que no hace falta paginar
  // ni contemplar el caso de la tabla vacia.
  const horarios = useQuery(api.horarios.listar) ?? SIN_DATOS;
  const guardarDia = useMutation(api.horarios.guardarDia);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);

  const abrirEdicion = (horario) => {
    setEditando(horario);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
  };

  const guardar = async (formData) => {
    if (!editando) return;

    const { horaApertura, horaCierre, cerrado } = formData;

    if (!cerrado) {
      if (!horaApertura || !horaCierre) {
        notificar.info('Completá la hora de entrada y la de salida');
        return;
      }

      // Un cierre menor a la apertura (11:00 → 00:00) es valido: significa que
      // el local cierra despues de medianoche. Lo unico que no tiene sentido
      // es abrir y cerrar en el mismo minuto.
      if (horaApertura === horaCierre) {
        notificar.info('La hora de entrada y la de salida no pueden ser iguales');
        return;
      }
    }

    try {
      await guardarDia({
        diaSemana: editando.diaSemana,
        horaApertura,
        horaCierre,
        cerrado,
      });

      cerrarModal();
      notificar.exito('Horario actualizado');
    } catch (error) {
      console.error('Error al guardar horario:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  return {
    horarios,
    resumen: {
      abiertos: horarios.filter((h) => !h.cerrado).length,
      cerrados: horarios.filter((h) => h.cerrado).length,
    },
    modal: { abierto: modalAbierto, editando, abrirEdicion, cerrar: cerrarModal },
    acciones: { guardar },
  };
};
