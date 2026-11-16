import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Muat stylesheet utama secara async agar tidak memblokir render awal.
// CSS (72KB) lebih kecil dari bundle JS (204KB) dan selesai diunduh sebelum
// React merender konten, jadi tidak ada flash tanpa style yang terlihat.
// Tanpa ini, CSS jadi satu-satunya render-blocking request (1.070 md di PageSpeed).
function asyncCss() {
  return {
    name: 'async-css',
    transformIndexHtml(html: string) {
      return html.replace(
        /<link rel="stylesheet"([^>]*?)>/g,
        (_m: string, attrs: string) =>
          `<link rel="stylesheet" media="print" onload="this.media='all'"${attrs}>`
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env['VITE_API_KEY'] || env['X-API-KEY'] || env['X_API_KEY'] || '';
  const abellabApiKey = env['VITE_ABELLAB_API_KEY'] || env['ABELLAB_API_KEY'] || 'res_bb3f9da00d54ee973c74fe50a2c76ba7';

  return {
    plugins: [react(), asyncCss()],
    define: {
      '__API_KEY__': JSON.stringify(apiKey),
      '__ABELLAB_API_KEY__': JSON.stringify(abellabApiKey),
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
