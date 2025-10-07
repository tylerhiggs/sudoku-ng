/// <reference types="vitest" />

import angular from "@analogjs/vite-plugin-angular";
import { defineConfig } from "vite";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [angular()],
    resolve: {
      alias: {
        "@components": resolve(__dirname, "src/app/components"),
        "@services": resolve(__dirname, "src/app/services"),
        "@stores": resolve(__dirname, "src/app/stores"),
        "@pages": resolve(__dirname, "src/app/pages"),
        "@": resolve(__dirname, "src/app"),
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["src/test-setup.ts"],
      include: ["**/*.spec.ts"],
      reporters: ["default"],
      server: {
        deps: {
          inline: [
            "rxfire",
            "@firebase/app",
            "@firebase/firestore",
            "@firebase/database",
            "@angular/fire",
          ],
        },
      },
    },
    define: {
      "import.meta.vitest": mode !== "production",
    },
  };
});
