import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the build works under https://<user>.github.io/skyreplay/
  base: "./",
  plugins: [tailwindcss()],
});
