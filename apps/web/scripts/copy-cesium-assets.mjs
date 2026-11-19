/**
 * Copy Cesium's static assets (Workers, Assets, ThirdParty, Widgets) into
 * `public/cesium` so the app can serve them at `/cesium/*`. Turbopack has no
 * copy plugin, so this runs before `next dev` and `next build`.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(dirname(require.resolve("cesium/package.json")), "Build", "Cesium");
const dest = join(appRoot, "public", "cesium");

if (!existsSync(src)) {
  console.error(`Cesium build not found at ${src}`);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
for (const dir of ["Assets", "Workers", "ThirdParty", "Widgets"]) {
  cpSync(join(src, dir), join(dest, dir), { recursive: true });
}
console.log(`Copied Cesium assets → ${dest}`);
