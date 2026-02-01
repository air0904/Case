// server/db.js 
const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // 增加连接超时设置，防止请求一直转圈
  connectTimeout: 10000 
});

// ⚠️ 重要：监听连接池错误并打印到控制台
pool.on('connection', () => {
  console.log('✨ 数据库连接池已建立新连接');
});

pool.on('error', (err) => {
  console.error('❌ 数据库连接池发生错误:', err.message);
});

const promisePool = pool.promise();
module.exports = promisePool;