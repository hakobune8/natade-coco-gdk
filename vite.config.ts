import { defineConfig } from "vite";
import { localControllerInputRelay } from "@natadecoco/controller-sdk/local-dev-vite";

export default defineConfig({
  base: "/games/gdk-reference/",
  plugins: [localControllerInputRelay()],
  server: {
    port: 5176,
    proxy: {
      "/launcher-api": "http://127.0.0.1:8083",
      "/ws": { target: "ws://127.0.0.1:8081", ws: true }
    }
  }
});
