import { useState } from 'react';
import '../styles/admin-styles.css';

export const AdminLogin = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const ADMIN_PASSWORD = 'topasc2024';

  const handleSubmit = (e) => {
    e.preventDefault();

    if (password === ADMIN_PASSWORD) {
      onLogin();
      setPassword('');
      setError('');
    } else {
      setError('Contraseña incorrecta');
      setPassword('');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F2ECE3',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{
        background: '#fff',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        width: '90%',
        maxWidth: '400px',
      }}>
        <h1 style={{
          textAlign: 'center',
          marginBottom: '30px',
          fontSize: '24px',
          fontWeight: 700,
          color: '#241C15',
        }}>
          Admin Broaster Topasc
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#241C15',
            }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa la contraseña"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: error ? '2px solid #E11E2B' : '1px solid #ddd',
                fontSize: '14px',
                boxSizing: 'border-box',
                fontFamily: "'Inter', sans-serif",
              }}
              autoFocus
            />
            {error && (
              <p style={{
                color: '#E11E2B',
                fontSize: '12px',
                marginTop: '6px',
                margin: '6px 0 0 0',
              }}>
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              background: '#E11E2B',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => e.target.style.background = '#c01820'}
            onMouseOut={(e) => e.target.style.background = '#E11E2B'}
          >
            Ingresar
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          fontSize: '12px',
          color: '#999',
          marginTop: '20px',
        }}>
          Panel de administración
        </p>
      </div>
    </div>
  );
};
