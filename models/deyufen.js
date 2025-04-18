const db = require('./db');

class DeyufenModel {
  // 获取德育分总览 - 按总分降序
  async getOverview() {
    try {
      const [rows] = await db.query('SELECT * FROM deyufen_overview ORDER BY 总分 DESC');
      return rows;
    } catch (error) {
      console.error('Error fetching deyufen overview:', error);
      throw error;
    }
  }

  // 获取德育分总览 - 按学号升序
  async getOverviewByStudentId() {
    try {
      const [rows] = await db.query('SELECT * FROM deyufen_overview ORDER BY 学号 ASC');
      return rows;
    } catch (error) {
      console.error('Error fetching deyufen overview by student ID:', error);
      throw error;
    }
  }

  // 获取学生德育分明细
  async getStudentDetail(studentId) {
    try {
      const [student] = await db.query('SELECT * FROM deyufen_overview WHERE 学号 = ?', [studentId]);
      return student[0] || null;
    } catch (error) {
      console.error('Error fetching student detail:', error);
      throw error;
    }
  }

  // 获取活动列表
  async getActivities() {
    try {
      const [rows] = await db.query('SELECT * FROM activities ORDER BY 活动日期 DESC');
      console.log(`获取到 ${rows.length} 个活动`);
      return rows;
    } catch (error) {
      console.error('Error fetching activities:', error);
      throw error;
    }
  }

  // 获取活动参与情况
  async getActivityParticipants(activityId) {
    try {
      const [rows] = await db.query(`
        SELECT s.学号, s.姓名, sa.加分
        FROM students s
        JOIN student_activities sa ON s.学号 = sa.学号
        WHERE sa.活动ID = ?
        ORDER BY sa.加分 DESC
      `, [activityId]);
      return rows;
    } catch (error) {
      console.error('Error fetching activity participants:', error);
      throw error;
    }
  }

