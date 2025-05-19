const formsModel = require('../models/forms');
const { createObjectCsvStringifier } = require('csv-writer');
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../models/db');  // 添加数据库连接池引用

// 验证登录中间件
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.admin) {
    return res.redirect('/admin/login');
  }
  next();
};

// 中间件：需要管理员权限
const requireAdmin = (req, res, next) => {
  if (!req.session.admin) {
    req.session.message = { type: 'danger', text: '需要管理员权限' };
    return res.redirect('/admin/login');
  }
  next();
};

// 中间件：需要超级管理员权限
const requireSuperAdmin = (req, res, next) => {
  if (!req.session.admin || req.session.admin.role !== 2) {
    req.session.message = { type: 'danger', text: '需要超级管理员权限' };
    return res.redirect('/admin/dashboard');
  }
  next();
};

// 表单主页
const formsHomePage = async (req, res) => {
  try {
    // 获取统计数据
    const [statsRows] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM form) as totalForms,
        (SELECT COUNT(*) FROM response) as totalResponses,
        (SELECT COUNT(DISTINCT user_info_id) FROM response WHERE user_info_id IS NOT NULL) as totalUsers
    `);
    
    const stats = statsRows[0] || {
      totalForms: 0,
      totalResponses: 0,
      totalUsers: 0
    };
    
    // 获取活跃表单（最多5个最新的表单）
    let activeForms = [];
    if (req.session && req.session.submitted_responses) {
      // 获取用户未提交过的表单
      const [activeFormsRows] = await pool.query(`
        SELECT f.*, a.username as creator_name
        FROM form f
        LEFT JOIN admin a ON f.admin_id = a.id
        ${req.session.submitted_responses.length > 0 ? 'WHERE f.id NOT IN (?)' : ''}
        ORDER BY f.created_at DESC
        LIMIT 5
      `, req.session.submitted_responses.length > 0 ? [req.session.submitted_responses] : []);
      
      activeForms = activeFormsRows;
    } else {
      // 如果没有会话或没有提交过表单，获取最新的5个表单
      const [activeFormsRows] = await pool.query(`
        SELECT f.*, a.username as creator_name
        FROM form f
        LEFT JOIN admin a ON f.admin_id = a.id
        ORDER BY f.created_at DESC
        LIMIT 5
      `);
      
      activeForms = activeFormsRows;
    }
    
    // 获取最近提交（最多5个）
    let recentSubmissions = [];
    if (req.session && req.session.my_responses && req.session.my_responses.length > 0) {
      const [submissionsRows] = await pool.query(`
        SELECT r.id, r.form_id, r.created_at, f.title as form_title
        FROM response r
        JOIN form f ON r.form_id = f.id
        WHERE r.id IN (?)
        ORDER BY r.created_at DESC
        LIMIT 5
      `, [req.session.my_responses]);
      
      recentSubmissions = submissionsRows;
    }
    
    res.render('forms/index', {
      title: '收集表系统',
      active: 'forms-home',
      stats,
      activeForms,
      recentSubmissions,
      session: req.session
    });
  } catch (error) {
    console.error('Error rendering forms home page:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试',
      session: req.session
    });
  }
};

// 所有表单页面
const allForms = async (req, res) => {
  try {
    const forms = await formsModel.getAllForms();
    
    res.render('forms/allForms', {
      title: '所有表单',
      active: 'forms',
      forms,
      session: req.session
    });
  } catch (error) {
    console.error('Error rendering all forms page:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试' 
    });
  }
};

// 创建表单页面
const showCreateForm = async (req, res) => {
  try {
    // 检查是否有模板ID参数
    let templateForm = null;
    if (req.query.template_id) {
      templateForm = await formsModel.getFormById(req.query.template_id);
    }
    
    res.render('forms/createForm', {
      title: '创建表单',
      active: 'forms',
      templateForm: templateForm ? JSON.stringify(templateForm) : null,
      session: req.session
    });
  } catch (error) {
    console.error('Error rendering create form page:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试' 
    });
  }
};

// 处理创建表单请求
const createForm = async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.status(403).json({ success: false, message: '需要管理员权限' });
    }
    
    const { title, description, questions } = req.body;
    
    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: '表单标题和至少一个问题是必需的' });
    }
    
    const formId = await formsModel.createForm(
      title,
      description || '',
      questions,
      req.session.admin.id
    );
    
    res.json({ 
      success: true, 
      form_id: formId,
      redirect_url: `/forms/view/${formId}`
    });
  } catch (error) {
    console.error('Error creating form:', error);
    res.status(500).json({ success: false, message: '服务器错误，请稍后再试' });
  }
};

// 查看表单
const viewForm = async (req, res) => {
  try {
    const formId = req.params.id;
    const form = await formsModel.getFormById(formId);
    
    if (!form) {
      return res.status(404).render('error', { 
        title: '未找到',
        message: '未找到该表单' 
      });
    }
    
    // 检查会话中是否有之前提交过的回答
    const submittedResponses = req.session.submitted_responses || [];
    const hasSubmittedBefore = submittedResponses.includes(formId);
    
    res.render('forms/viewForm', {
      title: form.title,
      form,
      active: 'forms',
      hasSubmittedBefore,
      session: req.session
    });
  } catch (error) {
    console.error('Error viewing form:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试' 
    });
  }
};

// 提交表单
const submitForm = async (req, res) => {
  try {
    const formId = req.params.id;
    const form = await formsModel.getFormById(formId);
    
    if (!form) {
      return res.status(404).json({ success: false, message: '表单不存在' });
    }
    
    const { answers, user_info } = req.body;
    
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ success: false, message: '回答格式不正确' });
    }
    
    // 处理用户信息
    let userInfoId = null;
    if (user_info && typeof user_info === 'object') {
      // 确保至少有一个字段不为空
      const hasValue = Object.values(user_info).some(val => val && val.trim() !== '');
      
      if (hasValue) {
        userInfoId = await formsModel.saveUserInfo({
          qqNumber: user_info.qq_number,
          nickname: user_info.nickname,
          classNumber: user_info.class_number,
          studentId: user_info.student_id
        });
      }
    }
    
    // 保存回答
    const responseId = await formsModel.submitResponse(formId, answers, userInfoId);
    
    // 在会话中记录此表单已被提交
    if (!req.session.submitted_responses) {
      req.session.submitted_responses = [];
    }
    req.session.submitted_responses.push(formId);
    
    // 记录响应ID
    if (!req.session.my_responses) {
      req.session.my_responses = [];
    }
    req.session.my_responses.push(responseId);
    
    res.json({ success: true, response_id: responseId });
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ success: false, message: '服务器错误，请稍后再试' });
  }
};

// 查看表单结果页面
const viewResults = async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.redirect('/admin/login');
    }
    
    const formId = req.params.id;
    const form = await formsModel.getFormById(formId);
    
    if (!form) {
      return res.status(404).render('error', { 
        title: '未找到',
        message: '未找到该表单' 
      });
    }
    
    // 检查权限：只有创建者或超级管理员可以查看结果
    if (form.admin_id !== req.session.admin.id && req.session.admin.role !== 2) {
      return res.status(403).render('error', { 
        title: '无权限',
        message: '您没有权限查看此表单的结果' 
      });
    }
    
    const responses = await formsModel.getFormResponses(formId);
    
    res.render('forms/results', {
      title: `结果 - ${form.title}`,
      form,
      responses,
      active: 'forms',
      session: req.session
    });
  } catch (error) {
    console.error('Error viewing form results:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试' 
    });
  }
};

// 导出表单结果为Excel
const exportResults = async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.status(403).json({ success: false, message: '需要管理员权限' });
    }
    
    const formId = req.params.id;
    const form = await formsModel.getFormById(formId);
    
    if (!form) {
      return res.status(404).json({ success: false, message: '表单不存在' });
    }
    
    // 检查权限：只有创建者或超级管理员可以导出结果
    if (form.admin_id !== req.session.admin.id && req.session.admin.role !== 2) {
      return res.status(403).json({ success: false, message: '没有权限导出此表单的结果' });
    }
    
    const responses = await formsModel.getFormResponses(formId);
    
    // 创建Excel工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('表单回答');
    
    // 添加表头
    const headers = ['提交时间'];
    
    // 添加用户信息表头
    headers.push('QQ号', '昵称', '班级', '学号');
    
    // 添加问题表头
    form.questions.forEach(q => {
      headers.push(q.text);
    });
    
    worksheet.addRow(headers);
    
    // 添加每个回答
    responses.forEach(response => {
      const row = [
        new Date(response.created_at).toLocaleString('zh-CN')
      ];
      
      // 添加用户信息
      row.push(
        response.qq_number || '',
        response.nickname || '',
        response.class_number || '',
        response.student_id || ''
      );
      
      // 添加回答
      form.questions.forEach(question => {
        const answer = response.answers[question.id];
        
        // 根据问题类型处理答案
        if (Array.isArray(answer)) {
          row.push(answer.join(', '));
        } else if (answer !== undefined && answer !== null) {
          row.push(answer);
        } else {
          row.push('');
        }
      });
      
      worksheet.addRow(row);
    });
    
    // 调整列宽
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: false }, cell => {
        const cellLength = cell.value ? cell.value.toString().length : 0;
        if (cellLength > maxLength) {
          maxLength = cellLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50); // 限制最大宽度为50
    });
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(form.title)}_结果.xlsx`);
    
    // 写入响应流
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting form results:', error);
    res.status(500).json({ success: false, message: '服务器错误，请稍后再试' });
  }
};

