import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/termoIT/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      input: {
        // Entry principal da SPA React
        main: resolve(__dirname, 'index.html'),
        // Entry da página de redirecionamento do popup MSAL.
        // Gera dist/blank.html com MSAL bundled — registado no Azure AD como redirectUri do popup.
        authRedirect: resolve(__dirname, 'blank.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
