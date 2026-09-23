import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), {
    name: "auto-preview-route",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = (request as { url?: string }).url;
        if (url?.split("?")[0] === "/auto") {
          response.writeHead(302, { Location: url.replace("/auto", "/auto/") });
          response.end();
          return;
        }
        next();
      });
    },
  }],
  build: { rollupOptions: { input: { hogar: "index.html", auto: "auto/index.html" } } },
});
