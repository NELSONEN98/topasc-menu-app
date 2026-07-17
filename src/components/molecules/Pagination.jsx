export const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: '24px',
      padding: '16px 0',
    }}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          padding: '8px 12px',
          border: '1px solid #ddd',
          background: currentPage === 1 ? '#f5f5f5' : '#fff',
          borderRadius: '6px',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          fontWeight: '500',
          color: currentPage === 1 ? '#ccc' : '#241C15',
          transition: 'all .2s',
        }}
      >
        ← Anterior
      </button>

      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          style={{
            padding: '8px 12px',
            border: page === currentPage ? '2px solid #FFB81C' : '1px solid #ddd',
            background: page === currentPage ? '#FFF8E7' : '#fff',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: page === currentPage ? '600' : '500',
            color: page === currentPage ? '#FFB81C' : '#666',
            transition: 'all .2s',
            minWidth: '36px',
          }}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{
          padding: '8px 12px',
          border: '1px solid #ddd',
          background: currentPage === totalPages ? '#f5f5f5' : '#fff',
          borderRadius: '6px',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          fontWeight: '500',
          color: currentPage === totalPages ? '#ccc' : '#241C15',
          transition: 'all .2s',
        }}
      >
        Siguiente →
      </button>
    </div>
  );
};
