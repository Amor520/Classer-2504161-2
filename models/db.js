const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // 10 秒
  connectTimeout: 60000 // 60 秒
});

// 监听连接事件
pool.on('connection', (connection) => {
  console.log('数据库连接已建立');
  
  connection.on('error', (err) => {
    console.error('数据库连接错误:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
      console.log('尝试重新连接...');
    }
  });
});

// 定期检查连接是否有效
setInterval(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('数据库连接正常');
  } catch (error) {
    console.error('数据库连接检查失败:', error);
  }
}, 30000); // 每30秒检查一次

module.exports = pool;
//asjkdad