import { promises as fs } from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve('data');

async function ensureFile(p, initData) {
  try { await fs.access(p); }
  catch {
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, JSON.stringify(initData ?? (Array.isArray(initData)?[]:{}), null, 2), 'utf8');
  }
}

export async function readJSON(relPath, fallback = null) {
  const file = path.join(DATA_DIR, relPath);
  await ensureFile(file, fallback ?? []);
  const txt = await fs.readFile(file, 'utf8');
  try { return JSON.parse(txt); } catch { return fallback; }
}

export async function writeJSON(relPath, data) {
  const file = path.join(DATA_DIR, relPath);
  await ensureFile(file, Array.isArray(data) ? [] : {});
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
  return true;
}

export const paths = {
  templatesDir: (...segs) => path.join(DATA_DIR, 'templates', ...segs),
};