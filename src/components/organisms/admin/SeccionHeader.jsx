// Encabezado comun a todas las secciones del admin: titulo, resumen y una
// accion opcional. Estaba repetido con el mismo marcado en cada pestaña.
export const SeccionHeader = ({ titulo, resumen, textoAccion, onAccion }) => (
  <div className="admin-section-header">
    <div>
      <h1 className="admin-section-title">{titulo}</h1>
      <p className="admin-section-meta">{resumen}</p>
    </div>

    {textoAccion && (
      <button className="btn-add-item" onClick={onAccion}>
        {textoAccion}
      </button>
    )}
  </div>
);
