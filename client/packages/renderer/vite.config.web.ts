import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: {
    __runtime__: '"web"',
  },
  build: {
    rollupOptions: {
      input: {
        app: "/index-spa.html",
      },
    },
  },
  server: {
    open: "/index-spa.html",
  },
})
