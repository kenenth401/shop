// src/lib/htmlExtractor.js
// Merged extractor (v3)
import { parse } from 'node-html-parser';
import vm from 'node:vm';

const norm = (s='') => String(s).replace(/\s+/g, ' ').trim();
const tryJSON = s => { try { return JSON.parse(s); } catch { return null; } };
const safeVM = (code, inject={}) => {
  const sandbox = Object.create(null);
  Object.assign(sandbox, inject);
  return vm.runInNewContext(code, sandbox, { timeout: 80 });
};

function sliceLiteral(src, startIdx){
  const open = src[startIdx];
  const close = open === '[' ? ']' : open === '{' ? '}' : null;
  if(!close) return null;
  let i=startIdx, depth=0, inStr=false, q='', esc=false;
  while(i<src.length){
    const ch=src[i];
    if(inStr){
      if(esc) esc=false;
      else if(ch==='\\') esc=true;
      else if(ch===q) inStr=false;
    } else {
      if(ch==='"'||ch==="'"||ch==='`'){ inStr=true; q=ch; }
      else if(ch===open){ depth++; }
      else if(ch===close){ depth--; if(depth===0) return src.slice(startIdx,i+1); }
    }
    i++;
  }
  return null;
}
function extractVarLiteral(src, varName){
  const re = new RegExp(String.raw`\b(var|let|const)\s+${varName}\s*=`, 'm');
  const m = re.exec(src);
  if(!m) return null;
  let i = m.index + m[0].length;
  while(i < src.length && /\s/.test(src[i])) i++;
  while(i < src.length && src[i] !== '[' && src[i] !== '{') i++;
  if(i >= src.length) return null;
  return sliceLiteral(src, i);
}
function evalLiteral(lit, varName){
  if(!lit) return undefined;
  const code = `${varName} = ${lit}; ${varName};`;
  return safeVM(code, {});
}

