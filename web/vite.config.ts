import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the build works under https://<user>.github.io/skyreplay/
  base: "./",
  plugins: [react(), tailwindcss()],
});
