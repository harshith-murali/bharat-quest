import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // The 3D scenes (three/@react-three) need a WebGL context that jsdom does
    // not provide, so they are excluded from component tests.
    exclude: ['node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.d.ts',
        // 3D rendering is verified visually, not in jsdom.
        'src/components/3d/**',
        'src/components/map/**',
      ],
    },
  },
});
