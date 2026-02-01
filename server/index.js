const express = require('express');
const cors = require('cors');
const db = require('./db');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const logger = require('./logger'); // [新增] 引入日志工具
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.JWT_SECRET || 'PLEASE_CHANGE_THIS_SECRET_IN_ENV';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

app.use(helmet()); 
app.use(cors());
app.use(express.json());

// --- [新增] 全局请求日志中间件 (记录每一笔流水) ---
app.use((req, res, next) => {
  // 排除掉不重要的请求比如 favicon
  if (req.url !== '/favicon.ico') {
    logger.info(`Incoming Request: ${req.method} ${req.url}`, {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
  }
  next();
});

// --- 鉴权中间件 (带审计日志) ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    logger.warn('Auth Failed: No token provided', { ip: req.ip, endpoint: req.url });
    return res.sendStatus(401);
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      logger.warn('Auth Failed: Invalid token', { ip: req.ip, error: err.message });
      return res.sendStatus(403);
    }
    req.user = user; // 也就是 { role: 'admin' }
    next();
  });
};

// --- 路由 ---

// 登录接口
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  // 注意：千万不要 log 用户的明文密码！
  if (password === ADMIN_PASSWORD) {
    logger.info('Login Successful', { ip: req.ip, role: 'admin' });
    const token = jwt.sign({ role: 'admin' }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token });
  } else {
    logger.warn('Login Failed: Wrong password', { ip: req.ip });
    res.status(401).json({ error: 'Wrong password' });
  }
});

// GET 接口 (公开)
app.get('/api/cases', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM cases ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { 
    logger.error('Database Error (Get Cases)', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal Server Error' }); 
  }
});

app.get('/api/notes', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM notes ORDER BY id ASC');
    res.json(rows);
  } catch (err) { 
    logger.error('Database Error (Get Notes)', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal Server Error' }); 
  }
});

// === 写操作 (需鉴权 + 详细日志) ===

app.post('/api/cases', authenticateToken, async (req, res) => {
  const { id, title, category, priority, description, resolution, created_at, resolved_at } = req.body;
  const cleanDesc = DOMPurify.sanitize(description);
  const cleanRes = DOMPurify.sanitize(resolution);
  
  try {
    await db.query(
      'INSERT INTO cases (id, title, category, priority, description, resolution, created_at, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, category, priority, cleanDesc, cleanRes, created_at, resolved_at]
    );
    // [关键] 记录谁创建了什么
    logger.info('Case Created', { user: req.user.role, caseId: id, title: title });
    res.status(201).json({ message: 'Success' });
  } catch (err) { 
    logger.error('Create Case Failed', { 
      user: req.user.role, 
      payload: { id, title, category }, // 记录关键参数方便复现
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ error: err.message }); 
  }
});

app.put('/api/cases/:id', authenticateToken, async (req, res) => {
  const { title, category, priority, description, resolution, resolved_at } = req.body;
  // ... 省略重复的 sanitize 过程 ...
  const cleanDesc = DOMPurify.sanitize(description);
  const cleanRes = DOMPurify.sanitize(resolution);

  try {
    await db.query(
      'UPDATE cases SET title=?, category=?, priority=?, description=?, resolution=?, resolved_at=? WHERE id=?',
      [title, category, priority, cleanDesc, cleanRes, resolved_at, req.params.id]
    );
    logger.info('Case Updated', { user: req.user.role, caseId: req.params.id });
    res.json({ message: 'Updated' });
  } catch (err) { 
    logger.error('Update Case Failed', { user: req.user.role, caseId: req.params.id, error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message }); 
  }
});

app.delete('/api/cases/:id', authenticateToken, async (req, res) => {
  try {
    await db.query('DELETE FROM cases WHERE id=?', [req.params.id]);
    logger.warn('Case Deleted', { user: req.user.role, caseId: req.params.id }); // 删除操作用 warn 级别引起注意
    res.json({ message: 'Deleted' });
  } catch (err) { 
    logger.error('Delete Case Failed', { user: req.user.role, caseId: req.params.id, error: err.message });
    res.status(500).json({ error: err.message }); 
  }
});

app.post('/api/notes', authenticateToken, async (req, res) => {
  const { category, content } = req.body;
  const cleanContent = DOMPurify.sanitize(content);
  
  try {
    const [result] = await db.query('INSERT INTO notes (category, content) VALUES (?, ?)', [category, cleanContent]);
    logger.info('Note Created', { user: req.user.role, category, noteId: result.insertId });
    res.json({ id: result.insertId, category, content: cleanContent });
  } catch (err) { 
    logger.error('Create Note Failed', { user: req.user.role, category, error: err.message });
    res.status(500).json({ error: err.message }); 
  }
});

app.put('/api/notes/:id', authenticateToken, async (req, res) => {
  const cleanContent = DOMPurify.sanitize(req.body.content);
  try {
    await db.query('UPDATE notes SET content=? WHERE id=?', [cleanContent, req.params.id]);
    logger.info('Note Updated', { user: req.user.role, noteId: req.params.id });
    res.json({ message: 'Updated' });
  } catch (err) { 
    logger.error('Update Note Failed', { user: req.user.role, noteId: req.params.id, error: err.message });
    res.status(500).json({ error: err.message }); 
  }
});

app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    await db.query('DELETE FROM notes WHERE id=?', [req.params.id]);
    logger.warn('Note Deleted', { user: req.user.role, noteId: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (err) { 
    logger.error('Delete Note Failed', { user: req.user.role, noteId: req.params.id, error: err.message });
    res.status(500).json({ error: err.message }); 
  }
});

app.listen(PORT, () => {
  // 启动时记录一条 Info
  logger.info(`🚀 Secure Server with Logging running on port ${PORT}`);
});