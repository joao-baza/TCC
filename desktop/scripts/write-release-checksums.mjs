import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const releaseDir = path.resolve(scriptDir, "..", "release");
const releaseExtensions = new Set([".exe", ".dmg", ".AppImage"]);

for (const fileName of readdirSync(releaseDir)) {
  if (!releaseExtensions.has(path.extname(fileName))) {
    continue;
  }

  const filePath = path.join(releaseDir, fileName);
  const hash = createHash("sha256").update(readFileSync(filePath)).digest("hex");
  writeFileSync(`${filePath}.sha256`, `${hash}  ${fileName}\n`);
}

