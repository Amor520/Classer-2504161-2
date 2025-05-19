const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// 添加数据库迁移函数
function migrateDatabase() {
  console.log('开始检查数据库结构...');
  
  // 检查draw_history表是否有signed_names列
  db.get("PRAGMA table_info(draw_history)", (err, rows) => {
    if (err) {
      console.error('检查表结构出错:', err);
      return;
    }
    
    // 判断是否包含signed_names列
    const hasSignedNames = rows && Array.isArray(rows) && rows.some(row => row.name === 'signed_names');
    
    if (!hasSignedNames) {
      console.log('需要升级数据库结构: 添加signed_names列');
      
      // 添加signed_names列
      db.run('ALTER TABLE draw_history ADD COLUMN signed_names TEXT', (err) => {
        if (err) {
          console.error('添加signed_names列失败:', err);
        } else {
          console.log('成功添加signed_names列');
        }
        
        db.close(() => {
          console.log('数据库连接已关闭');
        });
      });
    } else {
      console.log('数据库结构已是最新状态，无需升级');
      db.close(() => {
        console.log('数据库连接已关闭');
      });
    }
  });
}

// 执行迁移
migrateDatabase(); 