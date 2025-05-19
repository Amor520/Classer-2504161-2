const sqlite3 = require('sqlite3').verbose();

// 添加更多的错误处理
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('数据库连接错误:', err.message);
    throw err;
  } else {
    console.log('已连接到抽签系统数据库');
  }
});

// 优化数据库配置
db.on('error', (err) => {
  console.error('数据库错误:', err.message);
});

// 配置，减少并发操作导致的"database is locked"错误
db.configure('busyTimeout', 3000); // 设置3秒的忙碌超时

// 创建抽签池表（如果不存在）
db.serialize(() => {
  // 抽签池表
  db.run(`CREATE TABLE IF NOT EXISTS draw_pool (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,       -- 学生姓名
    is_available INTEGER DEFAULT 1,  -- 是否可抽，1可抽，0已抽
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('创建抽签池表失败:', err.message);
    } else {
      console.log('抽签池表检查完成');
    }
  });

  // 抽签记录表
  db.run(`CREATE TABLE IF NOT EXISTS draw_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_name TEXT NOT NULL,  -- 活动名称
    draw_count INTEGER NOT NULL,  -- 抽签数量
    drawn_names TEXT NOT NULL,    -- 抽中的名字，逗号分隔
    signed_names TEXT,           -- 已报名学生名字，逗号分隔
    excluded_names TEXT,         -- 不参与抽签的学生名字，逗号分隔
    exclude_reason TEXT,         -- 不参与抽签原因
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('创建抽签记录表失败:', err.message);
    } else {
      console.log('抽签记录表检查完成');
      
      // 检查是否需要添加新列
      db.get("PRAGMA table_info(draw_history)", (err, rows) => {
        if (!err) {
          // 检查是否已存在excluded_names列
          db.get("SELECT COUNT(*) as count FROM pragma_table_info('draw_history') WHERE name = 'excluded_names'", (err, row) => {
            if (!err && row && row.count === 0) {
              // 添加excluded_names列
              db.run("ALTER TABLE draw_history ADD COLUMN excluded_names TEXT", (err) => {
                if (err) {
                  console.error('添加excluded_names列失败:', err.message);
                } else {
                  console.log('已添加excluded_names列');
                }
              });
            }
          });
          
          // 检查是否已存在exclude_reason列
          db.get("SELECT COUNT(*) as count FROM pragma_table_info('draw_history') WHERE name = 'exclude_reason'", (err, row) => {
            if (!err && row && row.count === 0) {
              // 添加exclude_reason列
              db.run("ALTER TABLE draw_history ADD COLUMN exclude_reason TEXT", (err) => {
                if (err) {
                  console.error('添加exclude_reason列失败:', err.message);
                } else {
                  console.log('已添加exclude_reason列');
                }
              });
            }
          });
        }
      });
    }
  });
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
  drawStudents: function(count, activityName, signedStudents, excludedStudents, excludeReason, callback) {
    // 首先获取所有可抽的学生
    this.getAvailableStudents((err, students) => {
      if (err) {
        return callback(err);
      }
      
      // 处理排除学生的ID
      const excludedIds = excludedStudents ? excludedStudents.map(s => parseInt(s.id)) : [];
      
      // 处理已报名学生的ID，这些学生不应该被随机抽取
      const signedIds = signedStudents ? signedStudents.map(s => parseInt(s.id)) : [];
      
      // 过滤出可以抽签的学生（排除已标记为不参与的学生和已报名的学生）
      const availableForDraw = students.filter(student => 
        !excludedIds.includes(parseInt(student.id)) && 
        !signedIds.includes(parseInt(student.id))
      );

      // 如果可抽学生数量不足
      if (availableForDraw.length < count) {
        return callback(new Error(`可抽学生数量不足，当前只有 ${availableForDraw.length} 名学生可抽`));
      }

      // 随机抽取指定数量的学生
      const randomDrawnStudents = [];
      const availableIndices = Array.from({ length: availableForDraw.length }, (_, i) => i);
      
      for (let i = 0; i < count; i++) {
        // 随机选择一个索引
        const randomIndex = Math.floor(Math.random() * availableIndices.length);
        const studentIndex = availableIndices[randomIndex];
        
        // 将学生添加到已抽列表
        randomDrawnStudents.push(availableForDraw[studentIndex]);
        
        // 从可用索引中移除已抽的索引
        availableIndices.splice(randomIndex, 1);
      }
      
      // 加入已报名参加的学生
      let finalDrawnStudents = [...randomDrawnStudents];
      
      // 处理已报名学生
      if (signedStudents && signedStudents.length > 0) {
        signedStudents.forEach(student => {
          student.isSigned = true;
          // 转换ID为整数，避免字符串比较问题
          student.id = parseInt(student.id);
          finalDrawnStudents.push(student);
        });
      }

      // 更新已抽学生状态（仅更新随机抽取的学生，不更新已报名的学生）
      const drawnIds = randomDrawnStudents.map(student => student.id);
      
      // 如果没有需要更新的ID，直接添加记录
      if (drawnIds.length === 0) {
        // 处理全部是已报名学生的情况
        const allNames = finalDrawnStudents.map(student => student.name).join(',');
        // 获取已报名学生名字列表
        const signedNamesStr = signedStudents ? signedStudents.map(student => student.name).join(',') : '';
        
        // 获取不参与抽签的学生名字列表
        const excludedNamesStr = excludedStudents ? excludedStudents.map(student => student.name).join(',') : '';
        
        // 检查表结构是否包含新的列
        db.all("PRAGMA table_info(draw_history)", (err, rows) => {
          if (err) {
            console.error("检查表结构失败:", err);
            // 如果检查失败，尝试使用基本的方式插入
            db.run('INSERT INTO draw_history (activity_name, draw_count, drawn_names) VALUES (?, ?, ?)', 
                  [activityName, finalDrawnStudents.length, allNames], function(err) {
              if (err) {
                return callback(err);
              }

              callback(null, finalDrawnStudents);
            });
            return;
          }
          
          // 检查表中的列
          const columns = rows.map(row => row.name);
          const hasSignedNames = columns.includes('signed_names');
          const hasExcludedNames = columns.includes('excluded_names');
          const hasExcludeReason = columns.includes('exclude_reason');
          
          // 构建插入语句和参数
          let insertColumns = ['activity_name', 'draw_count', 'drawn_names'];
          let insertValues = [activityName, finalDrawnStudents.length, allNames];
          let placeholders = ['?', '?', '?'];
          
          if (hasSignedNames) {
            insertColumns.push('signed_names');
            insertValues.push(signedNamesStr);
            placeholders.push('?');
          }
          
          if (hasExcludedNames) {
            insertColumns.push('excluded_names');
            insertValues.push(excludedNamesStr);
            placeholders.push('?');
          }
          
          if (hasExcludeReason && excludeReason) {
            insertColumns.push('exclude_reason');
            insertValues.push(excludeReason);
            placeholders.push('?');
          }
          
          const insertQuery = `INSERT INTO draw_history (${insertColumns.join(', ')}) VALUES (${placeholders.join(', ')})`;
          
          // 执行插入
          db.run(insertQuery, insertValues, function(err) {
            if (err) {
              console.error("保存抽签记录失败:", err);
              return callback(err);
            }
            
            callback(null, finalDrawnStudents);
          });
        });
        return;
      }
      
      // 有随机抽取的学生，需要更新其状态
      const placeholders = drawnIds.map(() => '?').join(',');
      
      db.run(`UPDATE draw_pool SET is_available = 0 WHERE id IN (${placeholders})`, drawnIds, function(err) {
        if (err) {
          console.error("更新学生状态失败:", err);
          return callback(err);
        }

        // 添加抽签记录，包括随机抽取的和已报名的
        const allNames = finalDrawnStudents.map(student => student.name).join(',');
        // 获取已报名学生名字列表
        const signedNamesStr = signedStudents ? signedStudents.map(student => student.name).join(',') : '';
        
        // 获取不参与抽签的学生名字列表
        const excludedNamesStr = excludedStudents ? excludedStudents.map(student => student.name).join(',') : '';
        
        // 检查表结构是否包含新的列
        db.all("PRAGMA table_info(draw_history)", (err, rows) => {
          if (err) {
            console.error("检查表结构失败:", err);
            // 如果检查失败，尝试使用基本的方式插入
            db.run('INSERT INTO draw_history (activity_name, draw_count, drawn_names) VALUES (?, ?, ?)', 
                  [activityName, finalDrawnStudents.length, allNames], function(err) {
              if (err) {
                return callback(err);
              }

              callback(null, finalDrawnStudents);
            });
            return;
          }
          
          // 检查表中的列
          const columns = rows.map(row => row.name);
          const hasSignedNames = columns.includes('signed_names');
          const hasExcludedNames = columns.includes('excluded_names');
          const hasExcludeReason = columns.includes('exclude_reason');
          
          // 构建插入语句和参数
          let insertColumns = ['activity_name', 'draw_count', 'drawn_names'];
          let insertValues = [activityName, finalDrawnStudents.length, allNames];
          let placeholders = ['?', '?', '?'];
          
          if (hasSignedNames) {
            insertColumns.push('signed_names');
            insertValues.push(signedNamesStr);
            placeholders.push('?');
          }
          
          if (hasExcludedNames) {
            insertColumns.push('excluded_names');
            insertValues.push(excludedNamesStr);
            placeholders.push('?');
          }
          
          if (hasExcludeReason && excludeReason) {
            insertColumns.push('exclude_reason');
            insertValues.push(excludeReason);
            placeholders.push('?');
          }
          
          const insertQuery = `INSERT INTO draw_history (${insertColumns.join(', ')}) VALUES (${placeholders.join(', ')})`;
          
          // 执行插入
          db.run(insertQuery, insertValues, function(err) {
            if (err) {
              console.error("保存抽签记录失败:", err);
              return callback(err);
            }
            
            callback(null, finalDrawnStudents);
          });
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

  // 获取指定ID的抽签历史记录
  getDrawHistoryById: function(id, callback) {
    db.get('SELECT * FROM draw_history WHERE id = ?', [id], callback);
  },
  
  // 删除单条抽签历史记录
  deleteDrawHistory: function(id, callback) {
    db.run('DELETE FROM draw_history WHERE id = ?', [id], callback);
  },
  
  // 删除所有抽签历史记录
  deleteAllDrawHistory: function(callback) {
    // 首先获取历史记录总数，用于确认删除是否成功
    db.get('SELECT COUNT(*) as count FROM draw_history', (err, result) => {
      if (err) {
        console.error('获取抽签历史记录数量失败:', err);
        return callback(err);
      }
      
      const recordCount = result.count;
      
      // 如果没有记录，直接返回成功
      if (recordCount === 0) {
        return callback(null);
      }
      
      // 执行删除操作
      db.run('DELETE FROM draw_history', function(err) {
        if (err) {
          console.error('删除所有抽签历史记录失败:', err);
          return callback(err);
        }
        
        // 确认已删除的记录数量
        if (this.changes !== recordCount) {
          console.warn(`删除操作不完整: 预期删除 ${recordCount} 条记录，实际删除 ${this.changes} 条`);
        }
        
        callback(null);
      });
    });
  },
  
  // 恢复已抽学生到抽签池
  restoreDrawnStudentsToPool: function(drawnNames, callback) {
    const names = drawnNames.split(',');
    if (!names || names.length === 0) {
      return callback(null);
    }
    
    // 将多个学生名字格式化为SQL IN子句的参数
    const placeholders = names.map(() => '?').join(',');
    const query = `UPDATE draw_pool SET is_available = 1 WHERE name IN (${placeholders})`;
    
    db.run(query, names, callback);
  },
  
  // 获取抽签记录数量
  getDrawHistoryCount: function(callback) {
    db.get('SELECT COUNT(*) as count FROM draw_history', (err, row) => {
      if (err) {
        return callback(err);
      }
      callback(null, row ? row.count : 0);
    });
  }
};

module.exports = DrawModel; 