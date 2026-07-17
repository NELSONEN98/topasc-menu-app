import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import '../styles/admin-styles.css';

export const AdminPanel = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('productos');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const items = useQuery(api.items.listarMenu) || [];
  const actualizarItem = useMutation(api.items.actualizar);

  const handleEdit = (item) => {
    setEditingId(item._id);
    setEditData({
      nombre: item.nombre,
      precio: item.precio,
      disponible: item.disponible,
      descripcion: item.descripcion,
    });
  };

  const handleSave = async () => {
    await actualizarItem({
      id: editingId,
      campos: editData,
    });
    setEditingId(null);
  };

  const handleToggleDisponible = async () => {
    await actualizarItem({
      id: editingId,
      campos: { disponible: !editData.disponible },
    });
    setEditingId(null);
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="admin-shell">
      <div className="admin-sidebar">
        <div className="admin-sidebar-tabs">
          <button
            className="tab-btn"
            onClick={() => setActiveTab('productos')}
            style={{
              color: activeTab === 'productos' ? '#E11E2B' : '#999',
              fontSize: '14px',
              fontWeight: activeTab === 'productos' ? 700 : 500,
            }}
          >
            Productos
          </button>
        </div>
        <div className="admin-sidebar-footer">
          <button
            onClick={onLogout}
            style={{
              background: '#E11E2B',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Salir
          </button>
        </div>
      </div>

      <div className="admin-main">
        {activeTab === 'productos' && (
          <div>
            <h1 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 700 }}>
              Productos
            </h1>

            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: '600px' }}>
                {/* Header Row */}
                <div className="prod-row" style={{
                  paddingBottom: '12px',
                  borderBottom: '2px solid #241C15',
                  fontWeight: 600,
                  fontSize: '12px',
                  color: '#666',
                }}>
                  <div></div>
                  <div>Nombre</div>
                  <div>Precio</div>
                  <div>Estado</div>
                  <div></div>
                </div>

                {/* Product Rows */}
                {items.map(item => (
                  <div key={item._id} className="prod-row" style={{
                    padding: '12px 0',
                    borderBottom: '1px solid #E0D5C7',
                    alignItems: 'center',
                  }}>
                    <img
                      src={item.imagenUrl}
                      alt={item.nombre}
                      className="row-thumb"
                      style={{ objectFit: 'cover', cursor: editingId === item._id ? 'pointer' : 'default' }}
                    />
                    {editingId === item._id ? (
                      <>
                        <input
                          type="text"
                          value={editData.nombre}
                          onChange={(e) => handleInputChange('nombre', e.target.value)}
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}
                          placeholder="Nombre"
                        />
                        <input
                          type="number"
                          value={editData.precio}
                          onChange={(e) => handleInputChange('precio', parseInt(e.target.value))}
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}
                          placeholder="Precio"
                        />
                        <button
                          onClick={handleToggleDisponible}
                          className="switch"
                          style={{
                            background: editData.disponible ? '#22C55E' : '#ccc',
                            justifyContent: editData.disponible ? 'flex-end' : 'flex-start',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '2px',
                          }}
                        >
                          <div className="switch-knob" style={{ left: editData.disponible ? '20px' : '2px' }}></div>
                        </button>
                        <button
                          onClick={handleSave}
                          style={{
                            background: '#22C55E',
                            color: '#fff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '12px',
                          }}
                        >
                          Guardar
                        </button>
                      </>
                    ) : (
                      <>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.nombre}</div>
                          <div style={{ fontSize: '12px', color: '#999' }}>{item.descripcion}</div>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>
                          ${item.precio.toLocaleString()}
                        </div>
                        <button
                          onClick={() => handleEdit(item)}
                          className="switch"
                          style={{
                            background: item.disponible ? '#22C55E' : '#ccc',
                            justifyContent: item.disponible ? 'flex-end' : 'flex-start',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '2px',
                            cursor: 'pointer',
                          }}
                        >
                          <div className="switch-knob" style={{ left: item.disponible ? '20px' : '2px' }}></div>
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          style={{
                            background: '#E11E2B',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          Editar
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
