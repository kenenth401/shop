// public/admin/admin.js
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const api = p => p; // 同源

$$('.nav-item').forEach(btn => {
  btn.addEventListener('click', async () => {
    $$('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const v = btn.dataset.view;
    $$('.view').forEach(sec => sec.classList.remove('show'));
    $('#view-' + v).classList.add('show');
    
    // 根据页面类型加载相应数据
    if(v === 'shops') await renderShops();
  });
});

$('#pingBtn')?.addEventListener('click', async () => {
  try { const r = await fetch(api('/health')); const j = await r.json();
    const ok = !!j.ok; $('#pingRes').textContent = ok ? '已连接' : '失败';
    $('#pingRes').style.background = ok ? '#dcfce7' : '#fee2e2';
    $('#pingRes').style.color = ok ? '#166534' : '#991b1b';
  } catch { $('#pingRes').textContent='失败'; $('#pingRes').style.background='#fee2e2'; $('#pingRes').style.color='#991b1b'; }
});

async function getTypes(){ const r = await fetch(api('/api/admin/types')); const data = await r.json(); return data.items || data; }
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

// 店铺管理相关函数
async function getShops(){ const r = await fetch(api('/api/admin/shops')); return r.json(); }
async function createShop(name, description, manager, qr){
  const r = await fetch(api('/api/admin/shops'), {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({name, description, manager, qr})
  });
  if(!r.ok){
    let msg = `HTTP ${r.status}`;
    try{
      const j = await r.json();
      if(j && j.error){
        const map = {
          shop_exists: '店铺名称已存在，请换一个名称',
        };
        msg += '：' + (map[j.error] || j.error);
      }
    }catch{}
    throw new Error(msg);
  }
  return r;
}
async function updateShop(id, name, description, manager, qr){ 
  return fetch(api('/api/admin/shops/'+encodeURIComponent(id)), { 
    method:'PUT', 
    headers:{'Content-Type':'application/json'}, 
    body: JSON.stringify({name, description, manager, qr})
  }); 
}
async function deleteShop(id){ return fetch(api('/api/admin/shops/'+encodeURIComponent(id)), { method:'DELETE' }); }

// 文件上传相关函数
async function uploadImage(file){
  const formData = new FormData();
  formData.append('image', file);
  
  const r = await fetch(api('/api/admin/upload'), {
    method: 'POST',
    body: formData
  });
  
  if(!r.ok){
    const error = await r.json();
    throw new Error(error.error || '上传失败');
  }
  
  return r.json();
}

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

// 加载店铺列表到导出页面的下拉框
async function loadShopsForExport() {
  try {
    const shops = await getShops();
    const select = $('#selExportShop');
    if (select) {
      // 清空现有选项（保留"请选择店铺"选项）
      select.innerHTML = '<option value="">请选择店铺</option>';
      
      // 添加店铺选项
      shops.forEach(shop => {
        const option = document.createElement('option');
        option.value = shop.qr || '';
        option.textContent = shop.name || shop.id;
        select.appendChild(option);
      });
    }
  } catch (e) {
    console.error('加载店铺列表失败:', e);
  }
}

// 在页面加载时填充店铺列表
document.addEventListener('DOMContentLoaded', async () => {
  await loadShopsForExport();
});

// 问卷导出功能
$('#exportBtn')?.addEventListener('click', async () => {
  const typeId = $('#selExportType').value;
  const count = parseInt($('#exportCount').value) || 10;
  const shopQR = $('#selExportShop').value;
  
  if (!typeId) {
    alert('请选择问卷类型');
    return;
  }
  
  if (count < 1 || count > 50) {
    alert('题目数量必须在1-50之间');
    return;
  }
  
  if (!shopQR) {
    alert('请选择店铺');
    return;
  }
  
  try {
    const response = await fetch(api('/api/admin/export/survey'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ typeId, count, shopQR })
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

// 店铺管理相关函数
async function renderShops(){
  const shops = await getShops();
  const tbody = $('#shopsBody'); 
  if(!tbody) return; 
  tbody.innerHTML='';
  
  shops.forEach(shop => {
    const tr = document.createElement('tr');
    const qrDisplay = shop.qr ? 
      `<img src="${shop.qr}" alt="二维码" style="width:64px;height:64px;object-fit:cover;border-radius:8px;cursor:pointer;" onclick="showImageModal('${shop.qr}')">` : 
      '<span class="muted">无图片</span>';
    
    tr.innerHTML = `
      <td><input data-id="${shop.id}" class="inline-name" value="${shop.name}"/></td>
      <td><input data-id="${shop.id}" class="inline-manager" value="${shop.manager}"/></td>
      <td><input data-id="${shop.id}" class="inline-description" value="${shop.description || ''}"/></td>
      <td class="qr">
        ${qrDisplay}
        <input data-id="${shop.id}" class="inline-qr-file" type="file" accept="image/*" style="display:none;">
        <button data-id="${shop.id}" class="btn ghost" data-act="upload" style="margin-top:4px;font-size:12px;">更换图片</button>
      </td>
      <td>
        <button class="btn ghost" data-act="save" data-id="${shop.id}">保存</button>
        <button class="btn ghost" data-act="del" data-id="${shop.id}" style="margin-left:8px;color:#dc2626;">删除</button>
      </td>`;
    tbody.appendChild(tr);
  });
  
  // 保存按钮事件
  tbody.querySelectorAll('button[data-act="save"]').forEach(b => b.addEventListener('click', async ()=>{
    const id = b.dataset.id; 
    const name = tbody.querySelector(`input[data-id="${id}"].inline-name`).value.trim();
    const manager = tbody.querySelector(`input[data-id="${id}"].inline-manager`).value.trim();
    const description = tbody.querySelector(`input[data-id="${id}"].inline-description`).value.trim();
    
    if(!name || !manager) return alert('店铺名称和负责人不可为空');
    
    // 获取当前店铺的二维码URL（保持不变）
    const shops = await getShops();
    const currentShop = shops.find(s => s.id === id);
    const qr = currentShop ? currentShop.qr : '';
    
    const r = await updateShop(id, name, description, manager, qr);
    if(!r.ok){ 
      const error = await r.json();
      alert('保存失败：' + (error.error || '未知错误'));
      return; 
    }
    alert('保存成功');
    await renderShops();
  }));
  
  // 图片上传按钮事件
  tbody.querySelectorAll('button[data-act="upload"]').forEach(b => b.addEventListener('click', async ()=>{
    const id = b.dataset.id;
    const fileInput = tbody.querySelector(`input[data-id="${id}"].inline-qr-file`);
    fileInput.click();
    
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const result = await uploadImage(file);
        const qrUrl = result.data.url;
        
        // 更新店铺的二维码URL
        const shops = await getShops();
        const shopIndex = shops.findIndex(s => s.id === id);
        if (shopIndex !== -1) {
          shops[shopIndex].qr = qrUrl;
          await updateShop(id, shops[shopIndex].name, shops[shopIndex].description, shops[shopIndex].manager, qrUrl);
          alert('图片上传成功');
          await renderShops();
        }
      } catch (error) {
        alert('图片上传失败：' + error.message);
      }
    });
  }));
  
  // 删除按钮事件
  tbody.querySelectorAll('button[data-act="del"]').forEach(b => b.addEventListener('click', async ()=>{
    const shopName = b.closest('tr').querySelector('input.inline-name').value;
    if(!confirm(`确定要删除店铺"${shopName}"吗？此操作不可恢复！`)) return;
    
    const r = await deleteShop(b.dataset.id);
    if(!r.ok){ 
      const error = await r.json();
      alert('删除失败：' + (error.error || '未知错误'));
      return; 
    }
    alert('删除成功');
    await renderShops();
  }));
}

// 新增店铺按钮事件
$('#addShop')?.addEventListener('click', async ()=>{
  const name = $('#newShopName').value.trim();
  const manager = $('#newShopManager').value.trim();
  const description = $('#newShopDescription').value.trim();
  const qrFile = $('#newShopQrFile').files[0];
  
  if(!name || !manager){ alert('请填写店铺名称和负责人'); return; }
  
  try{
    let qrUrl = '';
    if (qrFile) {
      const result = await uploadImage(qrFile);
      qrUrl = result.data.url;
    }
    
    await createShop(name, description, manager, qrUrl);
    $('#newShopName').value=''; 
    $('#newShopManager').value='';
    $('#newShopDescription').value='';
    $('#newShopQrFile').value='';
    $('#qrFileName').textContent='';
    alert('新增成功');
    await renderShops();
  }catch(e){
    alert('新增失败：' + e.message);
  }
});

// 文件选择按钮事件
$('#uploadQrBtn')?.addEventListener('click', ()=>{
  $('#newShopQrFile').click();
});

$('#newShopQrFile')?.addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if (file) {
    $('#qrFileName').textContent = `已选择: ${file.name}`;
  } else {
    $('#qrFileName').textContent = '';
  }
});

// 图片预览模态框功能
window.showImageModal = function(imageUrl) {
  $('#modalImage').src = imageUrl;
  $('#imageModal').style.display = 'block';
};

$('.close')?.addEventListener('click', ()=>{
  $('#imageModal').style.display = 'none';
});

window.addEventListener('click', (e)=>{
  if (e.target === $('#imageModal')) {
    $('#imageModal').style.display = 'none';
  }
});

refreshTypeDropdowns();
