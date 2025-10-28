import express from 'express';
import { extractFromHTML } from './lib/htmlExtractor.js';

const app = express();
app.use(express.json());

// 测试导入功能
app.post('/test-import', (req, res) => {
    try {
        const { html } = req.body;
        console.log('收到HTML:', html.substring(0, 100) + '...');
        
        const extracted = extractFromHTML(html);
        console.log('提取结果:', extracted);
        
        res.json({
            success: true,
            extracted: extracted
        });
    } catch (error) {
        console.error('导入错误:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(3001, () => {
    console.log('测试服务器运行在端口 3001');
});

