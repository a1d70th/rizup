import sharp from "sharp";
import fs from "fs";
import path from "path";

const SRC = path.resolve("public/logo-r.svg");
const OUT_DIR = path.resolve("public/icons");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const SIZES = [16, 32, 72, 96, 128, 144, 152, 167, 180, 192, 384, 512];
const BG = { r: 110, g: 203, b: 176, alpha: 1 };

async function makeIcon(size, filename) {
  await sharp(SRC, { density: 512 })
    .resize({ width: size, height: size, fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, filename));
  console.log(`✓ ${filename} (${size}×${size})`);
}

async function makeMaskable(size, filename) {
  // Maskable: safe zone 80%, add mint padding so the R doesn't get cut
  const inner = Math.round(size * 0.72);
  const resized = await sharp(SRC, { density: 512 })
    .resize({ width: inner, height: inner, fit: "cover" })
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, filename));
  console.log(`✓ ${filename} (${size}×${size}) maskable`);
}

await Promise.all([
  ...SIZES.map((s) => makeIcon(s, `icon-${s}.png`)),
  makeMaskable(192, "icon-maskable-192.png"),
  makeMaskable(512, "icon-maskable-512.png"),
  makeIcon(180, "apple-touch-icon.png"),
  makeIcon(32, "favicon-32.png"),
  makeIcon(16, "favicon-16.png"),
]);

console.log("\nAll PWA icons generated in public/icons/");
