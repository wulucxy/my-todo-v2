import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    watch: {
      usePolling: true,
      interval: 150,
      binaryInterval: 300,
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**']
    },
    // Disable file watching optimizations that can cause issues in WebContainers
    fs: {
      strict: false
    },
    // Enable HMR error overlay
    hmr: {
      overlay: true
    }
  },
  resolve: {
    alias: {
      "@": "/src",
      "@convex": "/convex/_generated",
    },
  },
  // Optimize for WebContainer environment
  define: {
    'process.env.VITE_WEBCONTAINER': 'true'
  },
  optimizeDeps: {
    // Reduce aggressive pre-bundling that can conflict with file saves
    include: ['react', 'react-dom'],
    force: false
  },
  // Reduce build optimizations that might interfere with file watching
  build: {
    rollupOptions: {
      watch: {
        buildDelay: 100
      }
    }
  }
})