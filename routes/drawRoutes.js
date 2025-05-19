const express = require('express');
const router = express.Router();
const DrawController = require('../controllers/drawController');

// 渲染抽签系统首页
router.get('/', DrawController.renderDrawSystem);

// API接口：初始化抽签池
router.post('/api/init', DrawController.initDrawPool);

// API接口：执行抽签
router.post('/api/draw', DrawController.drawStudents);

// API接口：测试模式抽签（不保存结果）
router.post('/api/test-draw', DrawController.testDrawStudents);

// API接口：重置抽签池
router.post('/api/reset', DrawController.resetDrawPool);

// API接口：获取抽签池状态
router.get('/api/status', DrawController.getDrawPoolStatus);

// API接口：删除抽签历史记录
router.delete('/api/delete-record/:id', DrawController.deleteDrawHistory);

module.exports = router; 