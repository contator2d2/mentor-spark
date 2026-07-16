import { defineConfig } from "vite";
 import react from "@vitejs/plugin-react-swc";
 import path from "path";
 
 // https://vitejs.dev/config/
 export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET || "https://blaster-mentorflor-backend.isyhhh.easypanel.host",
        changeOrigin: true,
        secure: true,
      },
      "/__l5e": {
        target:
          process.env.VITE_ASSETS_PROXY_TARGET ||
          "https://id-preview--e4411f93-7e6a-4f97-9441-3f6ff2ddf2fb.lovable.app",
        changeOrigin: true,
        secure: true,
      },
    },
    hmr: {
      overlay: false,
    },
  },
   plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
