import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// основное приложение: корень домена (бывший старый кабинет — в бэкапе на сервере)
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://api.hitrack.am',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
