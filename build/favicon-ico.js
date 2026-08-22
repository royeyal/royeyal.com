/*
 * Packs the rendered 16/32/48 PNGs into public/favicon.ico.
 *
 * WHY A .ico AT ALL, when index.html already declares an SVG and a PNG:
 * /favicon.ico is the path a client asks for when it has NOT parsed the
 * HTML — and several of the consumers that matter here never do. It was
 * a 404 on this site until this script existed.
 *
 * An .ico is a container, not a codec. Each frame here is a whole PNG
 * stored verbatim (the "PNG-compressed" form every browser since IE11
 * reads), so this script copies bytes and writes an index — it does no
 * image encoding of its own and has no dependencies.
 *
 * Regenerate the source PNGs first; the header of docs/favicon-source.html
 * has the Chrome command and explains why the sizes are downscaled from
 * one large render rather than rendered directly (headless Chrome will
 * not open a window as small as 16px, and silently returns a crop of a
 * larger one instead).
 *
 * Then, from the repo root:
 *
 *   node build/favicon-ico.js
 *
 * This is deliberately NOT wired into `npm run build`. The icons change
 * on a rebrand and never otherwise, and a Vite plugin that reads five
 * files on every build to produce a byte-identical output is cost with
 * no benefit.
 */
import { readFileSync, writeFileSync } from 'node:fs';

/* 16 and 32 are the browser-tab and bookmark sizes; 48 is the one Google
   documents as the floor for a favicon it will render in search. Larger
   frames are deliberately left out — they belong in the PNG files that
   index.html points at, and every kilobyte here is paid on a request
   that happens before the HTML is parsed. */
const SIZES = [16, 32, 48];
const SRC = (size) => `/tmp/icon-${size}.png`;
const OUT = 'public/favicon.ico';

const frames = SIZES.map((size) => ({ size, data: readFileSync(SRC(size)) }));

const HEADER = 6;
const ENTRY = 16;
const header = Buffer.alloc(HEADER);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // 1 = icon (2 would be a cursor)
header.writeUInt16LE(frames.length, 4);

/* Every frame's byte offset is measured from the start of the FILE, so
   the directory has to be sized before any of them can be written. */
let offset = HEADER + ENTRY * frames.length;

const directory = frames.map(({ size, data }) => {
  const entry = Buffer.alloc(ENTRY);
  // 0 means 256 in this field; nothing here is that big, but the rule is
  // why the format cannot describe a 512px frame at all.
  entry.writeUInt8(size === 256 ? 0 : size, 0);
  entry.writeUInt8(size === 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2); // palette size: 0 = not paletted
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(data.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += data.length;
  return entry;
});

writeFileSync(
  OUT,
  Buffer.concat([header, ...directory, ...frames.map((f) => f.data)])
);

console.log(
  `favicon.ico: ${frames.length} frames (${SIZES.join(', ')}px), ` +
    `${(offset / 1024).toFixed(1)} kB`
);
