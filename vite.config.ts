import { defineConfig } from "vite";

export default defineConfig({
  base: "/games/gdk-reference/",
  server: {
    port: 5176,
    proxy: {
      "/launcher-api": "http://127.0.0.1:8083",
      "/ws": { target: "ws://127.0.0.1:8081", ws: true }
    }
  }
});