// 删除表单回答
const deleteResponse = async (req, res) => {
  try {
    const responseId = req.params.id;
    
    // 验证是否是用户自己的提交
    const myResponses = req.session.my_responses || [];
    if (!myResponses.includes(responseId) && !req.session.admin) {
      return res.status(403).json({ success: false, message: '您无权删除此回答' });
    }
    
    const success = await formsModel.deleteResponse(responseId);
    
    if (success) {
      // 如果是普通用户，从会话中移除此回答ID
      if (!req.session.admin && myResponses.includes(responseId)) {
        req.session.my_responses = myResponses.filter(id => id !== responseId);
      }
      
      return res.json({ success: true });
    } else {
      return res.status(404).json({ success: false, message: '回答不存在' });
    }
  } catch (error) {
    console.error('Error deleting response:', error);
    res.status(500).json({ success: false, message: '服务器错误，请稍后再试' });
  }
};

// 查看用户的所有提交记录
const myResponses = async (req, res) => {
  try {
    // 从会话中获取用户提交的表单ID
    const responseIds = req.session.my_responses || [];
    
    // 获取用户的所有提交记录
    const responses = await formsModel.getUserResponses(responseIds);
    
    res.render('forms/my_responses', {
      title: '我的提交记录',
      active: 'forms',
      responses,
      session: req.session
    });
  } catch (error) {
    console.error('Error viewing user responses:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试' 
    });
  }
};

