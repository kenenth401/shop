// src/routes/admin.js
import { Router } from 'express';
import path from 'node:path';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { extractFromHTML } from '../lib/htmlExtractor.js';

const router = Router()
const TPL_DIR = path.join(process.cwd(), 'templates');
const INDEX_PATH = path.join(TPL_DIR, 'index.json');

async function safeReadJSON(p, fallback) {
  try { return JSON.parse(await readFile(p, 'utf8')); }
  catch { return fallback; }
}

router.post('/templates/import-html', async (req, res) => {
  try {
    const { html, id, name, typeId } = req.body || {};
    if (!html || typeof html !== 'string') {
      return res.status(400).json({ error: 'missing_html' });
    }
    const tplId = (id && String(id).trim()) || ('tpl_' + Date.now());
    const base = path.join(TPL_DIR, tplId);
    await mkdir(base, { recursive: true });

    const { Q, WT, UI, meta } = extractFromHTML(html);
    const metaMerged = {
      id: tplId,
      name: (typeof name === 'string' && name.trim()) ? name.trim() : (meta?.name || tplId),
      lang_default: meta?.lang_default || 'zh'
    };

    await Promise.all([
      writeFile(path.join(base, 'Q.json'), JSON.stringify(Q || [], null, 2), 'utf8'),
      writeFile(path.join(base, 'WT.json'), JSON.stringify(WT || {}, null, 2), 'utf8'),
      writeFile(path.join(base, 'UI.json'), JSON.stringify(UI || {}, null, 2), 'utf8'),
      writeFile(path.join(base, 'meta.json'), JSON.stringify(metaMerged, null, 2), 'utf8'),
    ]);

    const idx = await safeReadJSON(INDEX_PATH, []);
    const countQ = Array.isArray(Q) ? Q.length : 0;
    const existed = idx.find(x => x.id === tplId);
    if (existed) {
      existed.name = metaMerged.name;
      existed.lang_default = metaMerged.lang_default;
      existed.countQ = countQ;
      existed.typeId = typeId || existed.typeId || null;
    } else {
      idx.push({ id: tplId, name: metaMerged.name, lang_default: metaMerged.lang_default, countQ, typeId: typeId || null });
    }
    await writeFile(INDEX_PATH, JSON.stringify(idx, null, 2), 'utf8');

    res.json({ template_id: tplId, counts: { Q: countQ }, typeId: typeId || null });
  } catch (e) {
    console.error('[import-html] failed:', e);
    res.status(500).json({ error: 'import_failed' });
  }
});

export default router;
