
import express from 'express';
import path from 'path';
import cors from 'cors';
import multer from 'multer';
import builder from '../routes/builder.js';  // 确保正确导入
import { fileURLToPath } from 'url';
import { promises as fs } from 'node:fs';
import fsSync from 'fs';

const app = express();

// 获取当前模块的目录路径
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 解析 JSON 请求体
app.use(express.json());

// 启用 CORS
app.use(cors());

// 提供静态文件，指向根目录的 public 文件夹
app.use(express.static(path.join(__dirname, '..', 'public')));  // 修正路径，指向根目录的 public 文件夹
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));  // 上传文件服务

// 配置multer文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    // 确保上传目录存在
    if (!fsSync.existsSync(uploadDir)) {
      fsSync.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳_原文件名
    const timestamp = Date.now();
    const originalName = file.originalname;
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    cb(null, `${timestamp}_${name}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制文件大小为5MB
  },
  fileFilter: function (req, file, cb) {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  }
});

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
    res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'index.html'));  // 返回根目录 public/admin 文件夹中的 index.html
});

// 处理新增类型的 POST 请求
app.post('/api/admin/types', async (req, res) => {
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

    // 保存到文件
    try {
        await saveTypes();
        console.log('类型数据已保存到文件');
    } catch (error) {
        console.error('保存类型数据失败:', error);
    }

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
        await loadTypes(); // 确保数据是最新的
        res.json({ items });
    } catch (error) {
        res.status(500).json({ error: '获取类型失败' });
    }
});

// 获取所有模板
app.get('/api/admin/templates', async (req, res) => {
    try {
        const templates = await readJSON('templates.json', []);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: '获取模板失败' });
    }
});

// 获取模板详情
app.get('/api/admin/templates/:id/detail', async (req, res) => {
    try {
        const { id } = req.params;
        const templates = await readJSON('templates.json', []);
        const template = templates.find(t => t.id === id);
        
        if (!template) {
            return res.status(404).json({ error: '模板不存在' });
        }
        
        // 读取模板的详细数据
        const Q = await readJSON(`templates/${id}/Q.json`, []);
        const WT = await readJSON(`templates/${id}/WT.json`, {});
        const UI = await readJSON(`templates/${id}/UI.json`, {});
        const meta = await readJSON(`templates/${id}/meta.json`, {});
        const rules = await readJSON(`templates/${id}/rules.json`, {});
        const products = await readJSON(`templates/${id}/products.json`, []);
        
        res.json({
            id,
            name: template.name,
            meta: {
                ...meta,
                name: template.name,
                countQ: Q.length
            },
            Q,
            WT,
            UI,
            rules,
            products
        });
    } catch (error) {
        console.error('获取模板详情失败:', error);
        res.status(500).json({ error: '获取模板详情失败' });
    }
});

// 店铺管理API
// 获取所有店铺
app.get('/api/admin/shops', async (req, res) => {
    try {
        const shops = await readJSON('shops.json', []);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.json(shops);
    } catch (error) {
        console.error('获取店铺列表失败:', error);
        res.status(500).json({ error: '获取店铺列表失败' });
    }
});

// 新增店铺
app.post('/api/admin/shops', async (req, res) => {
    try {
        const { name, description, manager, qr } = req.body;
        
        if (!name || !manager) {
            return res.status(400).json({ error: '店铺名称和负责人为必填项' });
        }
        
        const shops = await readJSON('shops.json', []);
        
        // 检查店铺名称是否已存在
        if (shops.some(shop => shop.name === name)) {
            return res.status(409).json({ error: 'shop_exists', name });
        }
        
        // 生成店铺ID
        const shopId = `shop_${Date.now()}`;
        const newShop = {
            id: shopId,
            name,
            description: description || '',
            manager,
            qr: qr || '',
            createdAt: new Date().toISOString()
        };
        
        shops.push(newShop);
        await writeJSON('shops.json', shops);
        
        res.status(201).json({
            success: true,
            message: '店铺新增成功',
            data: newShop
        });
        
    } catch (error) {
        console.error('新增店铺失败:', error);
        res.status(500).json({ error: '新增店铺失败' });
    }
});

// 更新店铺
app.put('/api/admin/shops/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, manager, qr } = req.body;
        
        const shops = await readJSON('shops.json', []);
        const shopIndex = shops.findIndex(shop => shop.id === id);
        
        if (shopIndex === -1) {
            return res.status(404).json({ error: '店铺不存在' });
        }
        
        // 检查店铺名称是否与其他店铺重复
        if (name && shops.some((shop, index) => shop.name === name && index !== shopIndex)) {
            return res.status(409).json({ error: 'shop_exists', name });
        }
        
        // 更新店铺信息
        if (name) shops[shopIndex].name = name;
        if (description !== undefined) shops[shopIndex].description = description;
        if (manager) shops[shopIndex].manager = manager;
        if (qr !== undefined) shops[shopIndex].qr = qr;
        shops[shopIndex].updatedAt = new Date().toISOString();
        
        await writeJSON('shops.json', shops);
        
        res.json({
            success: true,
            message: '店铺更新成功',
            data: shops[shopIndex]
        });
        
    } catch (error) {
        console.error('更新店铺失败:', error);
        res.status(500).json({ error: '更新店铺失败' });
    }
});

// 删除店铺
app.delete('/api/admin/shops/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const shops = await readJSON('shops.json', []);
        const shopIndex = shops.findIndex(shop => shop.id === id);
        
        if (shopIndex === -1) {
            return res.status(404).json({ error: '店铺不存在' });
        }
        
        const deletedShop = shops.splice(shopIndex, 1)[0];
        await writeJSON('shops.json', shops);
        
        res.json({
            success: true,
            message: '店铺删除成功',
            data: deletedShop
        });
        
    } catch (error) {
        console.error('删除店铺失败:', error);
        res.status(500).json({ error: '删除店铺失败' });
    }
});

// 文件上传API
app.post('/api/admin/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '没有上传文件' });
        }
        
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({
            success: true,
            message: '文件上传成功',
            data: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                url: fileUrl,
                size: req.file.size
            }
        });
    } catch (error) {
        console.error('文件上传失败:', error);
        res.status(500).json({ error: '文件上传失败' });
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
        const templateDir = path.join(DATA_DIR, 'templates', id);
        try {
            await fs.access(templateDir);
            await fs.rm(templateDir, { recursive: true, force: true });
            console.log(`已删除模板目录: ${templateDir}`);
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
        const { extractFromHTML } = await import('../lib/htmlExtractor.js');
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
            countQ: extracted.Q.length,
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
        await writeJSON(`templates/${templateId}/rules.json`, extracted.rules || {});
        await writeJSON(`templates/${templateId}/products.json`, extracted.products || []);
        
        res.json({
            success: true,
            template_id: templateId,
            templateName,
            counts: { Q: extracted.Q.length },
            typeId: typeId
        });
        
    } catch (error) {
        console.error('导入模板失败:', error);
        res.status(500).json({ error: '导入失败' });
    }
});

// 问卷导出
app.post('/api/admin/export/survey', async (req, res) => {
    try {
        const { typeId, count, shopQR } = req.body;
        
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
        const typesData = await readJSON('types.json', []);
        const types = Array.isArray(typesData) ? typesData : (typesData.items || []);
        const type = types.find(t => t.id === typeId);
        const typeName = type ? type.name : typeId;
        
        // 从第一个模板读取样式、规则和产品信息
        const firstTemplate = typeTemplates[0];
        const UI = await readJSON(`templates/${firstTemplate.id}/UI.json`, {});
        const WT = await readJSON(`templates/${firstTemplate.id}/WT.json`, {});
        const rules = await readJSON(`templates/${firstTemplate.id}/rules.json`, {});
        const products = await readJSON(`templates/${firstTemplate.id}/products.json`, []);
        
        // 生成H5问卷
        const { generateSurveyHTML } = await import('./lib/surveyGenerator.js');
        const html = generateSurveyHTML(selectedQuestions, typeName, count, UI, WT, rules, products, shopQR);
        
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
app.listen(3000, async () => {
  console.log('Server is running on port 3000');
  await loadTypes(); // 启动时加载类型数据
});