// 查看表单回答
const viewResponse = async (req, res) => {
  try {
    const responseId = req.params.id;
    const response = await formsModel.getResponseById(responseId);
    
    if (!response) {
      return res.status(404).render('error', { 
        title: '未找到',
        message: '未找到该回答',
        session: req.session
      });
    }
    
    // 获取表单信息
    const form = await formsModel.getFormById(response.form_id);
    if (!form) {
      return res.status(404).render('error', { 
        title: '未找到',
        message: '未找到对应的表单',
        session: req.session
      });
    }
    
    // 获取用户信息
    const userInfo = response.user_info_id 
      ? await formsModel.getUserInfo(response.user_info_id) 
      : null;
    
    // 检查是否显示成功消息
    const showSuccess = req.query.success === 'true';
    
    // 检查是否可以编辑（提交后24小时内）
    const created = new Date(response.created_at);
    const now = new Date();
    const diffHours = Math.abs(now - created) / 36e5; // 小时差
    const can_edit = diffHours <= 24;
    
    res.render('forms/view_response', {
      title: '查看回答',
      active: 'forms',
      response,
      form,
      userInfo,
      can_edit,
      success: showSuccess,
      session: req.session
    });
  } catch (error) {
    console.error('Error viewing response:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试',
      session: req.session
    });
  }
};

// 编辑回答页面
const editResponse = async (req, res) => {
  try {
    const responseId = req.params.id;
    
    // 验证是否是用户自己的提交
    const myResponses = req.session.my_responses || [];
    if (!myResponses.includes(responseId)) {
      req.session.message = { type: 'danger', text: '您无权修改此回答' };
      return res.redirect('/forms');
    }
    
    const response = await formsModel.getResponseById(responseId);
    if (!response) {
      return res.status(404).render('error', { 
        title: '未找到',
        message: '未找到该回答' 
      });
    }
    
    const form = await formsModel.getFormById(response.form_id);
    if (!form) {
      return res.status(404).render('error', { 
        title: '未找到',
        message: '未找到相关表单' 
      });
    }
    
    // 获取用户信息
    let userInfo = null;
    if (response.user_info_id) {
      userInfo = await formsModel.getUserInfo(response.user_info_id);
    }
    
    res.render('forms/edit_response', {
      title: `编辑回答 - ${form.title}`,
      active: 'forms',
      form,
      response,
      userInfo,
      session: req.session
    });
  } catch (error) {
    console.error('Error editing response:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试' 
    });
  }
};

