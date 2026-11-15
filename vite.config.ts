import { resolve } from "node:path";
import { defineConfig } from "vite";
import { localControllerInputRelay } from "@natadecoco/controller-sdk/local-dev-vite";

export default defineConfig({
  base: "/games/gdk-reference/",
  plugins: [localControllerInputRelay()],
  build: {
    rollupOptions: {
      preserveEntrySignatures: "strict",
      input: { main: resolve("index.html"), "controller-ui": resolve("src/controller-ui.ts") },
      output: { entryFileNames: chunk => chunk.name === "controller-ui" ? "controller-ui.js" : "assets/[name]-[hash].js", assetFileNames: asset => asset.names?.includes("controller-ui.css") ? "controller-ui.css" : "assets/[name]-[hash][extname]" }
    }
  },
  server: {
    port: 5176,
    proxy: {
      "/launcher-api": "http://127.0.0.1:8083",
      "/ws": { target: "ws://127.0.0.1:8081", ws: true }
    }
  }
});
