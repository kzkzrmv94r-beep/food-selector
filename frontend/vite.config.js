import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 开发环境把 /api 代理到后端 3001 端口，避免跨域
export default defineConfig({
  // 生产构建注入子路径（GitHub Pages 部署在 /food-selector/ 下），本地开发默认 /
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