// 更新回答
const updateResponse = async (req, res) => {
  try {
    const responseId = req.params.id;
    
    // 验证是否是用户自己的提交
    const myResponses = req.session.my_responses || [];
    if (!myResponses.includes(responseId)) {
      return res.status(403).json({ success: false, message: '您无权修改此回答' });
    }
    
    const { answers, user_info } = req.body;
    
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ success: false, message: '回答格式不正确' });
    }
    
    // 更新回答
    const updateSuccess = await formsModel.updateResponse(responseId, answers);
    
    if (!updateSuccess) {
      return res.status(404).json({ success: false, message: '回答不存在' });
    }
    
    // 获取当前响应以检查用户信息
    const response = await formsModel.getResponseById(responseId);
    
    // 如果提供了用户信息且原来有用户信息，则更新
    if (user_info && response.user_info_id) {
      await formsModel.updateUserInfo(response.user_info_id, {
        qqNumber: user_info.qq_number,
        nickname: user_info.nickname,
        classNumber: user_info.class_number,
        studentId: user_info.student_id
      });
    }
    // 如果提供了用户信息但原来没有，则创建新的
    else if (user_info && !response.user_info_id) {
      // 确保至少有一个字段不为空
      const hasValue = Object.values(user_info).some(val => val && val.trim() !== '');
      
      if (hasValue) {
        const userInfoId = await formsModel.saveUserInfo({
          qqNumber: user_info.qq_number,
          nickname: user_info.nickname,
          classNumber: user_info.class_number,
          studentId: user_info.student_id
        });
        
        // 更新响应中的用户信息ID
        await pool.query('UPDATE response SET user_info_id = ? WHERE id = ?', [userInfoId, responseId]);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating response:', error);
    res.status(500).json({ success: false, message: '服务器错误，请稍后再试' });
  }
};

// 复制表单
const duplicateForm = async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.status(403).json({ success: false, message: '需要管理员权限' });
    }
    
    const formId = req.params.id;
    const adminId = req.session.admin.id;
    const newTitle = req.body.title;
    
    // 获取原始表单
    const originalForm = await formsModel.getFormById(formId);
    
    // 检查权限：只有创建者或超级管理员可以复制表单
    if (originalForm.admin_id !== adminId && req.session.admin.role !== 2) {
      return res.status(403).json({ success: false, message: '无权复制此表单' });
    }
    
    // 创建新表单
    const newFormId = await formsModel.duplicateForm(formId, newTitle, adminId);
    
    if (newFormId) {
      return res.json({
        success: true, 
        form_id: newFormId,
        redirect_url: `/forms/view/${newFormId}`
      });
    } else {
      return res.status(404).json({ success: false, message: '表单不存在' });
    }
  } catch (error) {
    console.error('Error duplicating form:', error);
    res.status(500).json({ success: false, message: '服务器错误，请稍后再试' });
  }
};

// 管理员登录
const adminLogin = async (req, res) => {
  // GET 请求显示登录页面
  if (req.method === 'GET') {
    if (req.session.admin) {
      return res.redirect('/admin/dashboard');
    }
    return res.render('admin/login', {
      title: '管理员登录'
    });
  }
  
  try {
    const { username, password } = req.body;
    
    // 这里应该使用你的管理员模型来验证登录
    // 由于我们没有看到完整的管理员模型，这里简化处理
    // 在完整项目中，你需要根据实际情况调整
    const query = `
      SELECT * FROM admin WHERE username = ?
    `;
    
    const [rows] = await pool.query(query, [username]);
    
    if (rows.length === 0) {
      return res.render('admin/login', {
        title: '管理员登录',
        error: '用户名或密码错误'
      });
    }
    
    const admin = rows[0];
    const pwdQuery = `
      SELECT * FROM admin_pwd WHERE admin_id = ?
    `;
    
    const [pwdRows] = await pool.query(pwdQuery, [admin.id]);
    
    if (pwdRows.length === 0 || pwdRows[0].password !== password) {
      return res.render('admin/login', {
        title: '管理员登录',
        error: '用户名或密码错误'
      });
    }
    
    // 登录成功，保存到会话
    req.session.admin = {
      id: admin.id,
      username: admin.username,
      role: admin.role
    };
    
    // 重定向到管理员仪表板
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error in admin login:', error);
    res.render('admin/login', {
      title: '管理员登录',
      error: '服务器错误，请稍后再试'
    });
  }
};

