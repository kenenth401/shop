// H5问卷生成器 - 使用现有的shell.html模板
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function generateSurveyHTML(questions, typeName, count, UI = {}, WT = {}, rules = {}, products = [], shopQR = '') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const surveyId = `survey_${timestamp}`;
  
  // 清理题目中的序号信息，重新从1开始编号
  const cleanQuestions = questions.map((q, index) => {
    const title = q.title || {};
    // 如果 title 是对象，清理所有语言版本
    if (typeof title === 'object') {
      const cleanedTitle = {};
      Object.keys(title).forEach(lang => {
        let text = title[lang];
        // 移除开头类似 "1. ", "2. ", "3. " 等序号
        if (typeof text === 'string') {
          text = text.replace(/^\d+\.\s*/, '');
          text = text.replace(/^第\s*\d+\s*题[：:]\s*/, '');
          text = text.replace(/^\(\d+\)\s*/, '');
        }
        cleanedTitle[lang] = text;
      });
      return { ...q, title: cleanedTitle };
    }
    // 如果 title 是字符串，也清理
    if (typeof title === 'string') {
      const text = title.replace(/^\d+\.\s*/, '').replace(/^第\s*\d+\s*题[：:]\s*/, '').replace(/^\(\d+\)\s*/, '');
      return { ...q, title: text };
    }
    return q;
  });
  
  // 构建完整的模板数据
  const templateData = {
    Q: cleanQuestions,
    WT: WT || {}, // 使用传入的权重表
    UI: UI || {
      zh: {
        prev: "上一步",
        next: "下一步", 
        submit: "提交问卷",
        needQ: "请先选择本题答案"
      }
    },
    meta: {
      title: typeName, // 使用类型名称作为标题
      name: typeName,
      lang_default: 'zh'
    },
    rules: rules || {}, // 使用传入的结论和推荐规则
    products: products || [], // 使用传入的店铺或产品信息
    shop: { qr: shopQR || '' } // 使用传入的店铺二维码
  };
  
  // 使用与导入模板相同的完整结构
  const html = `<!doctype html>
<html lang="zh">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${typeName}</title>
  <style>
    :root{--brand:#2B77F2;--bg:#f7f8fa;--text:#1a1a1a;--muted:#667085;--card:#fff}
    body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;background:var(--bg);color:var(--text)}
    .header{background:var(--card);padding:16px 24px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between}
    .header-left{display:flex;align-items:center;gap:12px}
    .logo{width:48px;height:48px;background:linear-gradient(135deg,#20b2aa,#17a2b8);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:bold}
    .header-titles{}
    .header-title{font-size:18px;font-weight:bold;color:var(--text);margin:0}
    .header-subtitle{font-size:13px;color:var(--muted);margin:0}
    .header-lang{display:flex;align-items:center;gap:8px;font-size:14px}
    .lang-select{border:1px solid #e5e7eb;border-radius:8px;padding:6px 12px;background:var(--card);cursor:pointer;display:flex;align-items:center;gap:8px}
    .wrap{max-width:820px;margin:0 auto;padding:24px}
    .card{background:var(--card);border-radius:16px;box-shadow:0 2px 10px rgba(0,0,0,.06);padding:20px;margin-bottom:16px}
    h1{font-size:24px;margin:8px 0 16px}
    .title{display:flex;gap:12px;align-items:center}
    .progress{height:8px;background:#e5e7eb;border-radius:6px;overflow:hidden;margin:8px 0 16px}
    .progress>div{height:100%;background:var(--brand);width:0%}
    .q{margin:12px 0 8px;font-weight:600}
    .opts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 16px}
    .opt{border:1px solid #e5e7eb;border-radius:12px;padding:10px 12px;cursor:pointer;user-select:none}
    .opt input{margin-right:8px}
    .actions{display:flex;gap:10px;justify-content:space-between;margin-top:8px}
    button{border:0;border-radius:12px;padding:10px 16px;cursor:pointer;background:var(--brand);color:#fff;font-weight:600}
    button.ghost{background:#eef2ff;color:#1f2a44}
    .muted{color:var(--muted);font-size:12px}
    .qrbox{display:flex;gap:16px;align-items:center;padding:12px;border:1px dashed #cbd5e1;border-radius:12px;background:#f8fafc}
    .result h2{margin:8px 0 12px}
    .pill{background:#eef2ff;border-radius:999px;padding:6px 10px;font-weight:600}
    .dim-scores{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}
    .print{position:fixed;right:16px;bottom:16px;background:#111827;color:#fff;border:0;border-radius:999px;padding:12px 16px;cursor:pointer}
    .footer{text-align:center;padding:24px;color:var(--muted);font-size:13px}
    .hidden{display:none}
    @media print{.print,.actions,.progress,.header,.footer{display:none!important}body{background:#fff}.card{box-shadow:none;border:1px solid #eee}}
  </style>
</head>
<body>
  <!-- 头部 -->
  <div class="header">
    <div class="header-left">
      <div class="logo">健</div>
      <div class="header-titles">
        <div class="header-title">小林健康研究所</div>
        <div class="header-subtitle">` + (UI.zh?.subA || typeName + ' 专业评估') + `</div>
      </div>
    </div>
    <div class="header-lang">
      <span>语言:</span>
      <div class="lang-select">
        <span id="currentLang">简体中文</span>
        <span>▼</span>
      </div>
    </div>
  </div>

  <div class="wrap">
    <div class="card">
      <div class="title"><h1 id="surveyTitle">` + typeName + `</h1></div>
      <div class="progress"><div id="bar"></div></div>
      <div id="step"></div>
      <div class="actions">
        <button class="ghost" id="prevBtn">上一步</button>
        <button id="nextBtn">下一步</button>
      </div>
      <div class="muted" id="footnote"></div>
    </div>

    <div class="card result hidden" id="resultCard">
      <h2>评估结果</h2>
      <div id="severity" class="pill"></div>
      <div class="dim-scores" id="dimScores"></div>
      <div id="conclusions"></div>
      <div id="reco"></div>

      <h3>到店/联系店铺</h3>
      <div class="qrbox">
        <div id="qrcode"></div>
        <div>
          <div>请使用微信/相机扫码</div>
          <div class="muted" id="qrHint"></div>
        </div>
      </div>
    </div>
  </div>

  <button class="print" onclick="window.print()">打印/保存PDF</button>

  <!-- 模板数据 -->
  <script type="application/json" id="TEMPLATE">${JSON.stringify(templateData)}</script>

  <!-- 超轻量 qrcode.js -->
  <script>
  !function(){function n(n){this.mode=4,this.data=n}function t(t,e){this.typeNumber=t,this.errorCorrectLevel=e,this.modules=null,this.moduleCount=0,this.dataCache=null,this.dataList=[]}function e(n,t){this.totalCount=n,this.dataCount=t}function r(){this.buffer=[],this.length=0}var o={};n.prototype={getLength:function(){return this.data.length},write:function(n){for(var t=0;t<this.data.length;t++)n.put(this.data.charCodeAt(t),8)}},t.prototype={addData:function(t){this.dataList.push(new n(t)),this.dataCache=null},isDark:function(n,t){if(n<0||this.moduleCount<=n||t<0||this.moduleCount<=t)throw new Error(n+","+t);return this.modules[n][t]},getModuleCount:function(){return this.moduleCount},make:function(){this.makeImpl(!1,this.getBestMaskPattern())},makeImpl:function(n,e){this.moduleCount=4*this.typeNumber+17,this.modules=new Array(this.moduleCount);for(var r=0;r<this.moduleCount;r++){this.modules[r]=new Array(this.moduleCount);for(var o=0;o<this.moduleCount;o++)this.modules[r][o]=null}this.setupPositionProbePattern(0,0),this.setupPositionProbePattern(this.moduleCount-7,0),this.setupPositionProbePattern(0,this.moduleCount-7),this.setupTimingPattern(),this.setupTypeInfo(n,e),null==this.dataCache&&(this.dataCache=t.createData(this.typeNumber,this.errorCorrectLevel,this.dataList)),this.mapData(this.dataCache,e)},setupPositionProbePattern:function(n,t){for(var e=-1;e<=7;e++)if(!(n+e<=-1||this.moduleCount<=n+e))for(var r=-1;r<=7;r++)t+r<=-1||this.moduleCount<=t+r||(this.modules[n+e][t+r]=e>=0&&e<=6&&(0==r||6==r)||r>=0&&r<=6&&(0==e||6==e)||e>=2&&e<=4&&r>=2&&r<=4)},getBestMaskPattern:function(){for(var n=0,e=0,r=0;r<8;r++){this.makeImpl(!0,r);var o=i.getLostPoint(this);(0==r||n>o)&&(n=o,e=r)}return e},setupTimingPattern:function(){for(var n=8;n<this.moduleCount-8;n++)null==this.modules[n][6]&&(this.modules[n][6]=n%2==0);for(var t=8;t<this.moduleCount-8;t++)null==this.modules[6][t]&&(this.modules[6][t]=t%2==0)},setupTypeInfo:function(n,t){for(var e=0;e<15;e++){var r=!n&&1==(u>>e&1);e<6?this.modules[e][8]=r:e<8?this.modules[e+1][8]=r:this.modules[this.moduleCount-15+e][8]=r}for(e=0;e<15;e++){r=!n&&1==(u>>e&1);e<8?this.modules[8][this.moduleCount-15+e]=r:e<9?this.modules[8][e-8]=r:this.modules[8][e-8+1]=r}this.modules[8][this.moduleCount-8]=!n},mapData:function(n,t){for(var e=0,r=this.moduleCount-1,o=this.moduleCount-1;o>0)o-=2)for(6==o&&o--;;){for(var i=0;i<2;i++)if(null==this.modules[r][o-i]){var u=!1;e<n.length&&(u=1==(n[e]>>>7&1),n[e]<<=1),this.modules[r][o-i]=s(r,o-i)?!u:u}if((r+=u?-1:1)<0||this.moduleCount<=r){r-=u?-1:1;break}}}};var i={getLostPoint:function(n){for(var t=n.getModuleCount(),e=0,r=0;r<t;r++)for(var o=0;o<t;o++){for(var i=0,u=n.isDark(r,o),a=-1;a<=1;a++)if(!(r+a<0||t<=r+a))for(var f=-1;f<=1;f++)o+f<0||t<=o+f||0==a&&0==f||u==n.isDark(r+a,o+f)&&i++;i>5&&(e+=3+i-5)}return e}},u=(1<<0)+(0<<3)+(3<<0)+(2<<0);window.QRCode=t}();
  </script>

  <!-- 业务脚本 -->
  <script>
  const tpl = JSON.parse(document.getElementById('TEMPLATE').textContent);
  if (tpl.theme && tpl.theme.brand) document.documentElement.style.setProperty('--brand', tpl.theme.brand);

  const state = {
    idx: 0,
    answers: {},
    items: tpl.Q,
    WT: tpl.WT,
    rules: tpl.rules || { conclusions:[], recommendations:[] },
    lang: tpl.meta?.lang_default || 'zh',
    products: tpl.products || []
  };

  const $ = s => document.querySelector(s);
  const elStep = $('#step'), elBar = $('#bar'), prevBtn = $('#prevBtn'), nextBtn = $('#nextBtn'),
        resultCard = $('#resultCard'), sevEl = $('#severity'), dimBox = $('#dimScores'),
        conclEl = $('#conclusions'), recoEl = $('#reco'), qrEl = $('#qrcode'), qrHint = $('#qrHint');

  function render(){
    const total = state.items.length, idx = state.idx;
    console.log('render called - total:', total, 'idx:', idx, 'items:', state.items);
    elBar.style.width = (idx/total*100)+'%';
    if (idx >= total){
      document.querySelector('.actions').classList.add('hidden');
      $('#footnote').classList.add('hidden');
      $('#surveyTitle').textContent = '结果';
      elStep.innerHTML = '<div class="muted" style="height:40px">已完成问卷，正在生成结果...</div>';
      return setTimeout(generateResult, 50);
    }
    document.querySelector('.actions').classList.remove('hidden');
    $('#footnote').classList.remove('hidden');
    $('#surveyTitle').textContent = '第 '+(idx+1)+' 题 / 共 '+total+' 题';

    const q = state.items[idx];
    const selected = state.answers[q.key]?.value || null;
    const opts = (q.opts||[]).map((pair,i)=>'<label class="opt"><input type="radio" name="q_'+i+'" value="'+pair[0]+'" '+(selected===pair[0]?'checked':'')+'/> '+pair[1]+'</label>').join('');
    elStep.innerHTML = '<div class="q">'+(q.title?.[state.lang]||q.title?.zh||'')+'</div><div class="opts">'+opts+'</div>';
    elStep.querySelectorAll('input[type=radio]').forEach(inp=>inp.addEventListener('change', e=>{
      state.answers[q.key] = { value: e.target.value };
    }));

    prevBtn.disabled = idx===0;
    nextBtn.textContent = (idx===total-1) ? (tpl.UI?.[state.lang]?.submit||'生成结果') : (tpl.UI?.[state.lang]?.next||'下一步');
  }

  prevBtn.addEventListener('click', ()=>{ if (state.idx>0){ state.idx--; render(); } });
  nextBtn.addEventListener('click', ()=>{ const q = state.items[state.idx]; if (!state.answers[q.key]){ alert('请先选择本题答案'); return; } state.idx++; render(); });

  function computeScores(answers,WT){
    const scores = Object.fromEntries(Object.keys(WT||{}).map(k=>[k,0]));
    for (const dim of Object.keys(WT||{})){
      const mapping = WT[dim];
      for (const qk of Object.keys(mapping)){
        const ans = answers[qk]; if (!ans) continue;
        const w = mapping[qk][ans.value]; if (typeof w==='number') scores[dim]+=w;
      }
    }
    return scores;
  }
  function severity(scores){
    const total = Object.values(scores).reduce((a,b)=>a+b,0);
    if (total>=10) return 'Ⅲ 建议尽快就医/专科评估';
    if (total>=5) return 'Ⅱ 需要重点关注';
    return 'Ⅰ 正常/轻度建议';
  }
  function mcond(ans,scores,c){
    if (!c) return false;
    if (c.all) return c.all.every(x=>mcond(ans,scores,x));
    if (c.any) return c.any.some(x=>mcond(ans,scores,x));
    if (c.not) return !mcond(ans,scores,c.not);
    if (c.dim){
      for (const k in c.dim){
        const val = Number(scores[k]||0);
        const m = String(c.dim[k]).match(/^([<>]=?|==)\s*(-?\d+(?:\.\d+)?)$/);
        if (!m) return false;
        const op = m[1], rhs = Number(m[2]);
        if (op==='>=' && !(val>=rhs)) return false;
        if (op==='>'  && !(val> rhs)) return false;
        if (op==='<=' && !(val<=rhs)) return false;
        if (op==='<'  && !(val< rhs)) return false;
        if (op==='==' && !(val==rhs)) return false;
      }
      return true;
    }
    if (c.q && 'v' in c){
      const a = ans[c.q]; return a && a.value===c.v;
    }
    return false;
  }
  function evaluateRules({answers,scores,rules,lang}){
    const out = { conclusions:[], reco:[] };
    (rules.conclusions||[]).forEach(c=>{ if (mcond(answers,scores,c.if)) out.conclusions.push(c.text?.[lang]||c.text?.zh||''); });
    (rules.recommendations||[]).forEach(r=>{ if (mcond(answers,scores,r.if)) out.reco.push({ code:r.product?.code, title:r.product?.title?.[lang]||r.product?.title?.zh||'' }); });
    return out;
  }
  function generateResult(){
    const scores = computeScores(state.answers, state.WT);
    const sev = severity(scores);
    
    // 获取维度名称
    const dimNames = tpl.UI?.[state.lang]?.dim || {};
    const sevNames = tpl.UI?.[state.lang]?.sev || {};
    
    // 找出主导问题（分数最高的维度）
    const sortedDims = Object.entries(scores).sort((a,b)=>b[1]-a[1]);
    const dominantDims = sortedDims.slice(0,2).map(([k,v])=>dimNames[k]||k).join('、');
    
    // 总体概述
    let sevText = sev;
    let overviewText = '优先处理主导问题，再进入巩固/维持期。';
    if (sev.includes('Ⅲ')) {
      overviewText = tpl.UI?.[state.lang]?.med || '当前存在就医红旗，建议尽快前往产科/乳腺/外科等门诊评估。';
    } else if (sev.includes('Ⅱ')) {
      overviewText = '主导: ' + dominantDims + '。' + (tpl.UI?.[state.lang]?.rec || '优先处理主导问题。');
    }
    
    // 1. 评估结果 - 总体概述
    const totalHTML = '<div style="padding:20px;background:#fff;border-radius:12px;margin-bottom:16px"><h2 style="margin:0 0 16px;font-size:22px;color:#1a1a1a">产后恢复评估报告</h2><div style="margin-bottom:12px"><strong>总体概述:</strong> ' + sevText + '; <strong>主导:</strong> ' + dominantDims + '。</div><div style="color:#667085;line-height:1.6">' + overviewText + '</div></div>';
    
    // 2. 分维度分析
    const dimAnalysisHTML = Object.entries(scores).map(([dim,score])=>{
      const name = dimNames[dim] || dim;
      let advice = '';
      if (score >= 5) {
        advice = name + '方面需要重点关注，建议采取积极干预措施。监测相关指标，必要时就医。';
      } else if (score >= 2) {
        advice = name + '方面需要保持关注，建议持续监测，保持良好习惯。';
      } else {
        advice = name + '方面情况良好，稳定。';
      }
      return '<div style="margin-bottom:8px"><strong>' + name + ' (' + dim + '):</strong> ' + advice + '</div>';
    }).join('');
    
    const dimSectionHTML = '<div style="padding:20px;background:#fff;border-radius:12px;margin-bottom:16px"><h3 style="margin:0 0 12px;font-size:18px;color:#1a1a1a">分维度分析</h3><div style="line-height:1.8;color:#1a1a1a">' + dimAnalysisHTML + '</div></div>';
    
    // 3. 重点干预清单
    const actionItems = [];
    Object.entries(scores).forEach(([dim,score])=>{
      const name = dimNames[dim] || dim;
      if (score >= 5) {
        actionItems.push('【' + name + '要点】重点关注相关症状，建议采取针对性干预措施，必要时寻求专业医疗帮助。');
      } else if (score >= 2) {
        actionItems.push('【' + name + '要点】保持关注，定期监测，维持良好习惯。');
      }
    });
    
    const actionHTML = actionItems.length > 0 ? actionItems.map(item=>'<li style="margin:8px 0;line-height:1.6">'+item+'</li>').join('') : '<li style="margin:8px 0">保持良好的健康习惯，定期复查。</li>';
    
    const actionSectionHTML = '<div style="padding:20px;background:#fff;border-radius:12px;margin-bottom:16px"><h3 style="margin:0 0 12px;font-size:18px;color:#1a1a1a">重点干预清单</h3><ul style="margin:0;padding-left:20px;line-height:1.8;color:#1a1a1a">' + actionHTML + '</ul></div>';
    
    // 4. 复诊/随访时间窗
    const followupHTML = '<div style="padding:20px;background:#fff;border-radius:12px;margin-bottom:16px"><h3 style="margin:0 0 12px;font-size:18px;color:#1a1a1a">复诊/随访时间窗</h3><ul style="margin:0;padding-left:20px;line-height:1.8;color:#1a1a1a"><li>3-4周复诊; 42天常规产后检查。</li><li>维持期: 每4-6周随访一次，必要时转康复/心理/乳腺/营养门诊。</li></ul></div>';
    
    // 组合结果页面内容
    sevEl.textContent = sev;
    dimBox.innerHTML = totalHTML + dimSectionHTML + actionSectionHTML + followupHTML;

    const ev = evaluateRules({answers:state.answers, scores, rules: state.rules, lang: state.lang});
    if (ev.conclusions.length > 0) {
      conclEl.innerHTML = '<h3 style="margin:20px 0 12px">重要提示</h3><ul style="line-height:1.8">'+ev.conclusions.map(x=>'<li style="margin:8px 0">'+x+'</li>').join('')+'</ul><div style="margin-top:16px;padding:12px;background:#fff4e6;border-left:4px solid #ff9800;border-radius:4px"><strong>评估概述：</strong> '+overviewText+'</div>';
    } else {
      conclEl.innerHTML = '<div style="padding:16px;background:#f0f9ff;border-left:4px solid #2B77F2;border-radius:4px;line-height:1.6"><h3 style="margin:0 0 12px">评估完成</h3><p style="margin:0 0 12px">'+overviewText+'</p><div style="margin-top:16px" class="muted">如有任何不适或疑问，建议及时咨询专业医疗人员。</div></div>';
    }

    // 5. 产品推荐
    const productMap = Object.fromEntries((state.products||[]).map(p=>[p.id,p]));
    if (ev.reco.length > 0) {
      // 生成分数摘要
      const scoreSummary = Object.entries(scores).map(([dim,score])=>
        dimNames[dim] + ': ' + score.toFixed(1)
      ).join(' | ');
      
      const recoHTML = ev.reco.map(r=>{
        const p = productMap[r.code]||{};
        const name = r.title || p.name || r.code;
        const desc = p.desc || '专业指导服务，为您提供专业的产后恢复指导。';
        const course = p.course || '8-12 周 (可按需延长)';
        const img = (p.images&&p.images[0]) ? '<img src="'+p.images[0]+'" alt="'+name+'" style="width:100px;height:100px;object-fit:cover;border-radius:12px;margin-right:16px" />' : '';
        const url = p.url || '#';
        const buyBtn = '<button data-url="'+JSON.stringify(url)+'" style="flex:1;padding:12px 24px;background:#10b981;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer">立即购买</button>';
        const copyBtn = '<button data-name="'+JSON.stringify(name)+'" style="flex:1;padding:12px 24px;background:#fff;color:#1a1a1a;border:1px solid #e5e7eb;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer">复制推荐文案</button>';
        return '<div style="padding:20px;background:#fff;border-radius:12px;margin-bottom:16px;border:1px solid #e5e7eb"><div style="font-size:12px;color:#667085;margin-bottom:12px">'+scoreSummary+'</div><div style="display:flex;align-items:flex-start;margin-bottom:16px">'+img+'<div style="flex:1"><h3 style="margin:0 0 8px;font-size:20px;color:#1a1a1a">'+name+'</h3><div style="font-size:13px;color:#667085;margin-bottom:12px">'+desc+'</div><div style="font-size:13px;color:#667085">建议疗程 '+course+'</div></div></div><div style="display:flex;gap:12px">'+buyBtn+copyBtn+'</div></div>';
      }).join('');
      
      recoEl.innerHTML = '<h3 style="margin:20px 0 12px;font-size:18px;color:#1a1a1a">产品推荐</h3>' + recoHTML;
      // 添加事件监听器
      setTimeout(() => {
        recoEl.querySelectorAll('button[data-url]').forEach(btn => {
          btn.addEventListener('click', () => window.open(JSON.parse(btn.getAttribute('data-url')), '_blank'));
        });
        recoEl.querySelectorAll('button[data-name]').forEach(btn => {
          btn.addEventListener('click', () => copyRecText(JSON.parse(btn.getAttribute('data-name'))));
        });
      }, 0);
    } else {
      recoEl.innerHTML = '';
    }

    const params = new URLSearchParams(location.search);
    const SHOP_QR = params.get('shop_qr') || tpl.shop?.qr || 'https://example.com';
    
    // 简化二维码生成
    qrEl.innerHTML = '<div style="width:128px;height:128px;background:#fff;border:2px solid #333;display:flex;align-items:center;justify-content:center;font-size:12px;color:#999;">扫码访问<br/>'+SHOP_QR.substring(0,20)+'...</div>';
    qrHint.textContent = SHOP_QR;

    resultCard.classList.remove('hidden');
  }
  
  // 复制推荐文案函数
  function copyRecText(productName){
    const textToCopy = '根据产后恢复评估，推荐使用 '+productName+'。';
    navigator.clipboard.writeText(textToCopy).then(()=>{
      alert('推荐文案已复制');
    }).catch(()=>{
      alert('复制失败');
    });
  }

  // 确保DOM加载完成后再渲染
  window.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, calling render');
    render();
  });
  
  // 如果DOM已经加载完成
  if (document.readyState === 'complete') {
    console.log('DOM already complete, calling render');
    render();
  }
  </script>

  <!-- 页脚 -->
  <div class="footer">
    小林健康研究所・` + (UI.zh?.subA || typeName) + `
  </div>
</body>
</html>`;
  
  return html;
}

