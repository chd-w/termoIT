import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/termoIT/',
  build: {
    rollupOptions: {
      input: {
        // Entry principal da SPA
        main: resolve(__dirname, 'index.html'),
        // Entry da página de redirecionamento do popup MSAL
        // Gera dist/blank.html — registado no Azure AD como redirectUri do popup
        authRedirect: resolve(__dirname, 'blank.html'),
      },
    },
  },
})