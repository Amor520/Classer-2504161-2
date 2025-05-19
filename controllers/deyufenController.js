const deyufenModel = require('../models/deyufen');

// 验证活动管理权限的中间件
exports.checkActivityAuth = (req, res, next) => {
  // 检查会话中是否有活动管理权限标记
  if (!req.session || !req.session.hasActivityAuth) {
    // 没有权限，重定向到权限验证页面
    return res.redirect('/activity/auth');
  }
  
  // 有权限，继续下一步
  next();
};

// 验证超级管理员权限的中间件
exports.checkSuperAdminAuth = (req, res, next) => {
  // 检查会话中是否有超级管理员权限标记
  if (!req.session || !req.session.adminType || req.session.adminType !== 'super') {
    // 没有权限，重定向到权限验证页面或显示错误
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      // 对于AJAX请求，返回JSON错误
      return res.status(403).json({
        success: false,
        message: '权限不足，需要超级管理员权限'
      });
    } else {
      // 对于普通请求，重定向或显示错误页面
      req.session.authRedirectTo = req.originalUrl;
      return res.render('error', {
        title: '权限不足',
        message: '此操作需要超级管理员权限',
        active: 'activity'
      });
    }
  }
  
  // 有权限，继续下一步
  next();
};

// 显示活动权限验证页面
exports.showActivityAuth = (req, res) => {
  res.render('activityAuth', {
    title: '活动管理权限验证',
    active: 'activity',
    error: null
  });
};

// 验证活动管理权限
exports.verifyActivityAuth = (req, res) => {
  const { password } = req.body;
  const correctPassword = '1325zy';
  
  if (password === correctPassword) {
    // 设置会话中的权限标记
    req.session.hasActivityAuth = true;
    
    // 根据请求来源决定重定向目标
    const redirectTo = req.session.authRedirectTo || '/activity/add';
    req.session.authRedirectTo = null;
    
    res.redirect(redirectTo);
  } else {
    // 验证失败
    res.render('activityAuth', {
      title: '活动管理权限验证',
      active: 'activity',
      error: '密码错误，请重试'
    });
  }
};

// 首页 - 展示德育分总览
exports.homePage = async (req, res) => {
  try {
    // 获取德育分数据时不指定排序，使用模型默认排序
    const deyufenData = await deyufenModel.getOverview();
    const activities = await deyufenModel.getActivities();
    
    res.render('index', {
      title: '德育分管理系统',
      deyufenData,
      activities,
      active: 'home'
    });
  } catch (error) {
    console.error('Error rendering home page:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试' 
    });
  }
};

// 德育分总览页面 - 默认按分数降序排序
exports.overview = async (req, res) => {
  try {
    // 获取分数降序排列的数据
    const deyufenData = await deyufenModel.getOverview();
    
    res.render('overview', {
      title: '德育分总览',
      deyufenData,
      active: 'overview'
    });
  } catch (error) {
    console.error('Error rendering overview page:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试' 
    });
  }
};

// 德育分排名页面 - 重定向到总览页面
exports.ranking = async (req, res) => {
  // 重定向到德育分总览页面
  res.redirect('/overview');
};

// 学生德育分详情页面
exports.studentDetail = async (req, res) => {
  try {
    const studentId = req.params.id;
    console.log('查看学生详情，学号:', studentId);
    
    const studentData = await deyufenModel.getStudentDetail(studentId);
    
    if (!studentData) {
      return res.status(404).render('error', { 
        title: '未找到',
        message: '未找到该学生信息' 
      });
    }
    
    // 获取学生参与的所有活动
    const studentActivities = await deyufenModel.getStudentActivities(studentId);
    console.log(`获取到学生 ${studentId} 参与的 ${studentActivities.length} 个活动`);
    
    res.render('studentDetail', {
      title: `${studentData.姓名} 德育分详情`,
      studentData,
      studentActivities,
      active: 'overview'
    });
  } catch (error) {
    console.error('Error rendering student detail page:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试' 
    });
  }
};

// 刷新所有学生的总分
exports.refreshAllScores = async (req, res) => {
  try {
    console.log('开始更新所有学生的德育分总分');
    
    // 调用模型的批量更新方法
    const result = await deyufenModel.updateAllStudentScores();
    
    // 添加成功消息到会话
    req.session.message = {
      type: 'success',
      text: '所有学生总分更新成功！'
    };
    
    // 重定向到德育分总览页面
    res.redirect('/overview');
  } catch (error) {
    console.error('更新学生总分时出错:', error);
    
    // 添加错误消息到会话
    req.session.message = {
      type: 'danger',
      text: '更新学生总分时出错，请查看服务器日志'
    };
    
    res.redirect('/overview');
  }
};

