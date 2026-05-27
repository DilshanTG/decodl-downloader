import { wasp } from "wasp/client/vite"
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import fs from "fs";
import path from "path";

export default defineConfig({
  plugins: [
    wasp(),
    tailwindcss(),
    {
      name: "vercel-spa-rewrites",
      closeBundle() {
        const out = path.resolve(__dirname, ".wasp/out/web-app/build");
        if (fs.existsSync(out)) {
          fs.writeFileSync(
            path.join(out, "vercel.json"),
            JSON.stringify({ rewrites: [{ source: "/(.*)", destination: "/index.html" }] }, null, 2)
          );
        }
      },
    },
  ],
  server: {
    open: true,
  },
});
