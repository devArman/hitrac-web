import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// приложение живёт на clients.hitrack.am/next/ (nginx alias /var/www/clients-next)
export default defineConfig({
  base: '/next/',
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
