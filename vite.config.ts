import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// In development, Vite forwards API prefixes to the API gateway (or microservices)
// so the app and API share one origin: SameSite=Strict cookies work and no CORS issues.

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
      proxy: {
        "/identity": { target, changeOrigin: true, xfwd: true },
        "/assessment": { target, changeOrigin: true, xfwd: true },
        "/api": {
          target,
          changeOrigin: true,
          xfwd: true,
          rewrite: (path) => `/identity${path}`,
        },
      },
    },
  };
});
