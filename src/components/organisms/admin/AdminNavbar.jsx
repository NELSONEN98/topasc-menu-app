import { useEffect } from 'react';

export const TABS = [
  { id: 'pedidos', icono: '🧾', etiqueta: 'Pedidos' },
  { id: 'productos', icono: '🍽', etiqueta: 'Productos' },
  { id: 'categorias', icono: '🗂', etiqueta: 'Categorías' },
  { id: 'salsas', icono: '🧂', etiqueta: 'Salsas' },
  { id: 'horario', icono: '🕒', etiqueta: 'Horario' },
];

export const AdminNavbar = ({ tabActivo, onCambiarTab, menuAbierto, onToggleMenu, onLogout }) => {
  // El drawer se comporta como un dialogo: Escape lo cierra y el fondo no
  // scrollea mientras esta abierto.
  useEffect(() => {
    if (!menuAbierto) return;

    const alPresionar = (e) => {
      if (e.key === 'Escape') onToggleMenu(false);
    };
    document.addEventListener('keydown', alPresionar);

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.body.style.overflow = overflowPrevio;
    };
  }, [menuAbierto, onToggleMenu]);

  return (
    <>
      <nav className="admin-navbar">
        <button
          type="button"
          className={`admin-burger ${menuAbierto ? 'is-open' : ''}`}
          onClick={() => onToggleMenu(!menuAbierto)}
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuAbierto}
          aria-controls="admin-nav"
        >
          <span className="admin-burger__linea" />
          <span className="admin-burger__linea" />
          <span className="admin-burger__linea" />
        </button>

        <div className="admin-navbar-brand">
          <span className="admin-navbar-brand-gold">Topasc</span>
        </div>

        <div id="admin-nav" className={`admin-navbar-nav ${menuAbierto ? 'is-open' : ''}`}>
          {TABS.map(({ id, icono, etiqueta }) => (
            <button
              key={id}
              className={`admin-nav-item ${tabActivo === id ? 'active' : ''}`}
              onClick={() => onCambiarTab(id)}
              aria-current={tabActivo === id ? 'page' : undefined}
            >
              <span className="admin-nav-item__icono" aria-hidden="true">
                {icono}
              </span>
              {etiqueta}
            </button>
          ))}
        </div>

        <div className="admin-navbar-actions">
          <button className="admin-logout" onClick={onLogout}>
            Salir
          </button>
        </div>
      </nav>

      {menuAbierto && (
        <div
          className="admin-nav-overlay"
          onClick={() => onToggleMenu(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
};
