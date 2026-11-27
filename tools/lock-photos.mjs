#!/usr/bin/env node
/* =====================================================================
   lock-photos — encrypts the private photos so they can live in a
   public repo. Only Himani (with the secret word) can see them.

   Usage (from the little-universe folder):
     node tools/lock-photos.mjs "your secret word"

   Reads every image in  private-photos/   (never committed, see .gitignore)
   Writes encrypted files to  assets/photos/locked/  (safe to publish)

   Encryption: AES-256-GCM, key from PBKDF2-SHA-256 (1,000,000 rounds) with
   a random salt. The browser does the same maths to decrypt (script.js,
   "PhotoLock"). The secret word is case-insensitive and ignores spaces at
   the ends. Re-run this any time you add photos or change the word.
   ===================================================================== */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto as crypto } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const inDir = join(root, 'private-photos');
const outDir = join(root, 'assets', 'photos', 'locked');
const ITER = 1000000;
const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };

const pass = process.argv[2];
if (!pass || pass.trim().length < 6) {
  console.error('Give a secret word of at least 6 characters:\n  node tools/lock-photos.mjs "our secret word"');
  process.exit(1);
}
if (!existsSync(inDir)) { console.error('No private-photos/ folder found.'); process.exit(1); }

const normalize = (s) => s.normalize('NFC').trim().toLowerCase();
const b64 = (u8) => Buffer.from(u8).toString('base64');

const salt = crypto.getRandomValues(new Uint8Array(16));
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(normalize(pass)), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
async function seal(bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
  return out;
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const files = {};
let n = 0;
for (const name of readdirSync(inDir).sort()) {
  const type = TYPES[extname(name).toLowerCase()];
  if (!type) continue;
  n++;
  const file = `p${String(n).padStart(2, '0')}.enc`; // file names don't reveal anything
  writeFileSync(join(outDir, file), await seal(readFileSync(join(inDir, name))));
  files[name] = { file, type };
}
const check = await seal(new TextEncoder().encode('little-universe'));
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify({ v: 1, kdf: 'PBKDF2-SHA-256', iter: ITER, salt: b64(salt), check: b64(check), files }, null, 2));
console.log(`Locked ${n} photo(s) into assets/photos/locked/. Share the secret word with Himani only.`);