function fromScriptTemplate(root){
  const node = root.querySelector('script#TEMPLATE');
  if(!node) return null;
  const json = tryJSON(node.text);
  if (json && Array.isArray(json.Q)) {
    return { 
      Q: json.Q, 
      WT: json.WT||{}, 
      UI: json.UI||{}, 
      meta: json.meta||{},
      rules: json.rules||{},
      products: json.products||[]
    };
  }
  return null;
}
function fromAnyScriptJSON(root){
  for(const s of root.querySelectorAll('script')){
    const txt = s.text || '';
    if (!/\"Q\"\s*:\s*\[/.test(txt)) continue;
    const m = txt.match(/\{[\s\S]*\}/);
    const obj = m && tryJSON(m[0]);
    if (obj && Array.isArray(obj.Q)) {
      return { 
        Q: obj.Q, 
        WT: obj.WT||{}, 
        UI: obj.UI||{}, 
        meta: obj.meta||{},
        rules: obj.rules||{},
        products: obj.products||[]
      };
    }
  }
  return null;
}
function fromVarAssignments(root){
  for(const s of root.querySelectorAll('script')){
    const src = s.text || '';
    if(!src) continue;
    const qLit = extractVarLiteral(src, 'Q');
    const wtLit = extractVarLiteral(src, 'WT');
    const uiLit = extractVarLiteral(src, 'UI');
    const rulesLit = extractVarLiteral(src, 'rules');
    const productsLit = extractVarLiteral(src, 'products');
    let Q, WT, UI, rules, products;
    try { Q = evalLiteral(qLit, 'Q'); } catch {}
    try { WT = evalLiteral(wtLit, 'WT'); } catch {}
    try { UI = evalLiteral(uiLit, 'UI'); } catch {}
    try { rules = evalLiteral(rulesLit, 'rules'); } catch {}
    try { products = evalLiteral(productsLit, 'products'); } catch {}
    if (Array.isArray(Q)) return { Q, WT: WT||{}, UI: UI||{}, meta: {}, rules: rules||{}, products: products||[] };
  }
  return null;
}
function fromConstQUESTIONS(root){
  for(const s of root.querySelectorAll('script')){
    const src = s.text || '';
    const lit = extractVarLiteral(src, 'QUESTIONS');
    if(!lit) continue;
    let data;
    try { data = evalLiteral(lit, 'QUESTIONS'); } catch {}
    if (!Array.isArray(data) || !data.length) continue;

    const Q = []; const WT = {};
    data.forEach((q, i) => {
      const key = q.key || `q_${i+1}`;
      const title = (typeof q.title === 'string') ? q.title : (q.title?.zh || q.title?.en || key);
      const type = (q.type === 'multi' || q.type === 'checkbox') ? 'multi' : 'single';
      const opts = (q.options||q.opts||[]).map(op => {
        const label = op.label || op.text || String(op.value);
        const value = op.value != null ? String(op.value) : String(label);
        if (op.scores && typeof op.scores === 'object'){
          for (const dim of Object.keys(op.scores)){
            WT[dim] = WT[dim] || {};
            WT[dim][key] = WT[dim][key] || {};
            WT[dim][key][value] = Number(op.scores[dim]) || 0;
          }
        }
        return [value, label];
      });
      Q.push({ key, type, title: { zh: title }, opts });
    });
    if (Q.length) return { Q, WT, UI:{}, meta:{}, rules:{}, products:[] };
  }
  return null;
}
function fromConstQT_SC(root){
  for(const s of root.querySelectorAll('script')){
    const src = s.text || '';
    const qtLit = extractVarLiteral(src, 'QT');
    if(!qtLit) continue;
    let QT; try { QT = evalLiteral(qtLit, 'QT'); } catch {}
    if (!Array.isArray(QT) || !QT.length) continue;

    let SC = null; const scLit = extractVarLiteral(src, 'SC'); if (scLit) { try { SC = evalLiteral(scLit, 'SC'); } catch {} }
    let I18NQ = null; const i18nLit = extractVarLiteral(src, 'I18NQ'); if (i18nLit) { try { I18NQ = evalLiteral(i18nLit, 'I18NQ'); } catch {} }
    let I18NO = null; const i18noLit = extractVarLiteral(src, 'I18NO'); if (i18noLit) { try { I18NO = evalLiteral(i18noLit, 'I18NO'); } catch {} }
    const zhQ = (I18NQ && (I18NQ.zh || I18NQ['zh-CN'])) || {};
    const zhO = (I18NO && (I18NO.zh || I18NO['zh-CN'])) || {};

    const Q = QT.map((row, i) => {
      const key = String(row[0] || `q_${i+1}`);
      const values = Array.isArray(row[1]) ? row[1] : [];
      const multi = row[2] === 'multi';
      const type = multi ? 'multi' : 'single';
      const title = zhQ[key] || key;
      const opts = values.map(v => [String(v), zhO[String(v)] || String(v)]);
      return { key, type, title: { zh: title }, opts };
    });

    const WT = {};
    if (SC && typeof SC === 'object'){
      Object.keys(SC).forEach(qk => {
        const optMap = SC[qk] || {};
        Object.keys(optMap).forEach(val => {
          const dims = optMap[val] || {};
          Object.keys(dims).forEach(dim => {
            WT[dim] = WT[dim] || {};
            WT[dim][qk] = WT[dim][qk] || {};
            WT[dim][qk][String(val)] = Number(dims[dim]) || 0;
          });
        });
      });
    }

    if (Q.length) return { Q, WT, UI:{}, meta:{}, rules:{}, products:[] };
  }
  return null;
}
function fromQuestionBlocks(root){
  const blocks = root.querySelectorAll('.question,[data-q],[data-q-key]');
  const Q = [];
  for (const b of blocks){
    const key = b.getAttribute('data-key') || b.getAttribute('data-q-key') || b.getAttribute('data-q') || '';
    const titleNode = b.querySelector('.title,.q,.question-title,h3,h4');
    const title = norm(titleNode?.textContent || '');
    const items = b.querySelectorAll('li,[data-value],.option');
    const opts = [];
    items.forEach((li, i) => {
      const v = li.getAttribute('data-value') || li.getAttribute('value') || String(i+1);
      const t = norm(li.textContent || '');
      if (t) opts.push([v, t]);
    });
    if ((key || title) && opts.length){
      Q.push({ key: key || `q_${Q.length+1}`, type:'single', title:{ zh: title || key }, opts });
    }
  }
  return Q.length ? { Q, WT:{}, UI:{}, meta:{}, rules:{}, products:[] } : null;
}
function fromRadioGroups(root){
  const inputs = root.querySelectorAll('input[type=radio],input[type=checkbox]');
  if (!inputs.length) return null;
  const byName = new Map();
  inputs.forEach(inp => {
    const name = inp.getAttribute('name') || inp.getAttribute('data-name') || '';
    if(!name) return;
    if(!byName.has(name)) byName.set(name, []);
    byName.get(name).push(inp);
  });
  if (!byName.size) return null;

  const Q = [];
  for (const [name, arr] of byName){
    let title = '';
    let cur = arr[0].parentNode;
    for (let i=0; i<4 && cur; i++){
      const tn = cur.querySelector?.('.q,.question-title,h3,h4');
      if (tn){ title = norm(tn.textContent); break; }
      cur = cur.parentNode;
    }
    if (!title) title = name;

    const isMulti = arr[0].getAttribute('type') === 'checkbox';
    const opts = [];
    for (const inp of arr){
      const value = inp.getAttribute('value') || String(opts.length+1);
      let txt = '';
      const p = inp.parentNode;
      if (p?.tagName?.toLowerCase()==='label'){
        txt = norm(p.textContent || '');
      } else {
        const id = inp.getAttribute('id');
        if (id){
          const lf = root.querySelector(`label[for="${id}"]`);
          if (lf) txt = norm(lf.textContent||'');
        }
        if(!txt && inp.nextSibling && typeof inp.nextSibling.text === 'string'){
          txt = norm(inp.nextSibling.text);
        }
      }
      txt = txt.replace(/^[A-Da-d]\s*[、.．．]\s*/, '').trim() || value;
      opts.push([value, txt]);
    }
      Q.push({ key:name, type: isMulti ? 'multi' : 'single', title:{ zh:title }, opts });
    }
    return Q.length ? { Q, WT:{}, UI:{}, meta:{}, rules:{}, products:[] } : null;
}
function metaFromDOM(root){
  const title = norm(root.querySelector('title')?.textContent || '');
  const langAttr = root.querySelector('html')?.getAttribute('lang') || root.getAttribute('lang') || 'zh';
  const chinese = title.replace(/.*?·\s*/, '').replace(/\s*[-|｜].*$/, '').trim() || title || '未命名模板';
  return { name: chinese, lang_default: /^zh/i.test(langAttr) ? 'zh' : (langAttr.split('-')[0] || 'zh') };
}

export function extractFromHTML(html){
  const root = parse(html);
  const meta = metaFromDOM(root);
  const r = (
    fromScriptTemplate(root) ||
    fromVarAssignments(root) ||
    fromAnyScriptJSON(root) ||
    fromConstQUESTIONS(root) ||
    fromConstQT_SC(root) ||
    fromQuestionBlocks(root) ||
    fromRadioGroups(root) ||
    { Q:[], WT:{}, UI:{}, meta:{}, rules:{}, products:[] }
  );
  r.meta = Object.assign({}, r.meta||{}, meta);
  return r;
}
