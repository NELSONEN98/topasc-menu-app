import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Config aparte de vite.config.js a proposito: el build de la app no tiene por
 * que cargar nada de testing. Vitest prefiere este archivo cuando existe.
 *
 * Son DOS proyectos y no uno con dos globs porque necesitan entornos
 * incompatibles: las funciones de Convex no corren en un browser ni en Node, y
 * los componentes de React no corren en un runtime edge. Un solo `environment`
 * obligaria a elegir cual de las dos capas se testea en un entorno mentiroso.
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'convex',
          // convex-test emula con @edge-runtime/vm el mismo runtime en el que
          // corre produccion: los tests fallan por las mismas razones.
          environment: 'edge-runtime',
          server: { deps: { inline: ['convex-test'] } },
          include: ['convex/**/*.test.ts'],
          env: {
            /*
             * guardias.ts lee ADMIN_EMAILS en un `const` de nivel de modulo, o
             * sea UNA sola vez cuando el modulo se importa. Definirla desde
             * dentro de un test llegaria tarde: el modulo ya se evaluo con la
             * lista vacia y `requerirAdmin` rechazaria todo con "Panel sin
             * configurar".
             *
             * Por eso va aca, que se aplica antes de que se importe nada. El
             * valor tiene que coincidir con la identidad que usan los tests.
             */
            ADMIN_EMAILS: 'admin@test.local',
          },
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/**/*.test.jsx'],
          setupFiles: ['./src/test/setup.js'],
          globals: true,
        },
      },
    ],
  },
});