// 管理员退出登录
const adminLogout = (req, res) => {
  // 清除管理员会话
  req.session.admin = null;
  
  // 重定向到登录页面
  res.redirect('/admin/login');
};

// 管理员仪表板
const adminDashboard = async (req, res) => {
  try {
    // 只显示当前管理员创建的表单，超级管理员可以看到所有表单
    let forms;
    if (req.session.admin.role === 2) { // 超级管理员
      forms = await formsModel.getAllForms();
    } else {
      forms = await formsModel.getFormsByAdminId(req.session.admin.id);
    }
    
    res.render('admin/dashboard', {
      title: '管理员仪表板',
      admin: req.session.admin,
      forms,
      active: 'admin',
      session: req.session
    });
  } catch (error) {
    console.error('Error in admin dashboard:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试' 
    });
  }
};

// 添加管理员页面
const showAddAdmin = async (req, res) => {
  try {
    res.render('admin/add_admin', {
      title: '添加管理员',
      active: 'admin',
      session: req.session
    });
  } catch (error) {
    console.error('Error showing add admin page:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试' 
    });
  }
};

// 添加管理员
const addAdmin = async (req, res) => {
  try {
    // 只有超级管理员可以添加管理员
    if (!req.session.admin || req.session.admin.role !== 2) {
      return res.status(403).json({ success: false, message: '需要超级管理员权限' });
    }
    
    const { username, password, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码是必需的' });
    }
    
    // 检查用户名是否已存在
    const query = 'SELECT * FROM admin WHERE username = ?';
    const [rows] = await pool.query(query, [username]);
    
    if (rows.length > 0) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }
    
    // 插入新管理员
    const adminId = uuidv4();
    const adminRole = parseInt(role) || 1; // 默认为普通管理员
    
    const insertQuery = 'INSERT INTO admin (id, username, role) VALUES (?, ?, ?)';
    await pool.query(insertQuery, [adminId, username, adminRole]);
    
    // 添加密码到密码表
    const pwdQuery = 'INSERT INTO admin_pwd (admin_id, password) VALUES (?, ?)';
    await pool.query(pwdQuery, [adminId, password]);
    
    res.json({ success: true, message: '管理员已添加成功' });
  } catch (error) {
    console.error('Error adding admin:', error);
    res.status(500).json({ success: false, message: '服务器错误，请稍后再试' });
  }
};

// 管理员列表页面
const adminManage = async (req, res) => {
  try {
    // 获取所有管理员
    const [admins] = await pool.query('SELECT * FROM admin ORDER BY role DESC, username');
    
    res.render('admin/manage_admins', {
      title: '管理员管理',
      active: 'admin',
      admins,
      currentAdmin: req.session.admin,
      session: req.session
    });
  } catch (error) {
    console.error('Error showing admin management page:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试' 
    });
  }
};

// 删除管理员
const deleteAdmin = async (req, res) => {
  try {
    // 只有超级管理员可以删除管理员
    if (!req.session.admin || req.session.admin.role !== 2) {
      return res.status(403).json({ success: false, message: '需要超级管理员权限' });
    }
    
    const adminId = req.params.id;
    
    // 不能删除自己
    if (adminId === req.session.admin.id) {
      return res.status(400).json({ success: false, message: '不能删除自己的账号' });
    }
    
    // 删除管理员
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // 删除密码
      await connection.query('DELETE FROM admin_pwd WHERE admin_id = ?', [adminId]);
      
      // 删除管理员
      await connection.query('DELETE FROM admin WHERE id = ?', [adminId]);
      
      await connection.commit();
      return res.json({ success: true, message: '管理员已删除' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({ success: false, message: '服务器错误，请稍后再试' });
  }
};

// QQ分享信息重定向到表单
const qqShareRedirect = (req, res) => {
  try {
    const formId = req.params.id;
    
    // 获取QQ Web分享的参数
    const qqNumber = req.query.qq || '';
    const nickname = req.query.nickname || '';
    
    // 重定向到表单，附加QQ信息参数
    let redirectUrl = `/forms/view/${formId}`;
    if (qqNumber || nickname) {
      redirectUrl += `?qq=${qqNumber}&nickname=${nickname}`;
    }
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in QQ share redirect:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试' 
    });
  }
};

