
import express from 'express';
import path from 'path';
import builder from '../routes/builder.js';  // 确保正确导入
import { fileURLToPath } from 'url';
import { promises as fs } from 'node:fs';

const app = express();

// 获取当前模块的目录路径
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 解析 JSON 请求体
app.use(express.json());

// 提供静态文件，指向根目录的 public 文件夹
app.use(express.static(path.join(__dirname, '..', 'public')));  // 修正路径，指向根目录的 public 文件夹

// 模拟数据库查询
let items = [
    { id: 'A', name: '产后恢复' },
    { id: 'B', name: '脑雾' }
];

// 确保items是数组
function ensureItemsArray() {
    if (!Array.isArray(items)) {
        items = [];
    }
}

// 加载类型数据
async function loadTypes() {
    try {
        const data = await readJSON('types.json', []);
        // 兼容两种格式：直接数组或 { items: [] } 对象
        if (Array.isArray(data)) {
            items = data;
        } else if (data && Array.isArray(data.items)) {
            items = data.items;
        } else {
            items = [];
        }
        ensureItemsArray();
    } catch (error) {
        console.error('加载类型失败:', error);
        items = [];
    }
}

// 保存类型数据
async function saveTypes() {
    try {
        await writeJSON('types.json', { items });
    } catch (error) {
        console.error('保存类型失败:', error);
    }
}

// 路由配置，处理 `/admin` 请求
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));  // 返回根目录 public 文件夹中的 admin.html
});

// 处理新增类型的 POST 请求
app.post('/api/admin/types', (req, res) => {
    const { id, name } = req.body;

    console.log('Received POST request for types:', req.body);  // 添加日志，查看请求体
    if (!id || !name) {
        console.error('类型ID或中文名未提供');
        return res.status(400).json({ error: '类型ID和中文名为必填项' });
    }

    // 强制确保 items 是数组
    if (!Array.isArray(items)) {
        console.error('items 不是数组，当前类型为:', typeof items);
        return res.status(500).json({ error: '服务器数据格式错误，items 应该是一个数组' });
    }

    // 打印当前 items 数组的状态
    console.log('Items before adding new type:', items);

    // 检查是否已经存在相同的 id
    if (items.some(item => item.id === id)) {
        console.error('类型ID已存在:', id);
        return res.status(409).json({ error: 'type_exists', id });
    }

    // 模拟将新类型添加到数据库或内存存储
    items.push({ id, name });

    // 强制将 items 转换为数组（如果它变成了非数组类型）
    if (!Array.isArray(items)) {
        items = [items];  // 强制将其转换为数组
    }

    // 打印更新后的 items 数组
    console.log('Items after adding new type:', items);

    res.status(201).json({ message: '类型新增成功', data: { id, name }, allItems: items });
});

// 文件读取和写入
const DATA_DIR = path.resolve('data');

async function ensureFile(p, initData) {
    console.log('Ensuring file at path:', p);  // 增加日志，查看文件路径
    try { await fs.access(p); }
    catch {
        await fs.mkdir(path.dirname(p), { recursive: true });
        await fs.writeFile(p, JSON.stringify(initData ?? (Array.isArray(initData)?[]:{}), null, 2), 'utf8');
    }
}

export async function readJSON(relPath, fallback = null) {
    const file = path.join(DATA_DIR, relPath);
    console.log('Reading file at path:', file);  // 增加日志，查看读取的文件路径
    await ensureFile(file, fallback ?? []);
    const txt = await fs.readFile(file, 'utf8');
    try { return JSON.parse(txt); } catch { return fallback; }
}

export async function writeJSON(relPath, data) {
    const file = path.join(DATA_DIR, relPath);
    console.log('Writing to file at path:', file);  // 增加日志，查看写入的文件路径
    await ensureFile(file, Array.isArray(data) ? [] : {});
    await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
}

// 健康检查
app.get('/health', (req, res) => {
    res.json({ ok: true, message: '服务器运行正常' });
});

// 获取所有类型
app.get('/api/admin/types', async (req, res) => {
    try {
        const types = await readJSON('types.json', []);
        res.json(types);
    } catch (error) {
        res.status(500).json({ error: '获取类型失败' });
    }
});

