import { writeFile, mkdir } from 'node:fs/promises';
import { buildHTML } from '../src/lib/builder.js';

const args = Object.fromEntries(process.argv.slice(2).map((s,i,arr)=>{
  if (s.startsWith('--')) {
    const k = s.replace(/^--/,''); const v = (arr[i+1] && !arr[i+1].startsWith('--')) ? arr[i+1] : true;
    return [k, v];
  }
  return [null,null];
}).filter(Boolean));

const payload = {
  template_id: args.template || 'postpartum_pro_v2',
  lang: args.lang || 'zh',
  random_count: Number(args.random || 0),
  shop: args.shop ? { qr: args.shop } : {}
};

const html = await buildHTML(payload);
await mkdir('out', { recursive: true });
const fn = `out/survey_${payload.template_id}.html`;
await writeFile(fn, html, 'utf8');
console.log('Built:', fn);