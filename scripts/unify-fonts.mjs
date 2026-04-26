import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "app");
const exts = new Set([".tsx", ".ts", ".jsx", ".js"]);

function* walk(dir) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) yield* walk(full);
    else if (exts.has(path.extname(name.name))) yield full;
  }
}

let updated = 0;
for (const file of walk(root)) {
  let s = fs.readFileSync(file, "utf8");
  const orig = s;
  s = s.replace(/\bfont-\['Inter'\]/g, "");
  s = s.replace(/\bfont-\["Inter"\]/g, "");
  s = s.replace(/\bfont-\[\\'Inter\\'\]/g, "");
  s = s.replace(/text-\[\d+(?:\.\d+)?px\]/g, "text-base");
  if (s !== orig) {
    fs.writeFileSync(file, s, "utf8");
    updated++;
  }
}
console.log("Archivos actualizados:", updated);