// 获取所有模板
app.get('/api/admin/templates', async (req, res) => {
    try {
        const templates = await readJSON('templates.json', []);
        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: '获取模板失败' });
    }
});

// 获取类型的题目
app.get('/api/admin/types/:id/questions', async (req, res) => {
    try {
        const { id } = req.params;
        const templates = await readJSON('templates.json', []);
        const typeTemplates = templates.filter(t => t.typeId === id);

        const allQuestions = [];
        for (const template of typeTemplates) {
            const Q = await readJSON(`templates/${template.id}/Q.json`, []);
            allQuestions.push(...Q.map(q => ({ ...q, templateId: template.id, templateName: template.name })));
        }

        // 去重合并：根据题目的key合并重复题目
        const questionMap = new Map();
        allQuestions.forEach(q => {
            const key = q.key;
            if (questionMap.has(key)) {
                // 如果题目已存在，合并来源模板信息
                const existing = questionMap.get(key);
                if (!existing.sourceTemplates) {
                    existing.sourceTemplates = [existing.templateName];
                }
                if (!existing.sourceTemplates.includes(q.templateName)) {
                    existing.sourceTemplates.push(q.templateName);
                }
            } else {
                // 新题目，添加来源模板信息
                questionMap.set(key, {
                    ...q,
                    sourceTemplates: [q.templateName]
                });
            }
        });

        // 转换为数组并格式化来源模板信息
        const uniqueQuestions = Array.from(questionMap.values()).map(q => ({
            ...q,
            sourceTemplates: q.sourceTemplates.join(', ')
        }));

        res.json({
            countQ: uniqueQuestions.length,
            Q: uniqueQuestions,
            originalCount: allQuestions.length,
            mergedCount: allQuestions.length - uniqueQuestions.length
        });
    } catch (error) {
        console.error('获取题目失败:', error);
        res.status(500).json({ error: '获取题目失败' });
    }
});

// 删除类型
app.delete('/api/admin/types/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await loadTypes();
        const index = items.findIndex(item => item.id === id);
        if (index === -1) {
            return res.status(404).json({ error: '类型不存在' });
        }
        items.splice(index, 1);
        await saveTypes();
        res.json({ success: true });
    } catch (error) {
        console.error('删除类型失败:', error);
        res.status(500).json({ error: '删除类型失败: ' + error.message });
    }
});

// 删除模板
app.delete('/api/admin/templates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const templates = await readJSON('templates.json', []);
        const templateIndex = templates.findIndex(t => t.id === id);
        
        if (templateIndex === -1) {
            return res.status(404).json({ error: '模板不存在' });
        }

        // 删除模板文件
        const templateDir = `data/templates/${id}`;
        try {
            if (fs.existsSync(templateDir)) {
                fs.rmSync(templateDir, { recursive: true, force: true });
                console.log(`已删除模板目录: ${templateDir}`);
            }
        } catch (fsError) {
            console.error('删除模板文件失败:', fsError);
            // 即使文件删除失败，也继续删除数据库记录
        }

        // 从模板列表中移除
        templates.splice(templateIndex, 1);
        await writeJSON('templates.json', templates);

        res.json({ success: true });
    } catch (error) {
        console.error('删除模板失败:', error);
        res.status(500).json({ error: '删除模板失败: ' + error.message });
    }
});

