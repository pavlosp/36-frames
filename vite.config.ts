import { defineConfig, UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ command, mode }) => {
  if (command === "build" && process.env.BUILD_TARGET === "server") {
    // Return the server config
    return {
      plugins: [react(), runtimeErrorOverlay(), themePlugin()],
      resolve: {
        alias: {
          "@db": path.resolve(__dirname, "db"),
          "@": path.resolve(__dirname, "client", "src"),
        },
      },
      root: path.resolve(__dirname, "client"),
      build: {
        ssr: true,           // Mark this as a server-side build
        outDir: path.resolve(__dirname, "dist/server"),
        emptyOutDir: true,
        rollupOptions: {
          input: path.resolve(__dirname, "client/src/entry-server.js"),
        },
      },
    } as UserConfig;
  } else {
    // Return the client config (default)
    return {
      plugins: [react(), runtimeErrorOverlay(), themePlugin()],
      resolve: {
        alias: {
          "@db": path.resolve(__dirname, "db"),
          "@": path.resolve(__dirname, "client", "src"),
        },
      },
      root: path.resolve(__dirname, "client"),
      build: {
        outDir: path.resolve(__dirname, "dist/client"),
        emptyOutDir: true,
      },
    } as UserConfig;
  }
});
