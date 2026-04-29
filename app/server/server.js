const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../www')));

const upload = multer({ storage: multer.memoryStorage() });

app.get('/api/get-content', async (req, res) => {
    let filePath = req.query.path;
    console.log('get-content called:', { filePath });
    
    try {
        // 处理URL编码的路径
        filePath = decodeURIComponent(filePath);
        
        // 确保路径规范化
        filePath = path.normalize(filePath);
        console.log('Normalized path:', filePath);
        
        const content = await fs.readFile(filePath, 'utf-8');
        res.json({ content });
    } catch (err) { 
        console.error('Read error:', err);
        res.status(500).json({ error: "Read Error", message: err.message }); 
    }
});

app.post('/api/save-content', async (req, res) => {
    let filePath = req.body.path;
    const content = req.body.content;
    console.log('save-content called:', { filePath });
    
    try {
        // 处理路径
        filePath = path.normalize(filePath);
        console.log('Normalized path:', filePath);
        
        await fs.writeFile(filePath, content, 'utf-8');
        res.json({ code: 0 });
    } catch (err) { 
        console.error('Save error:', err);
        res.status(500).json({ error: "Save Error", message: err.message }); 
    }
});

app.post('/api/upload-image', upload.single('file'), async (req, res) => {
    let mdFilePath = req.body.currentMdPath;
    
    if (!mdFilePath) return res.status(400).json({ code: 1, msg: "Path missing" });

    if (process.platform === 'win32') {
        mdFilePath = mdFilePath.replace(/([a-zA-Z]):\//g, '$1:/').replace(/\//g, path.sep);
    }
    
    mdFilePath = path.normalize(mdFilePath);
    
    const parentDir = path.dirname(mdFilePath);
    const photosDir = path.join(parentDir, 'photos');

    try {
        await fs.ensureDir(photosDir);
        const fileName = `img_${Date.now()}.png`;
        const absolutePath = path.join(photosDir, fileName); 
        await fs.writeFile(absolutePath, req.file.buffer);

        res.json({
            code: 0,
            data: { url: absolutePath }
        });
    } catch (err) { 
        res.status(500).json({ code: 1, msg: err.message }); 
    }
});

app.get('/api/view-abs-img', (req, res) => {
    const absPath = req.query.absPath;
    if (absPath && fs.existsSync(absPath)) {
        res.sendFile(absPath);
    } else {
        res.status(404).send("Image Not Found");
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务已启动: http://localhost:${PORT}`);
    console.log(`当前运行平台: ${process.platform}`);
});