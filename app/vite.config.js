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
          // the breadcrumb's last link, from the pages folder: where the phone's back arrow goes (ui/phone.js addBack)
          const crumbs = html.match(/<ol class="breadcrumb[^"]*"[\s\S]*?<\/ol>/)?.[0] ?? "";
          const lastHref = [...crumbs.matchAll(/<a href="([^"]+)"/g)].at(-1)?.[1] ?? null;
          meta[`${area}/${file}`] = {
            back: lastHref ? path.posix.normalize(`${area}/${lastHref}`) : null,
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

// E1b (tests only): with OFFICEOS_DEMO_OFF=1 a build has demo mode off (config/demo.js "mode: true" -> "mode: false"), so
// the harness can check the switched-off sign-in page without editing the source. A normal build never sets it.
function demoOffForTests() {
  return {
    name: "demo-off-for-tests",
    enforce: "pre",
    transform(code, id) {
      if (process.env.OFFICEOS_DEMO_OFF !== "1" || !/config[\\/]demo\.js$/.test(id)) return null;
      return { code: code.replace("mode: true", "mode: false"), map: null };
    },
  };
}

export default defineConfig({
  plugins: [react(), pageMeta(), demoOffForTests()],
  server: { fs: { allow: [".."] } },
  build: { outDir: "dist", emptyOutDir: true },
});
