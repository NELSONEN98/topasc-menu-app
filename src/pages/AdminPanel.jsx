import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ProductModal } from '../components/organisms/ProductModal';
import '../styles/admin-styles.css';

export const AdminPanel = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('productos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const items = useQuery(api.items.listarMenu) || [];
  const categorias = useQuery(api.categorias.listar) || [];
  const crearItem = useMutation(api.items.crear);
  const actualizarItem = useMutation(api.items.actualizar);

  const activeProducts = items.filter(item => item.disponible).length;

  const categoriaMap = categorias.reduce((acc, cat) => {
    acc[cat._id] = cat.nombre;
    return acc;
  }, {});

  const handleAddProduct = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleEditProduct = (productId) => {
    const product = items.find(item => item._id === productId);
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleSaveProduct = async (formData) => {
    try {
      if (editingProduct) {
        await actualizarItem({
          id: editingProduct._id,
          campos: {
            nombre: formData.nombre,
            categoriaId: formData.categoriaId,
            precio: formData.precio,
            descripcion: formData.descripcion,
            disponible: formData.disponible,
          },
        });
      } else {
        await crearItem({
          categoriaId: formData.categoriaId,
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          precio: formData.precio,
          imagenUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop',
          disponible: formData.disponible,
          activo: true,
        });
      }
      setModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error al guardar producto:', error);
      alert('Error al guardar el producto');
    }
  };

  return (
    <div className="admin-shell">
      {/* Navbar */}
      <nav className="admin-navbar">
        <div className="admin-navbar-brand">
          <span className="admin-navbar-brand-white">Broaster </span>
          <span className="admin-navbar-brand-gold">topasc</span>
        </div>

        <div className="admin-navbar-nav">
          <button
            className={`admin-nav-item ${activeTab === 'productos' ? 'active' : ''}`}
            onClick={() => setActiveTab('productos')}
          >
            🍽 Productos
          </button>
          <button
            className={`admin-nav-item ${activeTab === 'salsas' ? 'active' : ''}`}
            onClick={() => setActiveTab('salsas')}
          >
            🧂 Salsas
          </button>
          <button
            className={`admin-nav-item ${activeTab === 'horario' ? 'active' : ''}`}
            onClick={() => setActiveTab('horario')}
          >
            🕒 Horario
          </button>
        </div>

        <div className="admin-navbar-actions">
          <button
            onClick={onLogout}
            style={{
              background: '#E11E2B',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'background .2s',
            }}
            onMouseOver={(e) => e.target.style.background = '#C01820'}
            onMouseOut={(e) => e.target.style.background = '#E11E2B'}
          >
            Salir
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="admin-main">
        {/* Productos Section */}
        {activeTab === 'productos' && (
          <div>
            <div className="admin-section-header">
              <div>
                <h1 className="admin-section-title">Productos</h1>
                <p className="admin-section-meta">{items.length} productos · {activeProducts} activos</p>
              </div>
              <button className="btn-add-item" onClick={handleAddProduct}>
                + Agregar producto
              </button>
            </div>

            <div className="admin-table-wrapper">
              <div className="admin-table-header">
                <div>Nombre</div>
                <div>Categoría</div>
                <div>Precio</div>
                <div>Estado</div>
                <div></div>
              </div>

              <div className="admin-table-body">
                {items.map(item => (
                  <div key={item._id} className="admin-table-row">
                    <div className="admin-table-cell-name">{item.nombre}</div>
                    <div className="admin-table-cell-category">
                      {categoriaMap[item.categoriaId] || 'Sin categoría'}
                    </div>
                    <div className="admin-table-cell-price">${item.precio.toLocaleString()}</div>
                    <div className="admin-table-cell-status">
                      <span className={`status-badge ${item.disponible ? 'status-active' : 'status-inactive'}`}>
                        {item.disponible ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <button className="btn-edit" onClick={() => handleEditProduct(item._id)}>
                      Editar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Salsas Section */}
        {activeTab === 'salsas' && (
          <div>
            <div className="admin-section-header">
              <div>
                <h1 className="admin-section-title">Salsas</h1>
                <p className="admin-section-meta">Gestiona las salsas disponibles</p>
              </div>
              <button className="btn-add-item" onClick={() => alert('Agregar nueva salsa')}>
                + Agregar salsa
              </button>
            </div>
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              Sección de salsas en desarrollo
            </div>
          </div>
        )}

        {/* Horario Section */}
        {activeTab === 'horario' && (
          <div>
            <div className="admin-section-header">
              <div>
                <h1 className="admin-section-title">Horario</h1>
                <p className="admin-section-meta">Configura el horario de atención</p>
              </div>
            </div>
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              Sección de horario en desarrollo
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      <ProductModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        product={editingProduct}
        categorias={categorias}
        onSave={handleSaveProduct}
      />
    </div>
  );
};
