// The React app (round 1 of the React stage). It reuses the old site's data, config and css from ../assets
// unchanged: Vite bundles them into dist, so the old files themselves are never served from here.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: [".."] } },   // ../assets/js and ../assets/css sit outside app/
  build: { outDir: "dist", emptyOutDir: true },
});
