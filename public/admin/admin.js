// public/admin/admin.js
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const api = p => p; // 同源

$$('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const v = btn.dataset.view;
    $$('.view').forEach(sec => sec.classList.remove('show'));
    $('#view-' + v).classList.add('show');
  });
});

$('#pingBtn')?.addEventListener('click', async () => {
  try { const r = await fetch(api('/health')); const j = await r.json();
    const ok = !!j.ok; $('#pingRes').textContent = ok ? '已连接' : '失败';
    $('#pingRes').style.background = ok ? '#dcfce7' : '#fee2e2';
    $('#pingRes').style.color = ok ? '#166534' : '#991b1b';
  } catch { $('#pingRes').textContent='失败'; $('#pingRes').style.background='#fee2e2'; $('#pingRes').style.color='#991b1b'; }
});

async function getTypes(){ const r = await fetch(api('/api/admin/types')); return r.json(); }
async function createType(id, name){
  const r = await fetch(api('/api/admin/types'), {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({id,name})
  });
  if(!r.ok){
    let msg = `HTTP ${r.status}`;
    try{
      const j = await r.json();
      if(j && j.error){
        const map = {
          missing_id_or_name: '后端未收到 id 或 name（请检查 server.js 是否已 app.use(express.json())）',
          type_exists: '类型ID重复，请换一个 ID',
        };
        msg += '：' + (map[j.error] || j.error);
      }
    }catch{}
    throw new Error(msg);
  }
  return r;
}
async function updateType(id, name){ return fetch(api('/api/admin/types/'+encodeURIComponent(id)), { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name})}); }
async function deleteType(id){ return fetch(api('/api/admin/types/'+encodeURIComponent(id)), { method:'DELETE' }); }
async function bindTemplate(tplId, typeId){ return fetch(api('/api/admin/templates/'+encodeURIComponent(tplId)+'/type'), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({typeId}) }); }
async function deleteTemplate(tplId){ return fetch(api('/api/admin/templates/'+encodeURIComponent(tplId)), { method:'DELETE' }); }
async function fetchTemplates(typeId){ const url = new URL(api('/api/admin/templates'), location.origin); if(typeId) url.searchParams.set('typeId', typeId); const r = await fetch(url); return r.json(); }
async function fetchTemplateDetail(id){ const r = await fetch(api('/api/admin/templates/' + encodeURIComponent(id) + '/detail')); return r.json(); }
async function fetchTypeQuestions(typeId){ const r = await fetch(api('/api/admin/types/' + encodeURIComponent(typeId) + '/questions')); return r.json(); }

function fillSelect(el, items, {value='id', label='name', withAll=false, allText='全部类型'}={}){
  el.innerHTML = '';
  if(withAll){ const o=document.createElement('option'); o.value=''; o.textContent=allText; el.appendChild(o); }
  items.forEach(it => { const o=document.createElement('option'); o.value = it[value]; o.textContent = it[label]; el.appendChild(o); });
}

async function refreshTypeDropdowns(){
  const types = await getTypes();
  fillSelect($('#selTypeImport'), types, { withAll:true, allText:'（不归类）' });
  fillSelect($('#selTypeFilter'), types, { withAll:true });
  fillSelect($('#selTypeQ'), types, { withAll:false });

  const templates = await fetchTemplates();

  // 填充导出类型下拉框
  fillSelect($('#selExportType'), types, { withAll:false });

  renderTypeEdit(types);
  renderTypes(await fetchTemplates($('#selTypeFilter').value||''));
}
$('#uploadBtn')?.addEventListener('click', async () => {
  const f = $('#htmlFile').files[0];
  if(!f){ alert('请选择 HTML 文件'); return; }
  const html = await f.text();
  const id = $('#tplId').value.trim() || undefined;
  const name = $('#tplName').value.trim() || undefined;
  const typeId = $('#selTypeImport').value || undefined;
  const r = await fetch(api('/api/admin/templates/import-html'), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ html, id, name, typeId }) });
  const j = await r.json();
  if(!r.ok){ alert('上传失败：' + JSON.stringify(j)); return; }
  $('#importMsg').textContent = `导入成功：${j.template_id}（Q: ${j.counts?.Q||0}，类型：${j.typeId||'无'}）`;
  await refreshTypeDropdowns();
});

