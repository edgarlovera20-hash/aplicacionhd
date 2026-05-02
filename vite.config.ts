import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  loadEnv(mode, '.', '');
  const isProd = mode === 'production';
  return {
    plugins: [react(), tailwindcss()],
    base: './',
    // ⚠️ No client-side env vars — API keys live only in server.ts (Node process)
    build: {
      outDir: 'build',
      emptyOutDir: true,
      chunkSizeWarningLimit: 600,
      // Sourcemaps off in prod — añaden ~4-6 MB y exponen el código fuente.
      // Si necesitas debuggear errores en prod, súbelos a Sentry/Datadog.
      sourcemap: !isProd,
      // Terser produce builds 10-15% más chicos que esbuild y permite drop_console.
      minify: isProd ? 'terser' : 'esbuild',
      terserOptions: isProd
        ? {
            compress: {
              drop_console: true,    // quita console.log de cliente en prod
              drop_debugger: true,
              passes: 2,
            },
            format: { comments: false },
          }
        : undefined,
      cssMinify: isProd,
      reportCompressedSize: false,   // acelera el build ~30%
      rollupOptions: {
        output: {
          manualChunks(id) {
            // ── Core React — always first to load ─────────────────
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') ||
                id.includes('node_modules/scheduler')) return 'vendor-react';

            // ── Lucide icons — shared by every view ──────────────
            if (id.includes('node_modules/lucide')) return 'vendor-icons';

            // ── Framer-motion / motion ─────────────────────────────
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion'))
              return 'vendor-motion';

            // ── Recharts (used in multiple lazy modules) ──────────
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3') ||
                id.includes('node_modules/victory-vendor'))
              return 'vendor-charts';

            // ── Three.js / R3F — lazy (only sparkles background) ──
            // Keeping in its own chunk so it can be lazy-imported
            if (id.includes('node_modules/three') || id.includes('node_modules/@react-three'))
              return 'vendor-three';

            // ── tsParticles — lazy (only auth/login screen) ────────
            if (id.includes('node_modules/@tsparticles'))
              return 'vendor-particles';

            // ── Export libs — only materialise when printing/export ─
            if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas'))
              return 'vendor-pdf';

            if (id.includes('node_modules/xlsx')) return 'vendor-xlsx';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
