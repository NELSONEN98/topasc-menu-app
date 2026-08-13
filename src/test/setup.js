import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sin esto los componentes de un test quedan montados en el DOM del siguiente,
// y las queries de testing-library encuentran dos veces el mismo texto.
afterEach(cleanup);