// 显示所有活动列表
exports.allActivities = async (req, res) => {
  try {
    console.log('获取所有活动列表');
    
    // 获取所有活动
    const activities = await deyufenModel.getActivities();
    
    res.render('allActivities', {
      title: '所有活动列表',
      activities,
      active: 'activities'
    });
  } catch (error) {
    console.error('获取活动列表时出错:', error);
    
    // 添加错误消息到会话
    req.session.message = {
      type: 'danger',
      text: '获取活动列表时出错，请稍后再试'
    };
    
    res.redirect('/');
  }
};

// 活动详情页面
exports.activityDetail = async (req, res) => {
  try {
    const activityId = req.params.id;
    console.log('查看活动详情，活动ID:', activityId); // 添加调试信息
    
    const activities = await deyufenModel.getActivities();
    // 确保使用字符串比较
    const activity = activities.find(a => String(a.活动ID) === String(activityId));
    
    if (!activity) {
      console.log('未找到活动:', activityId);
      return res.status(404).render('error', { 
        title: '未找到',
        message: '未找到该活动信息' 
      });
    }
    
    const participants = await deyufenModel.getActivityParticipants(activityId);
    
    res.render('activityDetail', {
      title: `${activity.活动名称} 详情`,
      activity,
      participants,
      active: 'activity'
    });
  } catch (error) {
    console.error('Error rendering activity detail page:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试' 
    });
  }
};

// 显示添加活动页面
exports.showAddActivity = async (req, res) => {
  try {
    res.render('addActivity', {
      title: '添加活动',
      active: 'activity'
    });
  } catch (error) {
    console.error('Error showing add activity page:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试' 
    });
  }
};

// 处理添加活动请求
exports.addActivity = async (req, res) => {
  try {
    // 检查表单数据
    if (!req.body.name || !req.body.date) {
      console.error('表单数据不完整:', req.body);
      return res.status(400).render('error', { 
        title: '数据错误',
        message: '请填写活动名称和日期' 
      });
    }
    
    const activityData = {
      name: req.body.name,
      description: req.body.description || '',
      date: req.body.date,
      defaultScore: parseFloat(req.body.defaultScore) || 0
    };
    
    console.log('准备添加活动:', activityData);
    
    // 添加活动到数据库
    const activityId = await deyufenModel.addActivity(activityData);
    console.log('新增活动ID:', activityId);
    
    if (!activityId) {
      console.error('活动添加失败: 未返回活动ID');
      return res.status(500).render('error', { 
        title: '添加失败',
        message: '添加活动失败，未能获取活动ID' 
      });
    }
    
    // 将默认分值存入会话，供分配活动分值页面使用
    req.session.defaultScore = activityData.defaultScore;
    
    // 重定向到活动分值分配页面
    return res.redirect(`/activity/assign/${activityId}`);
  } catch (error) {
    console.error('添加活动时发生错误:', error);
    
    // 详细记录错误信息
    const errorMessage = error.code === 'ECONNRESET' 
      ? '数据库连接中断，请稍后重试' 
      : (error.message || '服务器内部错误');
    
    // 如果是数据库错误，返回具体错误消息
    if (error.sql) {
      console.error('SQL查询错误:', error.sql);
    }
    
    return res.status(500).render('error', { 
      title: '添加失败',
      message: '添加活动失败: ' + errorMessage
    });
  }
};

// 显示分配活动分值页面
exports.showAssignActivityScores = async (req, res) => {
  try {
    const activityId = req.params.id;
    console.log('活动ID:', activityId); // 添加调试信息
    
    // 获取活动列表
    const activities = await deyufenModel.getActivities();
    
    // 确保使用正确的比较方式
    const activity = activities.find(a => String(a.活动ID) === String(activityId));
    
    // 调试信息
    console.log('查找到的活动:', activity);
    
    if (!activity) {
      console.log('未找到活动，重定向到活动添加页面');
      return res.redirect('/activity/add');
    }
    
    const students = await deyufenModel.getAllStudents();
    
    // 获取默认分值，优先从会话中获取，其次从活动数据中获取，最后使用默认值1
    let defaultScore = 1;
    
    if (req.session && typeof req.session.defaultScore !== 'undefined') {
      defaultScore = req.session.defaultScore;
      // 使用后清除会话中的值，避免影响后续活动
      delete req.session.defaultScore;
      console.log('从会话中获取默认分值:', defaultScore);
    } else if (activity && typeof activity.defaultScore !== 'undefined') {
      defaultScore = parseFloat(activity.defaultScore) || 1;
      console.log('从活动数据中获取默认分值:', defaultScore);
    }
    
    console.log('使用的默认分值:', defaultScore);
    
    res.render('assignActivityScores', {
      title: `分配活动分值 - ${activity.活动名称}`,
      activity,
      students,
      defaultScore,
      active: 'activity'
    });
  } catch (error) {
    console.error('Error showing assign activity scores page:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试' 
    });
  }
};

