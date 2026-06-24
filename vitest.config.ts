import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

const projectRoot = process.cwd().replace(/\\/g, "/");

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    pool: "forks",
    poolOptions: {
      forks: {
        execArgv: [`--require=${projectRoot}/src/test/preload-canvas.cjs`],
      },
    },
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": `${projectRoot}/src` },
  },
});
