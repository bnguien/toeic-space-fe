import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// API prefixes served by the API gateway. In development Vite forwards them so the app and the
// API share one origin: the SameSite=Strict refresh cookie works and no CORS is needed.
const API_PREFIXES = ["/identity", "/assessment"];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const target = env.VITE_DEV_PROXY_TARGET || "http://localhost:5050";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      proxy: Object.fromEntries(
        API_PREFIXES.map((prefix) => [prefix, { target, changeOrigin: true, xfwd: true }]),
      ),
    },
  };
});