// 获取活跃表单（未填写过的表单）
const getActiveForms = async (req, res) => {
  try {
    let forms = [];
    
    if (req.session && req.session.submitted_responses) {
      // 获取用户未提交过的表单
      const [rows] = await pool.query(`
        SELECT f.*, a.username as creator_name
        FROM form f
        LEFT JOIN admin a ON f.admin_id = a.id
        ${req.session.submitted_responses.length > 0 ? 'WHERE f.id NOT IN (?)' : ''}
        ORDER BY f.created_at DESC
      `, req.session.submitted_responses.length > 0 ? [req.session.submitted_responses] : []);
      
      forms = rows;
    } else {
      // 如果没有会话或没有提交过表单，获取所有表单
      const [rows] = await pool.query(`
        SELECT f.*, a.username as creator_name
        FROM form f
        LEFT JOIN admin a ON f.admin_id = a.id
        ORDER BY f.created_at DESC
      `);
      
      forms = rows;
    }
    
    res.render('forms/active_forms', {
      title: '活跃表单',
      active: 'forms-active',
      forms,
      session: req.session
    });
  } catch (error) {
    console.error('Error rendering active forms page:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试',
      session: req.session
    });
  }
};

// 获取最近提交
const getRecentSubmissions = async (req, res) => {
  try {
    let submissions = [];
    
    if (req.session && req.session.my_responses && req.session.my_responses.length > 0) {
      const [rows] = await pool.query(`
        SELECT r.id, r.form_id, r.created_at, f.title as form_title
        FROM response r
        JOIN form f ON r.form_id = f.id
        WHERE r.id IN (?)
        ORDER BY r.created_at DESC
        LIMIT 10
      `, [req.session.my_responses]);
      
      submissions = rows;
    }
    
    res.render('forms/recent_submissions', {
      title: '最近提交',
      active: 'forms-recent',
      submissions,
      session: req.session
    });
  } catch (error) {
    console.error('Error rendering recent submissions page:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试',
      session: req.session
    });
  }
};

// 我的提交记录
const getMySubmissions = async (req, res) => {
  try {
    let submissions = [];
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    
    if (req.session && req.session.my_responses && req.session.my_responses.length > 0) {
      // 获取记录总数
      const [countResult] = await pool.query(`
        SELECT COUNT(*) as total
        FROM response
        WHERE id IN (?)
      `, [req.session.my_responses]);
      
      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);
      
      // 获取当前页数据
      const [rows] = await pool.query(`
        SELECT r.id, r.form_id, r.created_at, f.title as form_title,
        DATEDIFF(NOW(), r.created_at) <= 1 as can_edit
        FROM response r
        JOIN form f ON r.form_id = f.id
        WHERE r.id IN (?)
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      `, [req.session.my_responses, limit, offset]);
      
      submissions = rows;
      
      res.render('forms/submissions', {
        title: '我的提交记录',
        active: 'forms-submissions',
        submissions,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          total: total
        },
        session: req.session
      });
    } else {
      res.render('forms/submissions', {
        title: '我的提交记录',
        active: 'forms-submissions',
        submissions: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          total: 0
        },
        session: req.session
      });
    }
  } catch (error) {
    console.error('Error rendering submissions page:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试',
      session: req.session
    });
  }
};

module.exports = {
  // 主页和表单相关功能
  formsHomePage,
  allForms,
  showCreateForm,
  createForm,
  viewForm,
  submitForm,
  viewResults,
  exportResults,
  duplicateForm,
  deleteResponse,
  
  // 用户表单回答相关功能
  myResponses,
  viewResponse,
  editResponse,
  updateResponse,
  
  // QQ分享重定向
  qqShareRedirect,
  
  // 管理员相关功能
  adminLogin,
  adminLogout,
  adminDashboard,
  adminManage,
  showAddAdmin,
  addAdmin,
  deleteAdmin,
  
  // 中间件
  requireAdmin,
  requireSuperAdmin,
  
  // 新添加的功能
  getActiveForms,
  getRecentSubmissions,
  getMySubmissions
};
