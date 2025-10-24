import path from 'node:path';
export const ROOT_DIR = process.cwd();
export const TPL_DIR = path.join(ROOT_DIR, 'templates');
export function tplBase(id){ return path.join(TPL_DIR, id); }
export function tplIndexPath(){ return path.join(TPL_DIR, 'index.json'); }
