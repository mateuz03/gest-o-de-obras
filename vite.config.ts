import path from "path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { componentTagger } from "lovable-tagger";

function getPackageName(id: string) {
  const normalized = id.replace(/\\/g, "/");
  const nodeModulesIndex = normalized.lastIndexOf("/node_modules/");

  if (nodeModulesIndex === -1) return null;

  const packagePath = normalized.slice(nodeModulesIndex + "/node_modules/".length);
  const segments = packagePath.split("/");

  if (packagePath.startsWith("@")) {
    return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : null;
  }

  return segments[0] || null;
}

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
<<<<<<< HEAD
=======
  assetsInclude: ["**/*.worker.min.js"],
>>>>>>> ec638779cf1cbc03e73d2bd2051a5e1799d11b3d
  optimizeDeps: {
    exclude: ["pdfjs-dist", "recharts", "jspdf", "jspdf-autotable", "xlsx"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, "/");

          if (normalized.includes("vite/preload-helper")) return "preload-helper";
          // Keep Rollup interop helpers isolated so React and generic vendor
          // chunks do not end up depending on each other at bootstrap time.
          if (normalized.includes("commonjsHelpers")) return "chunk-helpers";

<<<<<<< HEAD
=======
          if (normalized.includes("/node_modules/pdfjs-dist/legacy/build/pdf.worker.min.js")) {
            return "pdf-worker";
          }

>>>>>>> ec638779cf1cbc03e73d2bd2051a5e1799d11b3d
          if (!normalized.includes("/node_modules/")) return undefined;

          const packageName = getPackageName(normalized);
          if (!packageName) return "vendor";

          if (packageName === "pdfjs-dist") return "pdfjs";

          if (["jspdf", "jspdf-autotable", "html2canvas", "canvg", "dompurify"].includes(packageName)) {
            return "jspdf";
          }

          if (["xlsx", "file-saver"].includes(packageName)) return "xlsx";
          if (["recharts", "victory-vendor"].includes(packageName)) return "recharts";
          if (["react", "react-dom", "scheduler"].includes(packageName)) return "react-vendor";

          if (["react-router", "react-router-dom", "@remix-run/router"].includes(packageName)) {
            return "router-vendor";
          }

          if (packageName.startsWith("@radix-ui/")) return "radix-vendor";

          if (packageName.startsWith("@supabase/") || packageName.startsWith("@tanstack/")) {
            return "data-vendor";
          }

          if (packageName === "framer-motion") return "motion-vendor";

          if (["react-hook-form", "@hookform/resolvers", "zod"].includes(packageName)) {
            return "forms-vendor";
          }

          if (
            [
              "cmdk",
              "embla-carousel-react",
              "input-otp",
              "next-themes",
              "react-day-picker",
              "react-resizable-panels",
              "sonner",
              "vaul",
            ].includes(packageName)
          ) {
            return "ui-vendor";
          }

          if (packageName === "lucide-react") return "icons-vendor";

          return "vendor";
        },
      },
    },
  },
}));