// 处理分配活动分值请求
exports.assignActivityScores = async (req, res) => {
  try {
    const activityId = req.params.id;
    const { studentIds, scores } = req.body;
    
    console.log('收到分配活动分值请求:', { activityId, studentIds, scores });
    
    // 检查是否有选择学生
    if (!studentIds || (Array.isArray(studentIds) && studentIds.length === 0)) {
      console.log('未选择任何学生');
      return res.status(400).render('error', { 
        title: '参数错误',
        message: '请至少选择一名学生' 
      });
    }
    
    // 检查scores是否存在
    if (!scores) {
      console.log('未提供分值');
      return res.status(400).render('error', { 
        title: '参数错误',
        message: '请提供有效的分值' 
      });
    }
    
    // 将学生ID和分值组合成数组对象
    let studentScores = [];
    try {
      studentScores = Array.isArray(studentIds) 
        ? studentIds.map((studentId, index) => {
            const score = Array.isArray(scores) ? scores[index] : scores;
            return {
              studentId,
              score: parseFloat(score) || 0
            };
          })
        : [{ studentId: studentIds, score: parseFloat(scores) || 0 }];
      
      console.log('处理的学生分值数组:', studentScores);
    } catch (err) {
      console.error('处理学生分值数据时出错:', err);
      return res.status(400).render('error', { 
        title: '数据处理错误',
        message: '处理学生分值数据时出错: ' + err.message
      });
    }
    
    // 添加学生到活动
    await deyufenModel.addStudentsToActivity(activityId, studentScores);
    
    // 等待一段时间以确保数据提交完成
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 更新所有选中学生的总分
    const successfulUpdates = [];
    const failedUpdates = [];
    
    for (const entry of studentScores) {
      try {
        const result = await deyufenModel.updateStudentTotalScore(entry.studentId);
        if (result) {
          successfulUpdates.push(entry.studentId);
        } else {
          failedUpdates.push(entry.studentId);
        }
      } catch (error) {
        console.error(`更新学生 ${entry.studentId} 总分时出错:`, error);
        failedUpdates.push(entry.studentId);
      }
    }
    
    console.log(`更新总分成功: ${successfulUpdates.length} 名, 失败: ${failedUpdates.length} 名`);
    
    if (failedUpdates.length > 0) {
      console.warn('以下学生总分更新失败:', failedUpdates);
    }
    
    // 增加信息到会话
    req.session.message = {
      type: 'success',
      text: `已成功为 ${successfulUpdates.length} 名学生分配活动分值`
    };
    
    res.redirect(`/activity/${activityId}`);
  } catch (error) {
    console.error('Error assigning activity scores:', error);
    res.status(500).render('error', { 
      title: '分配失败',
      message: '分配活动分值失败: ' + (error.message || '未知错误') 
    });
  }
};

// 显示修改学生活动分值页面
exports.showEditStudentScore = async (req, res) => {
  try {
    const { studentId, activityId } = req.params;
    
    // 获取学生信息
    const student = await deyufenModel.getStudentDetail(studentId);
    if (!student) {
      return res.status(404).render('error', { 
        title: '未找到',
        message: '未找到该学生信息' 
      });
    }
    
    // 获取活动信息
    const activities = await deyufenModel.getActivities();
    const activity = activities.find(a => String(a.活动ID) === String(activityId));
    if (!activity) {
      return res.status(404).render('error', { 
        title: '未找到',
        message: '未找到该活动信息' 
      });
    }
    
    // 获取学生在该活动中的分值
    const participants = await deyufenModel.getActivityParticipants(activityId);
    const participant = participants.find(p => String(p.学号) === String(studentId));
    
    res.render('editStudentScore', {
      title: `修改分值 - ${student.姓名} - ${activity.活动名称}`,
      student,
      activity,
      score: participant ? participant.加分 : activity.defaultScore || 0,
      active: 'activity'
    });
  } catch (error) {
    console.error('Error showing edit student score page:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试' 
    });
  }
};

// 处理修改学生活动分值请求
exports.updateStudentScore = async (req, res) => {
  try {
    const { studentId, activityId } = req.params;
    const score = parseFloat(req.body.score) || 0;
    
    console.log(`修改学生 ${studentId} 在活动 ${activityId} 的分值为 ${score}`);
    
    // 更新学生的活动分值
    await deyufenModel.updateStudentActivityScore(studentId, activityId, score);
    
    // 等待一段时间以确保数据提交完成
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 更新学生总分
    const result = await deyufenModel.updateStudentTotalScore(studentId);
    
    if (result) {
      console.log(`已成功更新学生 ${studentId} 的总分`);
    } else {
      console.error(`更新学生 ${studentId} 的总分失败`);
    }
    
    res.redirect(`/activity/${activityId}`);
  } catch (error) {
    console.error('Error updating student score:', error);
    res.status(500).render('error', { 
      title: '修改失败',
      message: '修改分值失败，请稍后再试' 
    });
  }
};

