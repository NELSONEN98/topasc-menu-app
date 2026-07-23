import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ProductModal } from '../components/organisms/ProductModal';
import { SalsaModal } from '../components/organisms/SalsaModal';
import { CategoriaModal } from '../components/organisms/CategoriaModal';
import { AdminPedidos } from '../components/organisms/AdminPedidos';
import { Pagination } from '../components/molecules/Pagination';
import { aNumero } from '../utils/numeroDeInput';
import { useNotificacion } from '../context/NotificacionContext';
import '../styles/admin-styles.css';

// Una sola instancia compartida: `useQuery(...) || []` creaba un array NUEVO
// en cada render mientras la query estaba cargando, y esa referencia distinta
// disparaba los useEffect que la tenian como dependencia.
const SIN_DATOS = [];

const TABS = [
  { id: 'pedidos', icono: '🧾', etiqueta: 'Pedidos' },
  { id: 'productos', icono: '🍽', etiqueta: 'Productos' },
  { id: 'categorias', icono: '🗂', etiqueta: 'Categorías' },
  { id: 'salsas', icono: '🧂', etiqueta: 'Salsas' },
  { id: 'horario', icono: '🕒', etiqueta: 'Horario' },
];

export const AdminPanel = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('pedidos');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [salsaModalOpen, setSalsaModalOpen] = useState(false);
  const [editingSalsa, setEditingSalsa] = useState(null);
  const [categoriaModalOpen, setCategoriaModalOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState(null);
  const [productPage, setProductPage] = useState(1);
  const [salsasPage, setSalsasPage] = useState(1);
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('');
  const { notificar, confirmar } = useNotificacion();
  const ITEMS_PER_PAGE = 8;

  // El drawer se comporta como un dialogo: Escape lo cierra y el fondo no
  // scrollea mientras esta abierto.
  useEffect(() => {
    if (!menuAbierto) return;

    const alPresionar = (e) => {
      if (e.key === 'Escape') setMenuAbierto(false);
    };
    document.addEventListener('keydown', alPresionar);

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.body.style.overflow = overflowPrevio;
    };
  }, [menuAbierto]);

  const irATab = (id) => {
    setActiveTab(id);
    setMenuAbierto(false);
  };

  const items = useQuery(api.items.listarMenu) ?? SIN_DATOS;
  const categorias = useQuery(api.categorias.listar) ?? SIN_DATOS;
  const salsas = useQuery(api.salsas.listar) ?? SIN_DATOS;
  const crearItem = useMutation(api.items.crear);
  const actualizarItem = useMutation(api.items.actualizar);
  const borrarItem = useMutation(api.items.borrar);
  const todasCategorias = useQuery(api.categorias.listarTodas) ?? SIN_DATOS;
  const crearCategoria = useMutation(api.categorias.crear);
  const actualizarCategoria = useMutation(api.categorias.actualizar);
  const borrarCategoria = useMutation(api.categorias.borrar);
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
    const confirmado = await confirmar({
      titulo: `¿Eliminar "${item.nombre}"?`,
      mensaje: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!confirmado) return;

    try {
      await borrarItem({ id: item._id });
      notificar.exito('Producto eliminado');
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  const handleDeleteSalsa = async (salsa) => {
    const confirmado = await confirmar({
      titulo: `¿Eliminar la salsa "${salsa.nombre}"?`,
      mensaje: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!confirmado) return;

    try {
      await borrarSalsa({ id: salsa._id });
      notificar.exito('Salsa eliminada');
    } catch (error) {
      console.error('Error al eliminar salsa:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  // Convex envuelve el mensaje del throw; nos quedamos con la parte util
  const mensajeDeError = (error) => {
    const texto = error?.message || '';
    const limpio = texto.split('\n')[0].replace(/^.*?Error:\s*/, '');
    return limpio || 'Error inesperado';
  };

  const productosPorCategoria = items.reduce((acc, item) => {
    acc[item.categoriaId] = (acc[item.categoriaId] || 0) + 1;
    return acc;
  }, {});

  const siguienteOrden = todasCategorias.length > 0
    ? Math.max(...todasCategorias.map(c => c.orden || 0)) + 1
    : 1;

  const handleSaveCategoria = async (formData) => {
    try {
      if (!formData.nombre.trim()) {
        notificar.info('El nombre de la categoría es obligatorio');
        return;
      }

      const isEditing = !!editingCategoria;
      const orden = aNumero(formData.orden, siguienteOrden);

      if (editingCategoria) {
        await actualizarCategoria({
          id: editingCategoria._id,
          campos: {
            nombre: formData.nombre,
            orden,
            activo: formData.activo,
          },
        });
      } else {
        await crearCategoria({
          nombre: formData.nombre,
          orden,
        });
      }

      setCategoriaModalOpen(false);
      setEditingCategoria(null);
      notificar.exito(isEditing ? 'Categoría actualizada' : 'Categoría creada');
    } catch (error) {
      console.error('Error al guardar categoría:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  const handleDeleteCategoria = async (categoria) => {
    const productos = productosPorCategoria[categoria._id] || 0;

    if (productos > 0) {
      await confirmar({
        titulo: 'No se puede eliminar',
        mensaje:
          `"${categoria.nombre}" tiene ${productos} producto(s).\n\n` +
          `Si la borrás, esos productos quedan sin categoría y desaparecen del menú. ` +
          `Movelos a otra categoría primero, o desactivala para ocultarla sin perder nada.`,
        textoConfirmar: 'Entendido',
        soloAceptar: true,
      });
      return;
    }

    const confirmado = await confirmar({
      titulo: `¿Eliminar la categoría "${categoria.nombre}"?`,
      mensaje: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!confirmado) return;

    try {
      await borrarCategoria({ id: categoria._id });
      notificar.exito('Categoría eliminada');
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  const handleSaveSalsa = async (formData) => {
    try {
      if (!formData.nombre.trim()) {
        notificar.info('El nombre de la salsa es obligatorio');
        return;
      }
      // Las salsas base son gratis; solo las especiales necesitan precio
      const precio = formData.tipo === 'base' ? 0 : aNumero(formData.precio);

      if (formData.tipo === 'especial' && precio <= 0) {
        notificar.info('Las salsas especiales deben tener un precio mayor a 0');
        return;
      }

      const isEditing = !!editingSalsa;

      if (editingSalsa) {
        await actualizarSalsa({
          id: editingSalsa._id,
          campos: {
            nombre: formData.nombre,
            tipo: formData.tipo,
            precio,
            imagenUrl: formData.imagenUrl || undefined,
            disponible: formData.disponible,
          },
        });
      } else {
        await crearSalsa({
          nombre: formData.nombre,
          tipo: formData.tipo,
          precio,
          imagenUrl: formData.imagenUrl || undefined,
        });
      }

      setSalsaModalOpen(false);
      setEditingSalsa(null);
      notificar.exito(isEditing ? 'Salsa actualizada' : 'Salsa creada');
    } catch (error) {
      console.error('Error al guardar salsa:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  const handleSaveProduct = async (formData) => {
    try {
      if (!formData.nombre.trim()) {
        notificar.info('El nombre del producto es obligatorio');
        return;
      }
      if (!formData.categoriaId) {
        notificar.info('Elegí una categoría');
        return;
      }
      const precio = aNumero(formData.precio);
      if (precio <= 0) {
        notificar.info('El precio debe ser mayor a 0');
        return;
      }

      const isEditing = !!editingProduct;

      if (editingProduct) {
        await actualizarItem({
          id: editingProduct._id,
          campos: {
            nombre: formData.nombre,
            categoriaId: formData.categoriaId,
            precio,
            descripcion: formData.descripcion,
            ingredientes: formData.ingredientes,
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
          ingredientes: formData.ingredientes,
          precio,
          imagenUrl: formData.imagenUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop',
          llevaSalsas: formData.llevaSalsas,
          disponible: formData.disponible,
        });
      }

      setModalOpen(false);
      setEditingProduct(null);
      notificar.exito(isEditing ? 'Producto actualizado' : 'Producto creado');
    } catch (error) {
      console.error('Error al guardar producto:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  return (
    <div className="admin-shell">
      {/* Navbar */}
      <nav className="admin-navbar">
        <button
          type="button"
          className={`admin-burger ${menuAbierto ? 'is-open' : ''}`}
          onClick={() => setMenuAbierto((abierto) => !abierto)}
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

        <div
          id="admin-nav"
          className={`admin-navbar-nav ${menuAbierto ? 'is-open' : ''}`}
        >
          {TABS.map(({ id, icono, etiqueta }) => (
            <button
              key={id}
              className={`admin-nav-item ${activeTab === id ? 'active' : ''}`}
              onClick={() => irATab(id)}
              aria-current={activeTab === id ? 'page' : undefined}
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
          onClick={() => setMenuAbierto(false)}
          aria-hidden="true"
        />
      )}

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
                    <div className="admin-table-cell-category" data-label="Categoría">
                      {categoriaMap[item.categoriaId] || 'Sin categoría'}
                    </div>
                    <div className="admin-table-cell-price" data-label="Precio">
                      ${item.precio.toLocaleString()}
                    </div>
                    <div className="admin-table-cell-status" data-label="Estado">
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

        {/* Categorías Section */}
        {activeTab === 'categorias' && (
          <div>
            <div className="admin-section-header">
              <div>
                <h1 className="admin-section-title">Categorías</h1>
                <p className="admin-section-meta">
                  {todasCategorias.length} categorías · {todasCategorias.filter(c => c.activo).length} activas
                </p>
              </div>
              <button
                className="btn-add-item"
                onClick={() => {
                  setEditingCategoria(null);
                  setCategoriaModalOpen(true);
                }}
              >
                + Agregar categoría
              </button>
            </div>

            <div className="admin-table-wrapper">
              <div className="admin-table-header admin-table-header-categorias">
                <div>Orden</div>
                <div>Nombre</div>
                <div>Productos</div>
                <div>Estado</div>
                <div></div>
              </div>

              <div className="admin-table-body">
                {todasCategorias.map(categoria => {
                  const productos = productosPorCategoria[categoria._id] || 0;

                  return (
                    <div key={categoria._id} className="admin-table-row admin-table-row-categorias">
                      <div className="admin-table-cell-orden" data-label="Orden">
                        {categoria.orden}
                      </div>
                      <div className="admin-table-cell-name">{categoria.nombre}</div>
                      <div className="admin-table-cell-category" data-label="Productos">
                        {productos === 0 ? 'Sin productos' : `${productos} producto${productos === 1 ? '' : 's'}`}
                      </div>
                      <div className="admin-table-cell-status" data-label="Estado">
                        <button
                          className={`status-toggle ${categoria.activo ? 'active' : ''}`}
                          onClick={async () => {
                            try {
                              await actualizarCategoria({
                                id: categoria._id,
                                campos: { activo: !categoria.activo },
                              });
                            } catch (error) {
                              console.error('Error al cambiar estado:', error);
                            }
                          }}
                          title={categoria.activo ? 'Clic para ocultar del menú' : 'Clic para mostrar en el menú'}
                        />
                      </div>
                      <div className="admin-table-actions">
                        <button
                          className="btn-edit"
                          onClick={() => {
                            setEditingCategoria(categoria);
                            setCategoriaModalOpen(true);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteCategoria(categoria)}
                          disabled={productos > 0}
                          title={productos > 0 ? 'Tiene productos: movelos o desactivala' : 'Eliminar categoría'}
                          style={productos > 0 ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
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
                    <div className="admin-table-cell-price" data-label="Precio">
                      {salsa.tipo === 'base' ? 'Gratis' : `$${salsa.precio.toLocaleString()}`}
                    </div>
                    <div className="admin-table-cell-status" data-label="Estado">
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

      {/* Categoría Modal */}
      <CategoriaModal
        isOpen={categoriaModalOpen}
        onClose={() => {
          setCategoriaModalOpen(false);
          setEditingCategoria(null);
        }}
        categoria={editingCategoria}
        siguienteOrden={siguienteOrden}
        onSave={handleSaveCategoria}
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