async function renderTypes(list){
  const tbody = $('#typesBody'); if(!tbody) return; tbody.innerHTML='';
  list.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${t.name||'(未命名)'}</td>
      <td><span class="idpill">${t.id}</span></td>
      <td>${t.countQ ?? ''}</td>
      <td>${t.typeId || ''}</td>
      <td>
        <button class="btn ghost" data-id="${t.id}">查看题目</button>
        <button class="btn ghost" data-delete-id="${t.id}" style="margin-left:8px;color:#dc2626;">删除</button>
      </td>`;
    tbody.appendChild(tr);
  });
  
  // 查看题目按钮事件
  tbody.querySelectorAll('button[data-id]').forEach(b => b.addEventListener('click', () => {
    $('#selTypeQ').value = '';
    $('#qMeta').textContent = '（来自模板：'+b.dataset.id+'）';
    loadQuestionsFromTemplate(b.dataset.id);
    showView('questions');
  }));
  
  // 删除按钮事件
  tbody.querySelectorAll('button[data-delete-id]').forEach(b => b.addEventListener('click', async () => {
    const templateId = b.dataset.deleteId;
    const templateName = b.closest('tr').querySelector('td:first-child').textContent;
    
    if(!confirm(`确定要删除模板"${templateName}"（${templateId}）吗？\n这将删除模板及其所有相关题目，此操作不可恢复！`)) {
      return;
    }
    
    try {
      const r = await deleteTemplate(templateId);
      if(!r.ok) {
        const error = await r.json();
        alert('删除失败：' + (error.error || '未知错误'));
        return;
      }
      
      alert('删除成功！');
      // 刷新列表
      const list = await fetchTemplates($('#selTypeFilter').value||'');
      renderTypes(list);
    } catch(e) {
      alert('删除失败：' + e.message);
    }
  }));
}
$('#refreshTypes')?.addEventListener('click', async () => {
  const list = await fetchTemplates($('#selTypeFilter').value||'');
  renderTypes(list);
});

async function loadQuestionsFromTemplate(id){
  const j = await fetchTemplateDetail(id);
  const Q = j.Q || []; const name = j.meta?.name || j.name || id;
  $('#qMeta').textContent = `模板：${name}（ID：${id}），题目数：${Q.length}`;
  renderQTable(Q.map((q,i)=>({...q,__template:id,__templateName:name,__idx:i+1})));
}
async function loadQuestionsByType(){
  const typeId = $('#selTypeQ').value;
  if(!typeId){ alert('请选择一个类型'); return; }
  const j = await fetchTypeQuestions(typeId);
  let metaText = `类型：${typeId}，去重后题目数：${j.countQ}`;
  if (j.originalCount && j.mergedCount) {
    metaText += `（原始：${j.originalCount}，合并：${j.mergedCount}）`;
  }
  $('#qMeta').textContent = metaText;
  renderQTable(j.Q || []);
}
function renderQTable(Q){
  const kw = ($('#searchQ').value||'').toLowerCase();
  const tb = $('#qBody'); if(!tb) return; tb.innerHTML='';
  Q.forEach((q, idx) => {
    const title = (q.title?.zh || q.title || '').toString();
    const opts = (q.opts||[]).map(o => Array.isArray(o)? o.join('：') : JSON.stringify(o)).join(' / ');
    const sourceTemplates = q.sourceTemplates || q.__templateName || q.templateName || '';
    const rowText = (q.key + ' ' + title + ' ' + opts + ' ' + sourceTemplates).toLowerCase();
    if(kw && !rowText.includes(kw)) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${idx+1}</td><td>${q.key||''}</td><td>${title}</td><td>${q.type||''}</td><td>${opts}</td><td>${sourceTemplates}</td>`;
    tb.appendChild(tr);
  });
}
$('#btnLoadByType')?.addEventListener('click', loadQuestionsByType);
$('#searchQ')?.addEventListener('input', ()=>{ if($('#selTypeQ').value){ loadQuestionsByType(); } });

// 问卷导出功能
$('#exportBtn')?.addEventListener('click', async () => {
  const typeId = $('#selExportType').value;
  const count = parseInt($('#exportCount').value) || 10;
  
  if (!typeId) {
    alert('请选择问卷类型');
    return;
  }
  
  if (count < 1 || count > 50) {
    alert('题目数量必须在1-50之间');
    return;
  }
  
  try {
    const response = await fetch(api('/api/admin/export/survey'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ typeId, count })
    });
    
    if (!response.ok) {
      const error = await response.json();
      alert('导出失败：' + (error.error || '未知错误'));
      return;
    }
    
    const result = await response.json();
    $('#downloadLink').href = result.downloadUrl;
    $('#exportResult').style.display = 'block';
    
  } catch (e) {
    alert('导出失败：' + e.message);
  }
});

function showView(v){ $$('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.view===v)); $$('.view').forEach(sec => sec.classList.remove('show')); $('#view-'+v).classList.add('show'); }

function renderTypeEdit(types){
  const tb = $('#typeEditBody'); if(!tb) return; tb.innerHTML='';
  types.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><input data-id="${t.id}" class="inline-name" value="${t.name}"/></td>
      <td><span class="idpill">${t.id}</span></td>
      <td>
        <button class="btn ghost" data-act="save" data-id="${t.id}">保存</button>
        <button class="btn ghost" data-act="del" data-id="${t.id}">删除</button>
      </td>`;
    tb.appendChild(tr);
  });
  tb.querySelectorAll('button[data-act="save"]').forEach(b => b.addEventListener('click', async ()=>{
    const id = b.dataset.id; const name = tb.querySelector(`input[data-id="${id}"]`).value.trim();
    if(!name) return alert('名称不可为空');
    const r = await updateType(id, name);
    if(!r.ok){ alert('保存失败'); return; }
    await refreshTypeDropdowns();
  }));
  tb.querySelectorAll('button[data-act="del"]').forEach(b => b.addEventListener('click', async ()=>{
    if(!confirm('确定删除该类型？将取消已绑定模板的归类。')) return;
    const r = await deleteType(b.dataset.id);
    if(!r.ok){ alert('删除失败'); return; }
    await refreshTypeDropdowns();
  }));
}
$('#addType')?.addEventListener('click', async ()=>{
  const id = $('#newTypeId').value.trim();
  const name = $('#newTypeName').value.trim();
  if(!id || !name){ alert('请填写 类型ID 和 中文名'); return; }
  try{
    await createType(id, name);
    $('#newTypeId').value=''; $('#newTypeName').value='';
    alert('新增成功');
    await refreshTypeDropdowns();
  }catch(e){
    alert('新增失败：' + e.message);
  }
});

refreshTypeDropdowns();
