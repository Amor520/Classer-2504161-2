const express = require('express');
const router = express.Router();
const deyufenController = require('../controllers/deyufenController');

// 新主页
router.get('/', deyufenController.classHomePage);

// 收集表系统主页
router.get('/forms', deyufenController.formsHomePage);
router.get('/forms/all', deyufenController.allForms);
router.get('/forms/create', deyufenController.showCreateForm);
router.get('/forms/submissions', deyufenController.formSubmissions);

// 德育分管理系统主页
router.get('/deyufen', deyufenController.homePage);

// 德育分总览页面
router.get('/overview', deyufenController.overview);

// 德育分排名页面
router.get('/ranking', deyufenController.ranking);

// 活动权限验证页面
router.get('/activity/auth', deyufenController.showActivityAuth);

// 活动权限验证处理
router.post('/activity/auth', deyufenController.verifyActivityAuth);

// 添加活动页面 - 需要权限验证
router.get('/activity/add', deyufenController.checkActivityAuth, deyufenController.showAddActivity);

// 添加活动请求处理
router.post('/activity/add', deyufenController.checkActivityAuth, deyufenController.addActivity);

// 所有活动列表页面
router.get('/activities', deyufenController.allActivities);

// 分配活动分值页面
router.get('/activity/assign/:id', deyufenController.checkActivityAuth, deyufenController.showAssignActivityScores);

// 分配活动分值请求处理
router.post('/activity/assign/:id', deyufenController.checkActivityAuth, deyufenController.assignActivityScores);

// 活动详情页面 - 放在具体路由之后
router.get('/activity/:id', deyufenController.activityDetail);

// 修改学生活动分值页面
router.get('/student/:studentId/activity/:activityId/edit', deyufenController.checkActivityAuth, deyufenController.showEditStudentScore);

// 修改学生活动分值请求处理
router.post('/student/:studentId/activity/:activityId/edit', deyufenController.checkActivityAuth, deyufenController.updateStudentScore);

// 学生德育分详情页面
router.get('/student/:id', deyufenController.studentDetail);

// 更新所有学生总分
router.get('/refresh-scores', deyufenController.refreshAllScores);

module.exports = router; 