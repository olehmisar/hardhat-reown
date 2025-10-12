import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    rollupOptions: {
      input: "src/client/index.html",
    },
    outDir: "dist-client",
    minify: false,
    cssMinify: true,
  },
});
