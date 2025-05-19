const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// 创建抽签池表（如果不存在）
db.serialize(() => {
  // 抽签池表
  db.run(`CREATE TABLE IF NOT EXISTS draw_pool (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,       -- 学生姓名
    is_available INTEGER DEFAULT 1,  -- 是否可抽，1可抽，0已抽
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 抽签记录表
  db.run(`CREATE TABLE IF NOT EXISTS draw_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_name TEXT NOT NULL,  -- 活动名称
    draw_count INTEGER NOT NULL,  -- 抽签数量
    drawn_names TEXT NOT NULL,    -- 抽中的名字，逗号分隔
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// 抽签系统模型
const DrawModel = {
  // 初始化抽签池
  initPool: function(names, callback) {
    // 首先清空抽签池
    db.run('DELETE FROM draw_pool', function(err) {
      if (err) {
        return callback(err);
      }

      // 准备批量插入语句
      const stmt = db.prepare('INSERT INTO draw_pool (name) VALUES (?)');
      
      // 插入所有名字
      names.forEach(name => {
        stmt.run(name);
      });
      
      // 完成插入
      stmt.finalize(callback);
    });
  },

  // 获取抽签池中所有学生
  getAllStudents: function(callback) {
    db.all('SELECT * FROM draw_pool ORDER BY id', callback);
  },

  // 获取可抽的学生
  getAvailableStudents: function(callback) {
    db.all('SELECT * FROM draw_pool WHERE is_available = 1 ORDER BY id', callback);
  },

  // 获取已抽的学生
  getDrawnStudents: function(callback) {
    db.all('SELECT * FROM draw_pool WHERE is_available = 0 ORDER BY id', callback);
  },

  // 抽签
  drawStudents: function(count, activityName, callback) {
    // 首先获取所有可抽的学生
    this.getAvailableStudents((err, students) => {
      if (err) {
        return callback(err);
      }

      // 如果可抽学生数量不足
      if (students.length < count) {
        return callback(new Error(`可抽学生数量不足，当前只有 ${students.length} 名学生可抽`));
      }

      // 随机抽取指定数量的学生
      const drawnStudents = [];
      const availableIndices = Array.from({ length: students.length }, (_, i) => i);
      
      for (let i = 0; i < count; i++) {
        // 随机选择一个索引
        const randomIndex = Math.floor(Math.random() * availableIndices.length);
        const studentIndex = availableIndices[randomIndex];
        
        // 将学生添加到已抽列表
        drawnStudents.push(students[studentIndex]);
        
        // 从可用索引中移除已抽的索引
        availableIndices.splice(randomIndex, 1);
      }

      // 更新已抽学生状态
      const drawnIds = drawnStudents.map(student => student.id);
      const placeholders = drawnIds.map(() => '?').join(',');
      
      db.run(`UPDATE draw_pool SET is_available = 0 WHERE id IN (${placeholders})`, drawnIds, function(err) {
        if (err) {
          return callback(err);
        }

        // 添加抽签记录
        const drawnNames = drawnStudents.map(student => student.name).join(',');
        db.run('INSERT INTO draw_history (activity_name, draw_count, drawn_names) VALUES (?, ?, ?)', 
              [activityName, count, drawnNames], function(err) {
          if (err) {
            return callback(err);
          }

          callback(null, drawnStudents);
        });
      });
    });
  },

  // 重置抽签池（所有学生恢复可抽状态）
  resetPool: function(callback) {
    db.run('UPDATE draw_pool SET is_available = 1', callback);
  },

  // 获取抽签历史记录
  getDrawHistory: function(callback) {
    db.all('SELECT * FROM draw_history ORDER BY created_at DESC', callback);
  },

  // 删除抽签历史记录
  deleteDrawHistory: function(id, callback) {
    db.run('DELETE FROM draw_history WHERE id = ?', [id], callback);
  }
};

module.exports = DrawModel; 