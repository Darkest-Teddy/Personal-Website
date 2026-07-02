import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  preview: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT) || 3000,
    allowedHosts: ["jacklhe.com", "www.jacklhe.com"],
  },
  plugins: [
    react(),
    {
      name: "pdf-inline",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.endsWith(".pdf")) {
            res.setHeader("Content-Disposition", "inline");
            res.setHeader("Content-Type", "application/pdf");
          }
          next();
        });
      },
    },
  ],
});
