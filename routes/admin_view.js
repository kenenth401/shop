
import { Router } from 'express';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

const router = Router();
const TPL_DIR = path.join(process.cwd(), 'templates');
const INDEX_PATH = path.join(TPL_DIR, 'index.json');
const TYPES_PATH = path.join(TPL_DIR, 'types.json');

async function safeReadJSON(p, fallback) {
  try { return JSON.parse(await readFile(p, 'utf8')); }
  catch { return fallback; }
}

router.get('/templates', async (req, res, next) => {
  try {
    const typeId = req.query.typeId || null;
    const idx = await safeReadJSON(INDEX_PATH, []);
    const out = [];
    for (const t of idx) {
      if (typeId && t.typeId !== typeId) continue;
      const base = path.join(TPL_DIR, t.id);
      const meta = await safeReadJSON(path.join(base, 'meta.json'), {});
      const Q = await safeReadJSON(path.join(base, 'Q.json'), []);
      out.push({
        id: t.id,
        name: meta.name || t.name || t.id,
        lang_default: meta.lang_default || t.lang_default || 'zh',
        countQ: Array.isArray(Q) ? Q.length : 0,
        typeId: t.typeId || null
      });
    }
    res.json(out);
  } catch (e) { next(e); }
});

router.get('/templates/:id/detail', async (req, res) => {
  try {
    const id = req.params.id;
    const base = path.join(TPL_DIR, id);
    const meta = await safeReadJSON(path.join(base, 'meta.json'), {});
    const Q = await safeReadJSON(path.join(base, 'Q.json'), []);
    const WT = await safeReadJSON(path.join(base, 'WT.json'), {});
    const UI = await safeReadJSON(path.join(base, 'UI.json'), {});
    res.json({ id, meta, Q, WT, UI, name: meta.name || id });
  } catch (e) {
    res.status(500).json({ error: 'read_failed' });
  }
});

router.get('/types/:typeId/questions', async (req, res) => {
  const typeId = req.params.typeId;
  const idx = await safeReadJSON(INDEX_PATH, []);
  const list = idx.filter(t => t.typeId === typeId);
  const result = [];
  for (const t of list) {
    const base = path.join(TPL_DIR, t.id);
    const Q = await safeReadJSON(path.join(base, 'Q.json'), []);
    const meta = await safeReadJSON(path.join(base, 'meta.json'), {});
    const tagged = (Array.isArray(Q) ? Q : []).map((q, i) => ({ ...q, __template: t.id, __templateName: meta.name || t.id, __idx: i + 1 }));
    result.push(...tagged);
  }
  res.json({ typeId, countQ: result.length, Q: result });
});

router.get('/types', async (_req, res) => {
  res.json(await safeReadJSON(TYPES_PATH, []));
});

export default router;
