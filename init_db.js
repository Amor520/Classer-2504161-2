const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || '1.92.146.109',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'mysqlpass',
  database: process.env.DB_NAME || 'Classer'
};

// 要创建的表结构
const tables = [
  // 管理员表
  `CREATE TABLE IF NOT EXISTS admin (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    role INT NOT NULL DEFAULT 1 COMMENT '1=普通管理员, 2=超级管理员',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  
  // 管理员密码表
  `CREATE TABLE IF NOT EXISTS admin_pwd (
    admin_id VARCHAR(36) PRIMARY KEY,
    password VARCHAR(100) NOT NULL,
    FOREIGN KEY (admin_id) REFERENCES admin(id) ON DELETE CASCADE
  )`,
  
  // 表单表
  `CREATE TABLE IF NOT EXISTS form (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    questions TEXT NOT NULL,
    admin_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admin(id)
  )`,
  
  // 用户信息表
  `CREATE TABLE IF NOT EXISTS user_info (
    id VARCHAR(36) PRIMARY KEY,
    qq_number VARCHAR(15),
    nickname VARCHAR(50),
    class_number VARCHAR(20),
    student_id VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  
  // 表单回答表
  `CREATE TABLE IF NOT EXISTS response (
    id VARCHAR(36) PRIMARY KEY,
    form_id VARCHAR(36) NOT NULL,
    answers TEXT NOT NULL,
    user_info_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (form_id) REFERENCES form(id) ON DELETE CASCADE,
    FOREIGN KEY (user_info_id) REFERENCES user_info(id) ON DELETE SET NULL
  )`
];

// 创建管理员表
const createAdminTables = async (connection) => {
  try {
    console.log('创建管理员表...');
    
    // 创建管理员表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        role INT NOT NULL DEFAULT 1 COMMENT '1=普通管理员, 2=超级管理员',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 创建管理员密码表 (独立存储密码)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_pwd (
        admin_id VARCHAR(36) PRIMARY KEY,
        password VARCHAR(100) NOT NULL,
        FOREIGN KEY (admin_id) REFERENCES admin(id) ON DELETE CASCADE
      );
    `);
    
    // 检查是否已存在超级管理员
    const [rows] = await connection.query(`
      SELECT * FROM admin WHERE role = 2 LIMIT 1
    `);
    
    // 如果没有超级管理员，创建默认账号
    if (rows.length === 0) {
      const uuid = require('uuid').v4;
      const adminId = uuid();
      
      // 创建默认超级管理员
      await connection.query(`
        INSERT INTO admin (id, username, role) VALUES (?, ?, 2)
      `, [adminId, 'admin']);
      
      // 设置默认密码
      await connection.query(`
        INSERT INTO admin_pwd (admin_id, password) VALUES (?, ?)
      `, [adminId, 'admin123']);
      
      console.log('创建了默认超级管理员账号: admin / admin123');
    }
    
    console.log('管理员表创建完成');
  } catch (error) {
    console.error('创建管理员表出错:', error);
    throw error;
  }
};

// 初始化数据库
const initDb = async () => {
  let connection;
  
  try {
    // 连接数据库
    connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');
    
    // 创建表
    for (const sql of tables) {
      await connection.query(sql);
      console.log('表创建成功');
    }
    
    // 创建管理员表
    await createAdminTables(connection);
    
    console.log('数据库初始化完成');
    
  } catch (error) {
    console.error('数据库初始化失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
};

// 执行初始化
initDb();
