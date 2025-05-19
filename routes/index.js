const express = require('express');
const router = express.Router();
const deyufenController = require('../controllers/deyufenController');
const formsController = require('../controllers/formsController');

// 权限中间件
const requireAdmin = formsController.requireAdmin;
const requireSuperAdmin = formsController.requireSuperAdmin;

// 新主页
router.get('/', deyufenController.classHomePage);

// =================== 收集表系统路由 ===================
// 收集表系统主页
router.get('/forms', formsController.formsHomePage);
router.get('/forms/all', formsController.allForms);
router.get('/forms/create', requireAdmin, formsController.showCreateForm);

// 新增的表单路由
router.get('/forms/active', formsController.getActiveForms);
router.get('/forms/recent', formsController.getRecentSubmissions);
router.get('/forms/submissions', formsController.getMySubmissions);

// 表单API
router.post('/api/forms/create', requireAdmin, formsController.createForm);
router.get('/forms/view/:id', formsController.viewForm);
router.post('/api/forms/:id/submit', formsController.submitForm);
router.get('/forms/results/:id', requireAdmin, formsController.viewResults); 
router.get('/forms/export/:id', requireAdmin, formsController.exportResults);
router.post('/api/forms/:id/duplicate', requireAdmin, formsController.duplicateForm);
router.post('/api/responses/:id/delete', requireAdmin, formsController.deleteResponse);

// 新增问题统计数据API
router.get('/forms/api/question-stats/:questionId', requireAdmin, formsController.getQuestionStats);

// 用户表单回答相关路由
router.get('/forms/response/:id', formsController.viewResponse);
router.get('/forms/response/:id/edit', formsController.editResponse);
router.post('/api/forms/response/:id/update', formsController.updateResponse);

// QQ分享重定向
router.get('/qqshare/:id', formsController.qqShareRedirect);

// 管理员路由
router.get('/admin/login', formsController.adminLogin);
router.post('/admin/login', formsController.adminLogin);
router.get('/admin/logout', formsController.adminLogout);
router.get('/admin/dashboard', requireAdmin, formsController.adminDashboard);
router.get('/admin/manage', requireSuperAdmin, formsController.adminManage);
router.get('/admin/add', requireSuperAdmin, formsController.showAddAdmin);
router.post('/admin/add', requireSuperAdmin, formsController.addAdmin);
router.post('/admin/delete/:id', requireSuperAdmin, formsController.deleteAdmin);

// =================== 德育分系统路由 ===================
// 德育分管理系统主页
router.get('/deyufen', deyufenController.homePage);

// 德育分总览页面
router.get('/overview', deyufenController.overview);

// 德育分排名页面
router.get('/ranking', deyufenController.ranking);

// 添加活动页面 - 需要管理员权限
router.get('/activity/add', requireAdmin, deyufenController.showAddActivity);

// 添加活动请求处理
router.post('/activity/add', requireAdmin, deyufenController.addActivity);

// 所有活动列表页面
router.get('/activities', deyufenController.allActivities);
router.get('/activity/all', deyufenController.allActivities);

// 删除活动
router.delete('/activity/:id', requireAdmin, deyufenController.deleteActivity);

// 活动删除历史记录
router.get('/activity/delete-history', requireAdmin, deyufenController.getDeleteHistory);

// 删除指定的历史记录
router.delete('/activity/delete-history/:id', requireAdmin, deyufenController.deleteHistoryRecord);

// 清空所有删除历史记录
router.delete('/activity/delete-history/all', requireAdmin, deyufenController.clearDeleteHistory);

// 新增POST方法清空所有删除历史记录
router.post('/activity/delete-history/clear-all', requireAdmin, deyufenController.clearDeleteHistory);

// 分配活动分值页面
router.get('/activity/assign/:id', requireAdmin, deyufenController.showAssignActivityScores);

// 分配活动分值请求处理
router.post('/activity/assign/:id', requireAdmin, deyufenController.assignActivityScores);

// 活动详情页面 - 放在具体路由之后
router.get('/activity/:id', deyufenController.activityDetail);

// 修改学生活动分值页面
router.get('/student/:studentId/activity/:activityId/edit', requireAdmin, deyufenController.showEditStudentScore);

// 修改学生活动分值请求处理
router.post('/student/:studentId/activity/:activityId/edit', requireAdmin, deyufenController.updateStudentScore);

// 学生德育分详情页面
router.get('/student/:id', deyufenController.studentDetail);

// 更新所有学生总分
router.get('/refresh-scores', requireAdmin, deyufenController.refreshAllScores);

module.exports = router;