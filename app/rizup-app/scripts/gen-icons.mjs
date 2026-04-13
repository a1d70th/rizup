import sharp from "sharp";
import fs from "fs";
import path from "path";

const SRC = path.resolve("public/sho.png");
const OUT_DIR = path.resolve("public/icons");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const SIZES = [72, 96, 128, 144, 152, 167, 180, 192, 384, 512];
const BG = { r: 110, g: 203, b: 176, alpha: 1 };

async function makeSquare(size, filename, options = {}) {
  const { padding = 0.18, bg = BG } = options;
  const inner = Math.round(size * (1 - padding * 2));
  const resized = await sharp(SRC)
    .resize({ width: inner, height: inner, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bg,
    },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, filename));
  console.log(`✓ ${filename} (${size}×${size})`);
}

async function makeMaskable(size, filename) {
  // Maskable は safe-zone 40% 中心。padding を大きめに
  await makeSquare(size, filename, { padding: 0.22 });
}

await Promise.all([
  ...SIZES.map((s) => makeSquare(s, `icon-${s}.png`)),
  makeMaskable(192, "icon-maskable-192.png"),
  makeMaskable(512, "icon-maskable-512.png"),
  makeSquare(180, "apple-touch-icon.png", { padding: 0.15 }),
  makeSquare(32, "favicon-32.png", { padding: 0.1 }),
  makeSquare(16, "favicon-16.png", { padding: 0.1 }),
]);

console.log("\nAll PWA icons generated in public/icons/");
