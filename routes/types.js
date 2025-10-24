// src/routes/types.js
import { Router } from 'express';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const router = Router();
const TPL_DIR = path.join(process.cwd(), 'templates');
const TYPES_PATH = path.join(TPL_DIR, 'types.json');
const INDEX_PATH = path.join(TPL_DIR, 'index.json');

async function safeReadJSON(p, fallback) {
  try { return JSON.parse(await readFile(p, 'utf8')); }
  catch { return fallback; }
}
async function saveJSON(p, data) {
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(data, null, 2), 'utf8');
}

router.get('/types', async (_req, res) => {
  res.json(await safeReadJSON(TYPES_PATH, []));
});

router.post('/types', async (req, res) => {
  const { id, name } = req.body || {};
  if (!id || !name) return res.status(400).json({ error: 'missing_id_or_name' });
  const list = await safeReadJSON(TYPES_PATH, []);
  if (list.find(x => x.id === id)) return res.status(409).json({ error: 'type_exists' });
  list.push({ id, name });
  await saveJSON(TYPES_PATH, list);
  res.json({ ok: true });
});

router.put('/types/:id', async (req, res) => {
  const { name } = req.body || {};
  const id = req.params.id;
  const list = await safeReadJSON(TYPES_PATH, []);
  const item = list.find(x => x.id === id);
  if (!item) return res.status(404).json({ error: 'not_found' });
  if (name) item.name = name;
  await saveJSON(TYPES_PATH, list);
  res.json({ ok: true });
});

router.delete('/types/:id', async (req, res) => {
  const id = req.params.id;
  let list = await safeReadJSON(TYPES_PATH, []);
  const before = list.length;
  list = list.filter(x => x.id !== id);
  if (list.length === before) return res.status(404).json({ error: 'not_found' });
  await saveJSON(TYPES_PATH, list);

  const idx = await safeReadJSON(INDEX_PATH, []);
  idx.forEach(t => { if (t.typeId === id) t.typeId = null; });
  await saveJSON(INDEX_PATH, idx);
  res.json({ ok: true });
});

router.post('/templates/:tplId/type', async (req, res) => {
  const tplId = req.params.tplId;
  const { typeId } = req.body || {};
  const types = await safeReadJSON(TYPES_PATH, []);
  if (typeId && !types.find(t => t.id === typeId)) {
    return res.status(400).json({ error: 'type_not_exist' });
  }
  const idx = await safeReadJSON(INDEX_PATH, []);
  const it = idx.find(x => x.id === tplId);
  if (!it) return res.status(404).json({ error: 'template_not_found' });
  it.typeId = typeId || null;
  await saveJSON(INDEX_PATH, idx);
  res.json({ ok: true });
});

export default router;
