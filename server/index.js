const express = require('express');
const cors = require('cors');
const db = require('./db');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.JWT_SECRET || 'PLEASE_CHANGE_THIS_SECRET_IN_ENV'; // 密钥
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456'; // 真正的密码

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// 1. 安全中间件 (Helmet)
app.use(helmet()); 
app.use(cors());
app.use(express.json());

// --- 中间件：验证 Token (保安) ---
const authenticateToken = (req, res, next) => {
  // 从请求头获取 Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // 没票？滚蛋

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403); // 票是假的？滚蛋
    req.user = user;
    next(); // 放行
  });
};

// --- 路由 ---

// [新增] 登录接口
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  // 这里比对环境变量里的密码
  if (password === ADMIN_PASSWORD) {
    // 密码正确，签发 Token，有效期 24小时
    const token = jwt.sign({ role: 'admin' }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Wrong password' });
  }
});

// GET 接口保持公开 (Guest 可看)
app.get('/api/cases', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM cases ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/notes', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM notes ORDER BY id ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// === 下面的写操作，全部加上 authenticateToken 保护 ===

app.post('/api/cases', authenticateToken, async (req, res) => {
  const { id, title, category, priority, description, resolution, created_at, resolved_at } = req.body;
  // XSS 清洗
  const cleanDesc = DOMPurify.sanitize(description);
  const cleanRes = DOMPurify.sanitize(resolution);
  
  try {
    await db.query(
      'INSERT INTO cases (id, title, category, priority, description, resolution, created_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, category, priority, cleanDesc, cleanRes, created_at, resolved_at]
    );
    res.status(201).json({ message: 'Success' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/cases/:id', authenticateToken, async (req, res) => {
  const { title, category, priority, description, resolution, resolved_at } = req.body;
  const cleanDesc = DOMPurify.sanitize(description);
  const cleanRes = DOMPurify.sanitize(resolution);

  try {
    await db.query(
      'UPDATE cases SET title=?, category=?, priority=?, description=?, resolution=?, resolved_at=? WHERE id=?',
      [title, category, priority, cleanDesc, cleanRes, resolved_at, req.params.id]
    );
    res.json({ message: 'Updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/cases/:id', authenticateToken, async (req, res) => {
  try {
    await db.query('DELETE FROM cases WHERE id=?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/notes', authenticateToken, async (req, res) => {
  const { category, content } = req.body;
  // XSS 清洗：防止有人在笔记里写 <script>alert(1)</script>
  const cleanContent = DOMPurify.sanitize(content);
  
  try {
    const [result] = await db.query('INSERT INTO notes (category, content) VALUES (?, ?)', [category, cleanContent]);
    res.json({ id: result.insertId, category, content: cleanContent });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/notes/:id', authenticateToken, async (req, res) => {
  const cleanContent = DOMPurify.sanitize(req.body.content);
  try {
    await db.query('UPDATE notes SET content=? WHERE id=?', [cleanContent, req.params.id]);
    res.json({ message: 'Updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    await db.query('DELETE FROM notes WHERE id=?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => console.log(`Secure Server running on port ${PORT}`));