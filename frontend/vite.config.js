import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 开发环境把 /api 代理到后端 3001 端口，避免跨域
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
