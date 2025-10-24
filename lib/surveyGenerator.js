// H5问卷生成器 - 使用现有的shell.html模板
export function generateSurveyHTML(questions, typeName, count) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const surveyId = `survey_${timestamp}`;
  
  // 构建完整的模板数据
  const templateData = {
    Q: questions,
    WT: {}, // 空的权重表
    UI: {
      zh: {
        prev: "上一步",
        next: "下一步", 
        submit: "提交问卷",
        needQ: "请先选择本题答案"
      }
    },
    meta: {
      title: `${typeName}问卷`,
      lang_default: 'zh'
    },
    rules: {
      conclusions: [],
      recommendations: []
    },
    products: []
  };
  
  // 使用简化的HTML模板
  const html = `<!doctype html>
<html lang="zh">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${typeName}问卷</title>
  <style>
    :root{--brand:#2B77F2;--bg:#f7f8fa;--text:#1a1a1a;--muted:#667085;--card:#fff}
    body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;background:var(--bg);color:var(--text)}
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
    .hidden{display:none}
    @media print{.actions,.progress{display:none!important}body{background:#fff}.card{box-shadow:none;border:1px solid #eee}}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="title"><h1 id="surveyTitle">${typeName}问卷</h1></div>
      <div class="progress"><div id="bar"></div></div>
      <div id="step"></div>
      <div class="actions">
        <button class="ghost" id="prevBtn">上一步</button>
        <button id="nextBtn">下一步</button>
      </div>
      <div class="muted" id="footnote">第 1 题 / 共 ${questions.length} 题</div>
    </div>

    <div class="card result hidden" id="resultCard">
      <h2>问卷完成</h2>
      <p>感谢您的参与！</p>
    </div>
  </div>

  <!-- 模板数据 -->
  <script type="application/json" id="TEMPLATE">${JSON.stringify(templateData)}</script>

  <!-- 业务脚本 -->
  <script>
    const tpl = JSON.parse(document.getElementById('TEMPLATE').textContent);
    const state = {
      idx: 0,
      answers: {},
      items: tpl.Q,
      lang: tpl.meta?.lang_default || 'zh'
    };

    const $ = s => document.querySelector(s);
    const elStep = $('#step'), elBar = $('#bar'), prevBtn = $('#prevBtn'), nextBtn = $('#nextBtn'),
          resultCard = $('#resultCard'), footnote = $('#footnote');

    function render(){
      const total = state.items.length, idx = state.idx;
      elBar.style.width = (idx/total*100)+'%';
      
      if (idx >= total){
        document.querySelector('.actions').classList.add('hidden');
        footnote.classList.add('hidden');
        $('#surveyTitle').textContent = '问卷完成';
        elStep.innerHTML = '<div class="muted" style="height:40px">正在生成结果...</div>';
        return setTimeout(() => {
          resultCard.classList.remove('hidden');
        }, 500);
      }
      
      document.querySelector('.actions').classList.remove('hidden');
      footnote.classList.remove('hidden');
      $('#surveyTitle').textContent = \`第 \${idx+1} 题 / 共 \${total} 题\`;

      const q = state.items[idx];
      const selected = state.answers[q.key]?.value || null;
      const opts = (q.opts||[]).map((pair,i)=>\\\`<label class="opt"><input type="radio" name="q_\\\${i}" value="\\\${pair[0]}" \\\${selected===pair[0]?'checked':''}/> \\\${pair[1]}</label>\\\`).join('');
      elStep.innerHTML = \\\`<div class="q">\\\${q.title?.[state.lang]||q.title?.zh||q.title||''}</div><div class="opts">\\\${opts}</div>\\\`;
      
      elStep.querySelectorAll('input[type=radio]').forEach(inp=>inp.addEventListener('change', e=>{
        state.answers[q.key] = { value: e.target.value };
      }));

      prevBtn.disabled = idx===0;
      nextBtn.textContent = (idx===total-1) ? '完成问卷' : '下一步';
    }

    prevBtn.addEventListener('click', ()=>{ 
      if (state.idx>0){ 
        state.idx--; 
        render(); 
      } 
    });
    
    nextBtn.addEventListener('click', ()=>{ 
      const q = state.items[state.idx]; 
      if (!state.answers[q.key]){ 
        alert('请先选择本题答案'); 
        return; 
      } 
      state.idx++; 
      render(); 
    });

    render();
  </script>
</body>
</html>`;
  
  return html;
}