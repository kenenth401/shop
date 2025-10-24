import vm from 'node:vm';
import { JSDOM } from 'jsdom';

export function extractFromHTML(htmlText) {
  const dom = new JSDOM(htmlText);
  const doc = dom.window.document;
  const scripts = [...doc.querySelectorAll('script')].map(s => s.textContent).join('\n');
  const context = { window:{}, document:{}, navigator:{}, console };
  vm.createContext(context);
  try { vm.runInContext(scripts, context, { timeout: 2000 }); } catch (e) { /* ignore */ }
  const Q = context.Q || [];
  const WT = context.WT || {};
  const UI = context.UI || {};
  return { Q, WT, UI };
}