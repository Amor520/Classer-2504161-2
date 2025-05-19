const pool = require('./db');
const { v4: uuidv4 } = require('uuid');

// 表单模型
class FormsModel {
  // 创建表单
  static async createForm(title, description, questions, adminId) {
    const formId = uuidv4();
    const query = `
      INSERT INTO form (id, title, description, questions, admin_id, created_at) 
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    
    await pool.query(query, [
      formId, 
      title, 
      description, 
      JSON.stringify(questions), 
      adminId
    ]);
    
    return formId;
  }

  // 获取所有表单
  static async getAllForms() {
    const [rows] = await pool.query(`
      SELECT f.*, a.username as creator_name
      FROM form f
      LEFT JOIN admin a ON f.admin_id = a.id
      ORDER BY f.created_at DESC
    `);
    
    return rows;
  }

  // 根据管理员ID获取表单
  static async getFormsByAdminId(adminId) {
    const [rows] = await pool.query(`
      SELECT f.*, a.username as creator_name
      FROM form f
      LEFT JOIN admin a ON f.admin_id = a.id
      WHERE f.admin_id = ?
      ORDER BY f.created_at DESC
    `, [adminId]);
    
    return rows;
  }

  // 获取单个表单详情
  static async getFormById(formId) {
    const [rows] = await pool.query(`
      SELECT f.*, a.username as creator_name
      FROM form f
      LEFT JOIN admin a ON f.admin_id = a.id
      WHERE f.id = ?
    `, [formId]);
    
    if (rows.length === 0) return null;
    
    const form = rows[0];
    form.questions = JSON.parse(form.questions);
    return form;
  }

  // 保存用户信息
  static async saveUserInfo(userInfo) {
    const userInfoId = uuidv4();
    const query = `
      INSERT INTO user_info (id, qq_number, nickname, class_number, student_id, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    
    await pool.query(query, [
      userInfoId,
      userInfo.qqNumber || null,
      userInfo.nickname || null,
      userInfo.classNumber || null,
      userInfo.studentId || null
    ]);
    
    return userInfoId;
  }

  // 获取用户信息
  static async getUserInfo(userInfoId) {
    if (!userInfoId) return null;
    
    const [rows] = await pool.query(`
      SELECT * FROM user_info WHERE id = ?
    `, [userInfoId]);
    
    return rows.length > 0 ? rows[0] : null;
  }

  // 更新用户信息
  static async updateUserInfo(userInfoId, userInfo) {
    if (!userInfoId) return false;
    
    const query = `
      UPDATE user_info 
      SET qq_number = ?, nickname = ?, class_number = ?, student_id = ?
      WHERE id = ?
    `;
    
    const [result] = await pool.query(query, [
      userInfo.qqNumber || null,
      userInfo.nickname || null,
      userInfo.classNumber || null,
      userInfo.studentId || null,
      userInfoId
    ]);
    
    return result.affectedRows > 0;
  }

  // 提交表单回答
  static async submitResponse(formId, answers, userInfoId = null) {
    const responseId = uuidv4();
    const query = `
      INSERT INTO response (id, form_id, answers, user_info_id, created_at) 
      VALUES (?, ?, ?, ?, NOW())
    `;
    
    await pool.query(query, [
      responseId, 
      formId, 
      JSON.stringify(answers), 
      userInfoId
    ]);
    
    return responseId;
  }

  // 获取表单回答
  static async getFormResponses(formId) {
    const [rows] = await pool.query(`
      SELECT r.*, ui.qq_number, ui.nickname, ui.class_number, ui.student_id 
      FROM response r
      LEFT JOIN user_info ui ON r.user_info_id = ui.id
      WHERE r.form_id = ?
      ORDER BY r.created_at DESC
    `, [formId]);
    
    // 解析JSON格式的回答
    rows.forEach(row => {
      row.answers = JSON.parse(row.answers);
    });
    
    return rows;
  }

  // 获取单个回答详情
  static async getResponseById(responseId) {
    const [rows] = await pool.query(`
      SELECT r.*, ui.qq_number, ui.nickname, ui.class_number, ui.student_id 
      FROM response r
      LEFT JOIN user_info ui ON r.user_info_id = ui.id
      WHERE r.id = ?
    `, [responseId]);
    
    if (rows.length === 0) return null;
    
    const response = rows[0];
    response.answers = JSON.parse(response.answers);
    return response;
  }

  // 更新表单回答
  static async updateResponse(responseId, answers) {
    const query = `
      UPDATE response 
      SET answers = ?
      WHERE id = ?
    `;
    
    const [result] = await pool.query(query, [
      JSON.stringify(answers),
      responseId
    ]);
    
    return result.affectedRows > 0;
  }

  // 删除表单回答
  static async deleteResponse(responseId) {
    // 首先查询获取user_info_id
    const [rows] = await pool.query('SELECT user_info_id FROM response WHERE id = ?', [responseId]);
    if (rows.length === 0) return false;
    
    const userInfoId = rows[0].user_info_id;
    
    // 开始事务
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // 删除回答
      await connection.query('DELETE FROM response WHERE id = ?', [responseId]);
      
      // 如果存在用户信息，也删除它
      if (userInfoId) {
        // 检查是否还有其他回答引用该用户信息
        const [otherResponses] = await connection.query(
          'SELECT COUNT(*) as count FROM response WHERE user_info_id = ? AND id != ?',
          [userInfoId, responseId]
        );
        
        // 如果没有其他回答使用此用户信息，则删除它
        if (otherResponses[0].count === 0) {
          await connection.query('DELETE FROM user_info WHERE id = ?', [userInfoId]);
        }
      }
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // 复制表单
  static async duplicateForm(formId, newTitle, adminId) {
    // 获取原始表单
    const originalForm = await this.getFormById(formId);
    if (!originalForm) return null;
    
    // 创建新表单
    return this.createForm(
      newTitle || `${originalForm.title} - 副本`,
      originalForm.description,
      originalForm.questions,
      adminId
    );
  }

  // 导出表单回答为JSON
  static async exportResponsesAsJson(formId) {
    const form = await this.getFormById(formId);
    const responses = await this.getFormResponses(formId);
    
    return {
      form,
      responses
    };
  }
  
  // 获取用户所有提交的回答
  static async getUserResponses(responseIds) {
    if (!responseIds || responseIds.length === 0) return [];
    
    const placeholders = responseIds.map(() => '?').join(',');
    const query = `
      SELECT r.*, f.title as form_title, f.id as form_id
      FROM response r
      JOIN form f ON r.form_id = f.id
      WHERE r.id IN (${placeholders})
      ORDER BY r.created_at DESC
    `;
    
    const [rows] = await pool.query(query, responseIds);
    return rows;
  }
}

module.exports = FormsModel;
