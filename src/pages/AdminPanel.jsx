import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ProductModal } from '../components/organisms/ProductModal';
import { SalsaModal } from '../components/organisms/SalsaModal';
import { AdminPedidos } from '../components/organisms/AdminPedidos';
import { Pagination } from '../components/molecules/Pagination';
import '../styles/admin-styles.css';

export const AdminPanel = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('pedidos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [salsaModalOpen, setSalsaModalOpen] = useState(false);
  const [editingSalsa, setEditingSalsa] = useState(null);
  const [productPage, setProductPage] = useState(1);
  const [salsasPage, setSalsasPage] = useState(1);
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const ITEMS_PER_PAGE = 8;

  const items = useQuery(api.items.listarMenu) || [];
  const categorias = useQuery(api.categorias.listar) || [];
  const salsas = useQuery(api.salsas.listar) || [];
  const crearItem = useMutation(api.items.crear);
  const actualizarItem = useMutation(api.items.actualizar);
  const borrarItem = useMutation(api.items.borrar);
  const crearSalsa = useMutation(api.salsas.crear);
  const actualizarSalsa = useMutation(api.salsas.actualizar);
  const borrarSalsa = useMutation(api.salsas.borrar);

  const activeProducts = items.filter(item => item.disponible).length;

  const categoriaMap = categorias.reduce((acc, cat) => {
    acc[cat._id] = cat.nombre;
    return acc;
  }, {});

  // Filtrado de productos (NO se filtra por imagen: un producto sin foto
  // debe seguir siendo visible y editable, si no queda inaccesible)
  const filteredProducts = items.filter(item => {
    const matchesSearch = item.nombre.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCategory = productCategoryFilter === '' || item.categoriaId === productCategoryFilter;
    const matchesStatus = productStatusFilter === '' ||
      (productStatusFilter === 'active' && item.disponible) ||
      (productStatusFilter === 'inactive' && !item.disponible);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Paginación de productos
  const totalProductPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const productStartIdx = (productPage - 1) * ITEMS_PER_PAGE;
  const productEndIdx = productStartIdx + ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(productStartIdx, productEndIdx);

  // Paginación de salsas
  const totalSalsasPages = Math.ceil(salsas.length / ITEMS_PER_PAGE);
  const salsasStartIdx = (salsasPage - 1) * ITEMS_PER_PAGE;
  const salsasEndIdx = salsasStartIdx + ITEMS_PER_PAGE;
  const paginatedSalsas = salsas.slice(salsasStartIdx, salsasEndIdx);
  const SALSA_PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1623340158501-ba1fd069b06b?w=80&h=80&fit=crop';

  const handleAddProduct = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleEditProduct = (productId) => {
    const product = items.find(item => item._id === productId);
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleDeleteProduct = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await borrarItem({ id: item._id });
      setSaveMessage('✓ Producto eliminado');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      setSaveMessage('❌ Error al eliminar');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleDeleteSalsa = async (salsa) => {
    if (!window.confirm(`¿Eliminar la salsa "${salsa.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await borrarSalsa({ id: salsa._id });
      setSaveMessage('✓ Salsa eliminada');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error al eliminar salsa:', error);
      setSaveMessage('❌ Error al eliminar');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleSaveSalsa = async (formData) => {
    try {
      if (!formData.nombre.trim()) {
        alert('El nombre de la salsa es obligatorio');
        return;
      }
      if (formData.tipo === 'especial' && formData.precio <= 0) {
        alert('Las salsas especiales deben tener un precio mayor a 0');
        return;
      }

      const isEditing = !!editingSalsa;

      if (editingSalsa) {
        await actualizarSalsa({
          id: editingSalsa._id,
          campos: {
            nombre: formData.nombre,
            tipo: formData.tipo,
            precio: formData.tipo === 'base' ? 0 : formData.precio,
            imagenUrl: formData.imagenUrl || undefined,
            disponible: formData.disponible,
          },
        });
      } else {
        await crearSalsa({
          nombre: formData.nombre,
          tipo: formData.tipo,
          precio: formData.tipo === 'base' ? 0 : formData.precio,
          imagenUrl: formData.imagenUrl || undefined,
        });
      }

      setSalsaModalOpen(false);
      setEditingSalsa(null);
      setSaveMessage(isEditing ? '✓ Salsa actualizada' : '✓ Salsa creada');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error al guardar salsa:', error);
      setSaveMessage('❌ Error al guardar');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleSaveProduct = async (formData) => {
    try {
      if (!formData.nombre.trim()) {
        alert('El nombre del producto es obligatorio');
        return;
      }
      if (!formData.categoriaId) {
        alert('Debes seleccionar una categoría');
        return;
      }
      if (formData.precio <= 0) {
        alert('El precio debe ser mayor a 0');
        return;
      }

      const isEditing = !!editingProduct;

      if (editingProduct) {
        await actualizarItem({
          id: editingProduct._id,
          campos: {
            nombre: formData.nombre,
            categoriaId: formData.categoriaId,
            precio: formData.precio,
            descripcion: formData.descripcion,
            imagenUrl: formData.imagenUrl,
            disponible: formData.disponible,
            llevaSalsas: formData.llevaSalsas,
          },
        });
      } else {
        await crearItem({
          categoriaId: formData.categoriaId,
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          precio: formData.precio,
          imagenUrl: formData.imagenUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop',
          llevaSalsas: formData.llevaSalsas,
          disponible: formData.disponible,
        });
      }

      setModalOpen(false);
      setEditingProduct(null);

      // Mostrar mensaje de éxito
      setSaveMessage(isEditing ? '✓ Producto actualizado' : '✓ Producto creado');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error al guardar producto:', error);
      setSaveMessage('❌ Error al guardar');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  return (
    <div className="admin-shell">
      {/* Toast de éxito/error */}
      {saveMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: saveMessage.includes('Error') ? '#fee' : '#efe',
            color: saveMessage.includes('Error') ? '#c33' : '#3a3',
            padding: '12px 20px',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 2000,
            fontWeight: '600',
            fontSize: '14px',
            animation: 'slideDown .3s ease-out',
          }}
        >
          {saveMessage}
        </div>
      )}

      {/* Navbar */}
      <nav className="admin-navbar">
        <div className="admin-navbar-brand">
          <span className="admin-navbar-brand-gold">Topasc</span>
        </div>

        <div className="admin-navbar-nav">
          <button
            className={`admin-nav-item ${activeTab === 'pedidos' ? 'active' : ''}`}
            onClick={() => setActiveTab('pedidos')}
          >
            🧾 Pedidos
          </button>
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
        {/* Pedidos Section */}
        {activeTab === 'pedidos' && (
          <div>
            <div className="admin-section-header">
              <div>
                <h1 className="admin-section-title">Pedidos</h1>
                <p className="admin-section-meta">Pedidos activos en tiempo real</p>
              </div>
            </div>
            <AdminPedidos />
          </div>
        )}

        {/* Productos Section */}
        {activeTab === 'productos' && (
          <div>
            <div className="admin-section-header">
              <div>
                <h1 className="admin-section-title">Productos</h1>
                <p className="admin-section-meta">{filteredProducts.length} de {items.length} productos · {activeProducts} activos</p>
              </div>
              <button className="btn-add-item" onClick={handleAddProduct}>
                + Agregar producto
              </button>
            </div>

            <div className="admin-filters">
              <div className="filter-group" style={{ flex: 2 }}>
                <label className="filter-label">Buscar</label>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Buscar por nombre..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setProductPage(1);
                  }}
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">Categoría</label>
                <select
                  className="filter-select"
                  value={productCategoryFilter}
                  onChange={(e) => {
                    setProductCategoryFilter(e.target.value);
                    setProductPage(1);
                  }}
                >
                  <option value="">Todas</option>
                  {categorias.map(cat => (
                    <option key={cat._id} value={cat._id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Estado</label>
                <select
                  className="filter-select"
                  value={productStatusFilter}
                  onChange={(e) => {
                    setProductStatusFilter(e.target.value);
                    setProductPage(1);
                  }}
                >
                  <option value="">Todos</option>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>

            </div>

            <div className="admin-table-wrapper">
              <div className="admin-table-header">
                <div></div>
                <div>Nombre</div>
                <div>Categoría</div>
                <div>Precio</div>
                <div>Estado</div>
                <div></div>
              </div>

              <div className="admin-table-body">
                {paginatedProducts.map(item => (
                  <div key={item._id} className="admin-table-row">
                    {item.imagenUrl && item.imagenUrl.trim() !== '' ? (
                      <img src={item.imagenUrl} alt={item.nombre} className="admin-table-img" />
                    ) : (
                      <div className="admin-table-img admin-table-img--empty" title="Sin imagen">
                        📷
                      </div>
                    )}
                    <div className="admin-table-cell-name">
                      {item.nombre}
                      {(!item.imagenUrl || item.imagenUrl.trim() === '') && (
                        <span className="admin-table-noimg">Falta imagen</span>
                      )}
                    </div>
                    <div className="admin-table-cell-category">
                      {categoriaMap[item.categoriaId] || 'Sin categoría'}
                    </div>
                    <div className="admin-table-cell-price">${item.precio.toLocaleString()}</div>
                    <div className="admin-table-cell-status">
                      <button
                        className={`status-toggle ${item.disponible ? 'active' : ''}`}
                        onClick={async () => {
                          try {
                            await actualizarItem({
                              id: item._id,
                              campos: { disponible: !item.disponible },
                            });
                          } catch (error) {
                            console.error('Error al cambiar estado:', error);
                          }
                        }}
                        title={item.disponible ? 'Clic para inhabilitar' : 'Clic para habilitar'}
                      />
                    </div>
                    <div className="admin-table-actions">
                      <button className="btn-edit" onClick={() => handleEditProduct(item._id)}>
                        Editar
                      </button>
                      <button className="btn-delete" onClick={() => handleDeleteProduct(item)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Pagination
              currentPage={productPage}
              totalPages={totalProductPages}
              onPageChange={setProductPage}
            />
          </div>
        )}

        {/* Salsas Section */}
        {activeTab === 'salsas' && (
          <div>
            <div className="admin-section-header">
              <div>
                <h1 className="admin-section-title">Salsas</h1>
                <p className="admin-section-meta">{salsas.length} salsas · {salsas.filter(s => s.disponible).length} activas</p>
              </div>
              <button
                className="btn-add-item"
                onClick={() => {
                  setEditingSalsa(null);
                  setSalsaModalOpen(true);
                }}
              >
                + Agregar salsa
              </button>
            </div>

            <div className="admin-table-wrapper">
              <div className="admin-table-header admin-table-header-sauces">
                <div></div>
                <div>Nombre</div>
                <div>Precio</div>
                <div>Estado</div>
                <div></div>
              </div>

              <div className="admin-table-body">
                {paginatedSalsas.map(salsa => (
                  <div key={salsa._id} className="admin-table-row admin-table-row-sauces">
                    <img src={salsa.imagenUrl || SALSA_PLACEHOLDER_IMG} alt={salsa.nombre} className="admin-table-img" />
                    <div className="admin-table-cell-name">
                      {salsa.nombre}
                      {salsa.tipo === 'especial' && (
                        <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 600, color: '#B8860B', background: '#FBF1D6', padding: '2px 8px', borderRadius: '10px' }}>
                          Especial
                        </span>
                      )}
                    </div>
                    <div className="admin-table-cell-price">
                      {salsa.tipo === 'base' ? 'Gratis' : `$${salsa.precio.toLocaleString()}`}
                    </div>
                    <div className="admin-table-cell-status">
                      <button
                        className={`status-toggle ${salsa.disponible ? 'active' : ''}`}
                        onClick={async () => {
                          try {
                            await actualizarSalsa({
                              id: salsa._id,
                              campos: { disponible: !salsa.disponible },
                            });
                          } catch (error) {
                            console.error('Error al cambiar estado:', error);
                          }
                        }}
                        title={salsa.disponible ? 'Clic para inhabilitar' : 'Clic para habilitar'}
                      />
                    </div>
                    <div className="admin-table-actions">
                      <button
                        className="btn-edit"
                        onClick={() => {
                          setEditingSalsa(salsa);
                          setSalsaModalOpen(true);
                        }}
                      >
                        Editar
                      </button>
                      <button className="btn-delete" onClick={() => handleDeleteSalsa(salsa)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Pagination
              currentPage={salsasPage}
              totalPages={totalSalsasPages}
              onPageChange={setSalsasPage}
            />
          </div>
        )}

        {/* Horario Section */}
        {activeTab === 'horario' && (
          <div>
            <div className="admin-section-header">
              <div>
                <h1 className="admin-section-title">Horario</h1>
                <p className="admin-section-meta">Configura el horario de atención semanal</p>
              </div>
            </div>

            <div className="horario-container">
              {[
                { dia: 'Lunes', entrada: '11:00 AM', salida: '11:00 PM', abierto: true },
                { dia: 'Martes', entrada: '11:00 AM', salida: '11:00 PM', abierto: true },
                { dia: 'Miércoles', entrada: '11:00 AM', salida: '11:00 PM', abierto: true },
                { dia: 'Jueves', entrada: '11:00 AM', salida: '11:00 PM', abierto: true },
                { dia: 'Viernes', entrada: '11:00 AM', salida: '12:00 AM', abierto: true },
                { dia: 'Sábado', entrada: '12:00 PM', salida: '12:00 AM', abierto: true },
                { dia: 'Domingo', entrada: '12:00 PM', salida: '10:00 PM', abierto: true },
              ].map((horario, idx) => (
                <div key={idx} className="horario-card">
                  <div className="horario-day">
                    <span className="horario-day-badge"></span>
                    {horario.dia}
                  </div>

                  {horario.abierto ? (
                    <div className="horario-times">
                      <div className="horario-time-row">
                        <span className="horario-time-label">Entrada</span>
                        <span className="horario-time-value">{horario.entrada}</span>
                      </div>
                      <div className="horario-time-row">
                        <span className="horario-time-label">Salida</span>
                        <span className="horario-time-value">{horario.salida}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="horario-closed">Cerrado</div>
                  )}

                  <button
                    style={{
                      background: '#f0f0f0',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#241C15',
                      transition: 'background .2s',
                    }}
                    onMouseOver={(e) => e.target.style.background = '#e0e0e0'}
                    onMouseOut={(e) => e.target.style.background = '#f0f0f0'}
                  >
                    Editar
                  </button>
                </div>
              ))}
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

      {/* Salsa Modal */}
      <SalsaModal
        isOpen={salsaModalOpen}
        onClose={() => {
          setSalsaModalOpen(false);
          setEditingSalsa(null);
        }}
        salsa={editingSalsa}
        onSave={handleSaveSalsa}
      />
    </div>
  );
};
