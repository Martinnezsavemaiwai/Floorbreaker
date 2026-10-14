// Zip a folder into a .zip that itch.io accepts (index.html at the root), with no tool beyond Node:
//   node scripts/zip.mjs dist floorbreaker-web.zip
// `tar -a` only writes zip with the Windows bsdtar; from Git Bash the GNU tar on PATH wrote a tar named .zip.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { deflateRawSync, crc32 } from 'node:zlib';

const [dir, out] = process.argv.slice(2);
if (!dir || !out) { console.error('usage: node scripts/zip.mjs <folder> <out.zip>'); process.exit(1); }
const files = [];
const walk = d => { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : files.push(p); } };
walk(dir);

const u16 = n => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
const u32 = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; };
const DOS_TIME = 0, DOS_DATE = (1 << 5) | 1; // 1980-01-01: fixed so the same build zips to the same bytes
const local = [], central = [];
let offset = 0;
for (const f of files) {
  const name = Buffer.from(relative(dir, f).split(sep).join('/'));
  const data = readFileSync(f), packed = deflateRawSync(data, { level: 9 });
  const [method, body] = packed.length < data.length ? [8, packed] : [0, data]; // png/mp3 barely shrink: store them
  const crc = crc32(data);
  const head = [u16(20), u16(0x0800), u16(method), u16(DOS_TIME), u16(DOS_DATE), u32(crc), u32(body.length), u32(data.length), u16(name.length), u16(0)];
  local.push(u32(0x04034b50), ...head, name, body);
  central.push(u32(0x02014b50), u16(20), ...head, u16(0), u16(0), u16(0), u32(0), u32(offset), name);
  offset += 30 + name.length + body.length;
}
const cd = Buffer.concat(central);
writeFileSync(out, Buffer.concat([...local, cd, u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cd.length), u32(offset), u16(0)]));
console.log(`${out}: ${files.length} files, ${(offset / 1e6).toFixed(2)} MB`);