// 班级主页 - 新的主页
exports.classHomePage = async (req, res) => {
  try {
    res.render('classHome', {
      title: '计算机2308班级网页',
      active: 'class-home'
    });
  } catch (error) {
    console.error('Error rendering class home page:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试' 
    });
  }
};

// 收集表系统主页
exports.formsHomePage = async (req, res) => {
  try {
    res.render('forms/index', {
      title: '收集表系统',
      active: 'forms-home'
    });
  } catch (error) {
    console.error('Error rendering forms home page:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试' 
    });
  }
};

// 所有表单页面
exports.allForms = async (req, res) => {
  try {
    res.render('forms/allForms', {
      title: '所有表单',
      active: 'forms'
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
exports.showCreateForm = async (req, res) => {
  try {
    res.render('forms/createForm', {
      title: '创建表单',
      active: 'forms'
    });
  } catch (error) {
    console.error('Error rendering create form page:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试' 
    });
  }
};

// 表单提交记录页面
exports.formSubmissions = async (req, res) => {
  try {
    res.render('forms/submissions', {
      title: '表单提交记录',
      active: 'forms'
    });
  } catch (error) {
    console.error('Error rendering form submissions page:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '服务器错误，请稍后再试' 
    });
  }
};

// 删除活动
exports.deleteActivity = async (req, res) => {
  try {
    const activityId = req.params.id;
    
    // 增强参数验证
    if (!activityId) {
      return res.status(400).json({
        success: false,
        message: '未提供活动ID'
      });
    }
    
    // 检查ID是否为有效值（不能是字符串"all"）
    if (activityId === 'all') {
      return res.status(400).json({
        success: false,
        message: '无效的活动ID'
      });
    }
    
    // 检查ID是否存在于数据库中
    const activities = await deyufenModel.getActivities();
    const activityExists = activities.some(a => String(a.活动ID) === String(activityId));
    
    if (!activityExists) {
      return res.status(404).json({
        success: false,
        message: '找不到指定活动，可能已被删除'
      });
    }
    
    // 获取当前用户信息
    let deletedBy = '未知用户';
    if (req.session && req.session.admin) {
      deletedBy = req.session.admin.username || req.session.admin.name || '未知用户';
    }
    
    // 执行删除操作
    await deyufenModel.deleteActivity(activityId, deletedBy);
    
    // 判断请求类型，返回适当的响应
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        success: true,
        message: '活动删除成功'
      });
    } else {
      // 添加成功消息到会话
      req.session.message = {
        type: 'success',
        text: '活动删除成功'
      };
      return res.redirect('/activity/all');
    }
  } catch (error) {
    console.error('删除活动时出错:', error);
    
    // 判断请求类型，返回适当的错误
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({
        success: false,
        message: error.message || '删除活动失败'
      });
    } else {
      // 添加错误消息到会话
      req.session.message = {
        type: 'danger',
        text: '删除活动失败: ' + (error.message || '服务器错误')
      };
      return res.redirect('/activity/all');
    }
  }
};

// 获取删除历史记录
exports.getDeleteHistory = async (req, res) => {
  try {
    const deleteHistory = await deyufenModel.getDeleteHistory();
    
    res.render('activityDeleteHistory', {
      title: '删除历史记录',
      history: deleteHistory,
      active: 'activity'
    });
  } catch (error) {
    console.error('获取删除历史记录出错:', error);
    
    // 添加错误消息到会话
    req.session.message = {
      type: 'danger',
      text: '获取删除历史记录失败: ' + (error.message || '服务器错误')
    };
    return res.redirect('/activity/all');
  }
};

// 删除单条历史记录
exports.deleteHistoryRecord = async (req, res) => {
  try {
    const id = req.params.id;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: '未提供记录ID'
      });
    }
    
    // 执行删除操作
    const result = await deyufenModel.deleteHistoryRecord(id);
    
    return res.json({
      success: result,
      message: result ? '删除历史记录成功' : '找不到指定记录'
    });
  } catch (error) {
    console.error('删除历史记录时出错:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || '删除历史记录失败'
    });
  }
};

// 清空所有删除历史记录
exports.clearDeleteHistory = async (req, res) => {
  try {
    // 执行清空操作
    const affectedRows = await deyufenModel.clearDeleteHistory();
    
    return res.json({
      success: true,
      message: `成功清空 ${affectedRows} 条历史记录`
    });
  } catch (error) {
    console.error('清空删除历史记录时出错:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || '清空历史记录失败'
    });
  }
}; 