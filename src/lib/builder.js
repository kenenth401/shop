import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readJSON } from './jsonStore.js';

function selectQuestions(Q, { questionKeys = [], randomCount = 0 }) {
  if (questionKeys?.length) return Q.filter(q => q.key.includes ? questionKeys.includes(q.key) : false);
  if (randomCount > 0) return [...Q].sort(()=>Math.random()-0.5).slice(0, Math.min(randomCount, Q.length));
  return Q;
}

function pickProductsForRules(rules, all) {
  const ids = new Set((rules?.recommendations || []).map(r => r.product?.code).filter(Boolean));
  return all.filter(p => ids.has(p.id) && p.active !== false);
}

async function htmlShell() {
  const abs = path.resolve('src/lib/shell.html');
  return await fs.readFile(abs, 'utf8');
}

export async function buildHTML({ template_id, lang='zh', question_keys=[], random_count=0, shop={}, theme = {} }){
  if (!template_id || typeof template_id !== 'string') {
    throw new Error('template_id_required');
  }
  const [Q, WT, UI, meta, rules] = await Promise.all([
    readJSON(path.join('templates', template_id, 'Q.json'), []),
    readJSON(path.join('templates', template_id, 'WT.json'), {}),
    readJSON(path.join('templates', template_id, 'UI.json'), {}),
    readJSON(path.join('templates', template_id, 'meta.json'), { id: template_id, name: template_id, lang_default: lang }),
    readJSON(path.join('templates', template_id, 'rules.json'), { conclusions:[], recommendations:[] })
  ]);
  const productsAll = await readJSON('products.json', []);
  const selectedQ = selectQuestions(Q, { questionKeys: question_keys, randomCount: random_count });
  const selectedProducts = pickProductsForRules(rules, productsAll);

  const templateJSON = {
    meta, Q: selectedQ, WT, UI, rules,
    products: selectedProducts,
    shop: { qr: shop?.qr || '' },
    theme
  };

  const shell = await htmlShell();
  return shell.replace('{{TEMPLATE_JSON}}', JSON.stringify(templateJSON));
}