// 导入HTML模板
app.post('/api/admin/templates/import-html', async (req, res) => {
    try {
        const { html, typeId } = req.body;
        
        if (!html || !typeId) {
            return res.status(400).json({ error: '缺少必要参数' });
        }
        
        // 使用htmlExtractor提取数据
        const { extractFromHTML } = await import('../src/lib/htmlExtractor.js');
        const extracted = extractFromHTML(html);
        
        if (!extracted.Q || extracted.Q.length === 0) {
            return res.status(400).json({ error: '未找到有效的题目数据' });
        }
        
        // 生成模板ID
        const templateId = `tpl_${Date.now()}`;
        const templateName = extracted.meta?.title || `模板_${templateId}`;
        
        // 保存模板数据
        const template = {
            id: templateId,
            name: templateName,
            typeId: typeId,
            createdAt: new Date().toISOString()
        };
        
        // 更新模板列表
        const templates = await readJSON('templates.json', []);
        templates.push(template);
        await writeJSON('templates.json', templates);
        
        // 创建模板目录并保存数据
        const templateDir = path.join(DATA_DIR, 'templates', templateId);
        await fs.mkdir(templateDir, { recursive: true });
        
        await writeJSON(`templates/${templateId}/Q.json`, extracted.Q);
        await writeJSON(`templates/${templateId}/WT.json`, extracted.WT || {});
        await writeJSON(`templates/${templateId}/UI.json`, extracted.UI || {});
        await writeJSON(`templates/${templateId}/meta.json`, extracted.meta || {});
        
        res.json({
            success: true,
            templateId,
            templateName,
            questionCount: extracted.Q.length
        });
        
    } catch (error) {
        console.error('导入模板失败:', error);
        res.status(500).json({ error: '导入失败' });
    }
});

// 问卷导出
app.post('/api/admin/export/survey', async (req, res) => {
    try {
        const { typeId, count } = req.body;
        
        if (!typeId || !count) {
            return res.status(400).json({ error: '缺少必要参数' });
        }
        
        // 获取该类型的所有题目
        const templates = await readJSON('templates.json', []);
        const typeTemplates = templates.filter(t => t.typeId === typeId);
        
        if (typeTemplates.length === 0) {
            return res.status(404).json({ error: '该类型下没有模板' });
        }
        
        // 收集所有题目
        const allQuestions = [];
        for (const template of typeTemplates) {
            const Q = await readJSON(`templates/${template.id}/Q.json`, []);
            allQuestions.push(...Q.map(q => ({ ...q, templateId: template.id, templateName: template.name })));
        }
        
        // 去重
        const questionMap = new Map();
        allQuestions.forEach(q => {
            const key = q.key;
            if (!questionMap.has(key)) {
                questionMap.set(key, q);
            }
        });
        
        const uniqueQuestions = Array.from(questionMap.values());
        
        // 随机选择指定数量的题目
        const selectedQuestions = uniqueQuestions
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.min(count, uniqueQuestions.length));
        
        if (selectedQuestions.length === 0) {
            return res.status(404).json({ error: '该类型下没有可用题目' });
        }
        
        // 获取类型名称
        const types = await readJSON('types.json', []);
        const type = types.find(t => t.id === typeId);
        const typeName = type ? type.name : typeId;
        
        // 生成H5问卷
        const { generateSurveyHTML } = await import('../lib/surveyGenerator.js');
        const html = generateSurveyHTML(selectedQuestions, typeName, count);
        
        // 保存文件
        const timestamp = Date.now();
        const filename = `survey_${typeId}_${timestamp}.html`;
        const filepath = path.join(DATA_DIR, 'exports', filename);
        
        await fs.mkdir(path.dirname(filepath), { recursive: true });
        await fs.writeFile(filepath, html, 'utf8');
        
        res.json({
            success: true,
            filename,
            downloadUrl: `/api/admin/export/download/${filename}`,
            questionCount: selectedQuestions.length,
            typeName
        });
        
    } catch (error) {
        console.error('导出问卷失败:', error);
        res.status(500).json({ error: '导出失败' });
    }
});

// 下载导出的问卷
app.get('/api/admin/export/download/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const filepath = path.join(DATA_DIR, 'exports', filename);
        
        // 检查文件是否存在
        await fs.access(filepath);
        
        // 设置下载头
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // 发送文件
        const fileContent = await fs.readFile(filepath, 'utf8');
        res.send(fileContent);
        
    } catch (error) {
        res.status(404).json({ error: '文件不存在' });
    }
});

// 错误处理：如果没有找到相应的 API 路由，返回 404 错误
app.use((req, res) => {
    res.status(404).json({ error: 'API 路径未找到' });
});

// 如果有其他路径，也可以这样处理
app.use('/builder', (req, res, next) => {
  try {
    const html = builder.buildHTML({ name: 'Test Template', description: 'This is a test template' });
    res.send(html);
  } catch (err) {
    next(err);
  }
});

// 启动服务器
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
