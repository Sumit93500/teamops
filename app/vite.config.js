import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

// virtual:page-meta: what each old page's own HTML says about itself, read at build time so the app shows it on its first
// paint (no text rewritten after paint): the topbar's title (<strong> after "Workspace /"), whether the page has the shell
// (sidebar + topbar), and its static <html data-role> (a public page's colours when nobody is signed in).
function pageMeta() {
  const ID = "virtual:page-meta", RESOLVED = "\0" + ID;
  const PAGES = path.resolve(__dirname, "../pages");
  return {
    name: "page-meta",
    resolveId: (id) => (id === ID ? RESOLVED : null),
    load(id) {
      if (id !== RESOLVED) return null;
      const meta = {};
      for (const area of fs.readdirSync(PAGES)) {
        const dir = path.join(PAGES, area);
        if (!fs.statSync(dir).isDirectory()) continue;
        for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".html"))) {
          const html = fs.readFileSync(path.join(dir, file), "utf8");
          this.addWatchFile(path.join(dir, file));
          meta[`${area}/${file}`] = {
            title: html.match(/class="topbar__left">[\s\S]*?<strong>([^<]*)<\/strong>/)?.[1].replace(/&amp;/g, "&") ?? null,
            docTitle: html.match(/<title>([^<]*)<\/title>/)?.[1].replace(/&amp;/g, "&") ?? "OfficeOS",
            shell: html.includes('class="sidebar"'),
            role: html.match(/<html[^>]*data-role="([a-z]+)"/)?.[1] ?? "admin",
          };
        }
      }
      return `export default ${JSON.stringify(meta)};`;
    },
  };
}

export default defineConfig({
  plugins: [react(), pageMeta()],
  server: { fs: { allow: [".."] } },
  build: { outDir: "dist", emptyOutDir: true },
});