  // 添加新活动
  async addActivity(activityData) {
    try {
      console.log('添加活动到数据库:', activityData);
      
      // 检查activities表结构
      try {
        const [columns] = await db.query('SHOW COLUMNS FROM activities');
        console.log('活动表字段:', columns.map(col => col.Field).join(', '));
        
        // 检查必需字段是否存在
        const requiredFields = ['活动ID', '活动名称', '活动日期'];
        const existingFields = columns.map(col => col.Field);
        
        for (const field of requiredFields) {
          if (!existingFields.includes(field)) {
            console.error(`活动表缺少必需字段: ${field}`);
          }
        }
      } catch (error) {
        console.error('检查活动表结构时出错:', error);
      }
      
      // 准备插入数据
      const insertFields = [];
      const insertValues = [];
      const placeholders = [];
      
      // 活动名称 - 必填
      insertFields.push('活动名称');
      insertValues.push(activityData.name);
      placeholders.push('?');
      
      // 活动日期 - 必填
      insertFields.push('活动日期');
      insertValues.push(activityData.date);
      placeholders.push('?');
      
      // 备注 - 可选
      if (activityData.description) {
        insertFields.push('备注');
        insertValues.push(activityData.description);
        placeholders.push('?');
      }
      
      // 默认分值 - 可选，但建议添加
      if ('defaultScore' in activityData) {
        insertFields.push('默认分值');
        insertValues.push(activityData.defaultScore);
        placeholders.push('?');
      }
      
      const query = `INSERT INTO activities (${insertFields.join(', ')}) VALUES (${placeholders.join(', ')})`;
      console.log('执行SQL:', query);
      
      const [result] = await db.query(query, insertValues);
      console.log('数据库返回结果:', result);
      
      return result.insertId;
    } catch (error) {
      console.error('添加活动失败:', error);
      
      // 特殊处理特定错误
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.error('activities表不存在，尝试创建表');
        await this.createActivitiesTable();
        throw new Error('数据表不存在，已尝试创建，请重试');
      }
      
      throw error;
    }
  }

  // 创建活动表（如果不存在）
  async createActivitiesTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS activities (
          活动ID INT AUTO_INCREMENT PRIMARY KEY,
          活动名称 VARCHAR(100) NOT NULL,
          活动日期 DATE,
          备注 VARCHAR(200),
          默认分值 FLOAT DEFAULT 0,
          创建时间 TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `;
      
      console.log('尝试创建activities表');
      await db.query(query);
      console.log('activities表创建成功');
      return true;
    } catch (error) {
      console.error('创建activities表失败:', error);
      throw error;
    }
  }

  // 获取所有学生列表
  async getAllStudents() {
    try {
      const [rows] = await db.query('SELECT * FROM students ORDER BY 学号 ASC');
      return rows;
    } catch (error) {
      console.error('Error fetching students:', error);
      throw error;
    }
  }

  // 为多个学生添加活动分值
  async addStudentsToActivity(activityId, studentScores) {
    try {
      console.log(`为活动${activityId}添加${studentScores.length}名学生的分值`);
      
      // 使用事务确保数据一致性
      await db.query('START TRANSACTION');
      
      for (const entry of studentScores) {
        try {
          // 先检查该学生是否已经有该活动的记录
          const [existingRecord] = await db.query(
            'SELECT * FROM student_activities WHERE 学号 = ? AND 活动ID = ?',
            [entry.studentId, activityId]
          );
          
          if (existingRecord && existingRecord.length > 0) {
            // 如果记录已存在，则更新
            console.log(`学生 ${entry.studentId} 已有活动 ${activityId} 的记录，正在更新...`);
            await db.query(
              'UPDATE student_activities SET 加分 = ? WHERE 学号 = ? AND 活动ID = ?',
              [entry.score, entry.studentId, activityId]
            );
          } else {
            // 否则插入新记录
            console.log(`为学生 ${entry.studentId} 添加活动 ${activityId} 的记录...`);
            await db.query(
              'INSERT INTO student_activities (学号, 活动ID, 加分) VALUES (?, ?, ?)',
              [entry.studentId, activityId, entry.score]
            );
          }
        } catch (entryError) {
          console.error(`处理学生 ${entry.studentId} 时出错:`, entryError);
          throw entryError; // 继续抛出错误，触发事务回滚
        }
      }
      
      await db.query('COMMIT');
      console.log(`成功为活动 ${activityId} 添加/更新了 ${studentScores.length} 名学生的分值`);
      return true;
    } catch (error) {
      console.error('为学生添加活动分值时出错:', error);
      
      // 详细记录错误信息
      if (error.sql) {
        console.error('SQL查询:', error.sql);
      }
      if (error.sqlMessage) {
        console.error('SQL错误信息:', error.sqlMessage);
      }
      
      // 发生错误时回滚事务
      try {
        await db.query('ROLLBACK');
        console.log('已回滚事务');
      } catch (rollbackError) {
        console.error('回滚事务时出错:', rollbackError);
      }
      
      throw error;
    }
  }

  // 更新单个学生的活动分值
  async updateStudentActivityScore(studentId, activityId, score) {
    try {
      console.log(`开始更新学生 ${studentId} 在活动 ${activityId} 的分值为 ${score}`);
      
      // 确保score是数值类型
      const numericScore = parseFloat(score) || 0;
      
      const [result] = await db.query(
        'UPDATE student_activities SET 加分 = ? WHERE 学号 = ? AND 活动ID = ?',
        [numericScore, studentId, activityId]
      );
      
      console.log(`更新结果:`, result);
      
      if (result.affectedRows === 0) {
        // 如果记录不存在，则插入新记录
        console.log(`未找到要更新的记录，尝试插入新记录...`);
        const [insertResult] = await db.query(
          'INSERT INTO student_activities (学号, 活动ID, 加分) VALUES (?, ?, ?)',
          [studentId, activityId, numericScore]
        );
        
        console.log(`插入结果:`, insertResult);
        
        if (insertResult.affectedRows === 0) {
          console.error(`插入失败: 没有创建任何记录`);
          return false;
        }
      }
      
      console.log(`成功更新学生 ${studentId} 在活动 ${activityId} 的分值为 ${numericScore}`);
      return true;
    } catch (error) {
      console.error('更新学生活动分值失败:', error);
      
      // 详细记录错误信息
      if (error.sql) {
        console.error('SQL查询:', error.sql);
      }
      if (error.sqlMessage) {
        console.error('SQL错误信息:', error.sqlMessage);
      }
      
      throw error;
    }
  }

  // 获取学生参与的所有活动
  async getStudentActivities(studentId) {
    try {
      const [rows] = await db.query(`
        SELECT a.活动ID, a.活动名称, a.活动日期, sa.加分
        FROM activities a
        JOIN student_activities sa ON a.活动ID = sa.活动ID
        WHERE sa.学号 = ?
        ORDER BY a.活动日期 DESC
      `, [studentId]);
      return rows;
    } catch (error) {
      console.error('Error fetching student activities:', error);
      throw error;
    }
  }

  // 更新学生德育分总分
  async updateStudentTotalScore(studentId) {
    try {
      console.log(`开始更新学生 ${studentId} 的总分`);
      
      // 检查学生是否存在于学生表中
      const [studentRecord] = await db.query('SELECT * FROM students WHERE 学号 = ?', [studentId]);
      
      if (studentRecord.length === 0) {
        console.error(`学生 ${studentId} 在学生表中不存在`);
        return false;
      }
      
      // 计算学生参与所有活动的总分
      const [result] = await db.query(`
        SELECT IFNULL(SUM(加分), 0) as totalScore
        FROM student_activities
        WHERE 学号 = ?
      `, [studentId]);
      
      const totalScore = result[0].totalScore || 0;
      console.log(`学生 ${studentId} 的总分计算结果: ${totalScore}`);
      
      // 输出当前总分的值和类型，便于调试
      console.log('总分值类型:', typeof totalScore);
      console.log('总分值:', totalScore);
      
      // 直接更新students表而非视图
      const [updateResult] = await db.query(`
        UPDATE students
        SET 总分 = ?
        WHERE 学号 = ?
      `, [totalScore, studentId]);
      
      console.log(`更新结果:`, updateResult);
      
      if (updateResult.affectedRows === 0) {
        console.error(`更新失败: 没有更新任何行 (学号=${studentId})`);
        return false;
      }
      
      console.log(`成功更新学生 ${studentId} 的总分为 ${totalScore}`);
      return true;
    } catch (error) {
      console.error(`更新学生 ${studentId} 总分时出错:`, error);
      
      // 输出更详细的错误信息
      if (error.sql) {
        console.error('SQL查询:', error.sql);
      }
      if (error.sqlMessage) {
        console.error('SQL错误信息:', error.sqlMessage);
      }
      
      throw error;
    }
  }
  
  // 更新所有学生的总分（使用存储过程）
  async updateAllStudentScores() {
    try {
      console.log('开始更新所有学生的总分');
      
      // 尝试使用存储过程更新所有学生总分
      try {
        console.log('尝试使用存储过程更新所有学生总分...');
        await db.query('CALL update_student_total_score()');
        console.log('存储过程执行成功');
        return true;
      } catch (procError) {
        // 如果存储过程调用失败，记录错误并使用备用方法
        console.error('调用存储过程失败:', procError);
        console.log('将改用手动方法更新所有学生总分');
        
        // 获取所有学生并逐个更新
        const [students] = await db.query('SELECT 学号 FROM students');
        console.log(`将更新 ${students.length} 名学生的总分`);
        
        let successCount = 0;
        for (const student of students) {
          try {
            await this.updateStudentTotalScore(student.学号);
            successCount++;
          } catch (updateError) {
            console.error(`更新学生 ${student.学号} 总分失败:`, updateError);
          }
        }
        
        console.log(`成功更新了 ${successCount}/${students.length} 名学生的总分`);
        return successCount > 0;
      }
    } catch (error) {
      console.error('更新所有学生总分时出错:', error);
      throw error;
    }
  }
}

module.exports = new DeyufenModel(); 