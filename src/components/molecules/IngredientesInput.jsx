import { useState } from 'react';
import './IngredientesInput.css';

// Normaliza lo que escribe el usuario: sin saltos de linea, sin espacios
// dobles y sin espacios en los bordes. Un ingrediente puede tener mas de una
// palabra ("pollo crujiente"), lo que no puede es traer basura de formato.
const normalizar = (texto) => texto.replace(/\s+/g, ' ').trim();

export const IngredientesInput = ({ ingredientes = [], onChange }) => {
  const [draft, setDraft] = useState('');

  const agregar = (texto) => {
    // Pegar varias lineas o una lista con comas agrega uno por uno
    const nuevos = texto
      .split(/[\n,]/)
      .map(normalizar)
      .filter(Boolean);

    if (nuevos.length === 0) return;

    const yaEstan = new Set(ingredientes.map((i) => i.toLowerCase()));
    const sinRepetidos = [];

    nuevos.forEach((ingrediente) => {
      const clave = ingrediente.toLowerCase();
      if (yaEstan.has(clave)) return;
      yaEstan.add(clave);
      sinRepetidos.push(ingrediente);
    });

    if (sinRepetidos.length > 0) {
      onChange([...ingredientes, ...sinRepetidos]);
    }
    setDraft('');
  };

  const quitar = (indice) => {
    onChange(ingredientes.filter((_, i) => i !== indice));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      // Enter no debe enviar el formulario del modal
      e.preventDefault();
      agregar(draft);
      return;
    }

    // Backspace con el input vacio borra el ultimo chip
    if (e.key === 'Backspace' && draft === '' && ingredientes.length > 0) {
      quitar(ingredientes.length - 1);
    }
  };

  const handlePaste = (e) => {
    const pegado = e.clipboardData.getData('text');
    if (!/[\n,]/.test(pegado)) return;
    e.preventDefault();
    agregar(pegado);
  };

  return (
    <div className="ingredientes-field">
      {ingredientes.length > 0 && (
        <ul className="ingredientes-chips">
          {ingredientes.map((ingrediente, indice) => (
            <li key={`${ingrediente}-${indice}`} className="ingredientes-chip">
              <span className="ingredientes-chip__text">{ingrediente}</span>
              <button
                type="button"
                className="ingredientes-chip__remove"
                onClick={() => quitar(indice)}
                aria-label={`Quitar ${ingrediente}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="ingredientes-entry">
        <input
          id="ingredientes"
          type="text"
          className="ingredientes-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => agregar(draft)}
          placeholder="Ej: Queso"
          aria-describedby="ingredientes-hint"
        />
        <button
          type="button"
          className="ingredientes-add"
          onClick={() => agregar(draft)}
          disabled={normalizar(draft) === ''}
        >
          Agregar
        </button>
      </div>

      <p id="ingredientes-hint" className="ingredientes-hint">
        Escribí uno y presioná Enter. {ingredientes.length} agregado
        {ingredientes.length === 1 ? '' : 's'}.
      </p>
    </div>
  );
};
