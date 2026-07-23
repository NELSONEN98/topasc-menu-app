import { useState } from 'react';
import { AdminNavbar } from '../components/organisms/admin/AdminNavbar';
import { ProductosSection } from '../components/organisms/admin/ProductosSection';
import { CategoriasSection } from '../components/organisms/admin/CategoriasSection';
import { SalsasSection } from '../components/organisms/admin/SalsasSection';
import { HorarioSection } from '../components/organisms/admin/HorarioSection';
import { SeccionHeader } from '../components/organisms/admin/SeccionHeader';
import { AdminPedidos } from '../components/organisms/AdminPedidos';
import { PedidosCompletados } from '../components/organisms/PedidosCompletados';
import '../styles/admin-styles.css';

// Dos vistas sobre lo mismo: las tarjetas son la pantalla de trabajo del local
// y la tabla es el historial. El boton del header alterna entre las dos.
const PedidosSection = () => {
  const [verCompletados, setVerCompletados] = useState(false);

  return (
    <div>
      <SeccionHeader
        titulo="Pedidos"
        resumen={
          verCompletados
            ? 'Historial de pedidos completados'
            : 'Pedidos activos en tiempo real'
        }
        textoAccion={verCompletados ? '← Ver activos' : '📋 Ver completados'}
        onAccion={() => setVerCompletados((valor) => !valor)}
      />

      {verCompletados ? <PedidosCompletados /> : <AdminPedidos />}
    </div>
  );
};

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
