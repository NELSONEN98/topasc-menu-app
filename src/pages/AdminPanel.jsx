import { useState } from 'react';
import { AdminNavbar } from '../components/organisms/admin/AdminNavbar';
import { ProductosSection } from '../components/organisms/admin/ProductosSection';
import { CategoriasSection } from '../components/organisms/admin/CategoriasSection';
import { SalsasSection } from '../components/organisms/admin/SalsasSection';
import { HorarioSection } from '../components/organisms/admin/HorarioSection';
import { SeccionHeader } from '../components/organisms/admin/SeccionHeader';
import { AdminPedidos } from '../components/organisms/AdminPedidos';
import '../styles/admin-styles.css';

const PedidosSection = () => (
  <div>
    <SeccionHeader titulo="Pedidos" resumen="Pedidos activos en tiempo real" />
    <AdminPedidos />
  </div>
);

// Cada pestaña se resuelve por su id. Agregar una seccion nueva es sumar una
// entrada acá y otra en TABS — no hay que tocar el render.
const SECCIONES = {
  pedidos: PedidosSection,
  productos: ProductosSection,
  categorias: CategoriasSection,
  salsas: SalsasSection,
  horario: HorarioSection,
};

export const AdminPanel = ({ onLogout }) => {
  const [tabActivo, setTabActivo] = useState('productos');
  const [menuAbierto, setMenuAbierto] = useState(false);

  const Seccion = SECCIONES[tabActivo] ?? PedidosSection;

  const cambiarTab = (id) => {
    setTabActivo(id);
    setMenuAbierto(false);
  };

  return (
    <div className="admin-shell">
      <AdminNavbar
        tabActivo={tabActivo}
        onCambiarTab={cambiarTab}
        menuAbierto={menuAbierto}
        onToggleMenu={setMenuAbierto}
        onLogout={onLogout}
      />

      <div className="admin-main">
        <Seccion />
      </div>
    </div>
  );
};
