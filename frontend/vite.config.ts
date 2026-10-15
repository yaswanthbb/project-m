import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_BASE_PATH || "/";
  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        injectRegister: false,
        registerType: "prompt",
        manifest: {
          id: base,
          name: "Daily Drop — Good things, daily.",
          short_name: "Daily Drop",
          description:
            "Free tools, thoughtful picks, and a little money know-how.",
          theme_color: "#17824f",
          background_color: "#fafbf8",
          display: "standalone",
          start_url: `${base}#/deals`,
          scope: base,
          icons: [
            {
              src: "icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "icon-maskable.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        injectManifest: { globPatterns: ["**/*.{js,css,html,png,svg,woff2}"] },
      }),
    ],
  };
});
