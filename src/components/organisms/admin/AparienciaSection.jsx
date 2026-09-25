import { useRef } from 'react';
import { SeccionHeader } from './SeccionHeader';
import { useAparienciaAdmin } from '../../../hooks/useAparienciaAdmin';

export const AparienciaSection = () => {
  const {
    imagenUrl,
    cargando,
    subiendo,
    nombre,
    setNombre,
    guardandoNombre,
    nombreSinGuardar,
    acciones,
  } = useAparienciaAdmin();
  const inputRef = useRef(null);

  const alElegirArchivo = async (e) => {
    const file = e.target.files?.[0];
    // Se limpia el input SIEMPRE: sin esto, elegir el mismo archivo dos
    // veces seguidas no dispara change y parece que el boton no anda.
    e.target.value = '';
    await acciones.subirImagen(file);
  };

  return (
    <div>
      <SeccionHeader
        titulo="Apariencia"
        resumen="Nombre e imagen de portada que ven los clientes en el menú"
      />

      <p className="admin-ayuda">
        Se muestra arriba de todo en el menú, en la selección de sede y en la elección
        de tipo de pedido. Conviene una imagen apaisada: se recorta a lo ancho de la
        pantalla y solo se ve una franja del alto. La achicamos a 1600px antes de
        subirla, así que no hace falta que la prepares.
      </p>

      <div className="apariencia-panel">
        <div className="apariencia-nombre">
          <label htmlFor="apariencia-nombre-input">Nombre sobre la portada</label>
          <div className="apariencia-nombre__fila">
            <input
              id="apariencia-nombre-input"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Topasc"
              maxLength={24}
              disabled={cargando || guardandoNombre}
            />
            <button
              type="button"
              className="btn-add-item"
              onClick={acciones.guardarNombre}
              disabled={cargando || guardandoNombre || !nombreSinGuardar}
            >
              {guardandoNombre ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
          <small className="form-ayuda">
            Es el texto grande que va sobre la foto. Hasta 24 caracteres: entra en una
            sola línea y más largo que eso se recorta sin aviso.
          </small>
        </div>

        <div className="apariencia-preview">
          {cargando ? (
            <div className="apariencia-preview__vacio">Cargando…</div>
          ) : imagenUrl ? (
            <img src={imagenUrl} alt="Portada actual del menú" />
          ) : (
            <div className="apariencia-preview__vacio">
              Todavía no hay una imagen cargada. El menú muestra la portada por defecto.
            </div>
          )}

          {/* El degradado y el titulo replican al Hero real: sirve de poco
              ver la foto suelta si en el menu le cae texto encima. */}
          {imagenUrl && (
            <>
              <div className="apariencia-preview__gradiente" />
              {/* El nombre que se esta escribiendo, no el guardado: asi se ve
                  como va a quedar sobre la foto antes de confirmar. */}
              <p className="apariencia-preview__titulo">{nombre}</p>
            </>
          )}
        </div>

        <div className="apariencia-acciones">
          <input
            ref={inputRef}
            id="apariencia-archivo"
            type="file"
            accept="image/*"
            onChange={alElegirArchivo}
            disabled={subiendo}
            className="apariencia-input-archivo"
          />
          <button
            type="button"
            className="btn-add-item"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
          >
            {subiendo ? 'Subiendo…' : imagenUrl ? 'Cambiar imagen' : 'Subir imagen'}
          </button>

          {imagenUrl && (
            <button
              type="button"
              className="btn-delete"
              onClick={acciones.quitarImagen}
              disabled={subiendo}
            >
              <span className="btn-texto">Quitar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
