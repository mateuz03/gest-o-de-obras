import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // ✅ Garante que o worker do pdf.js seja tratado como asset
  assetsInclude: ["**/*.worker.min.js"],
  optimizeDeps: {
    // ✅ Exclui pdfjs do pre-bundle do Vite (evita conflito de módulo)
    exclude: ["pdfjs-dist"],
  },
  build: {
    rollupOptions: {
      output: {
        // ✅ Mantém o worker como chunk separado com nome previsível
        manualChunks: {
          "pdf-worker": ["pdfjs-dist/build/pdf.worker.min.js"],
        },
      },
    },
  },
}));