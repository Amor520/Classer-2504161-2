const DrawModel = require('../models/drawModel');

// 初始名单列表
const defaultStudents = [
  "周志鹏", "汪钦", "庄欣怡", "黄璿恩", "赵祥宇",
  "郑苏远", "朱宏喆", "刘秉承", "徐志涛", "曾海洋",
  "陆宣羽", "曾雪松", "梁焯然", "蔡明轩", "刘小睿",
  "鲁翰宇", "余军钒", "邓宏博", "丽达·奴尔布拉提", "贾璇",
  "张宇", "张圣源", "王美蘋", "曾沚玉", "朱彦臣",
  "江昕芮", "左嘉帅", "吴子健", "赵逸翔"
];

const DrawController = {
  // 渲染抽签系统首页
  renderDrawSystem: function(req, res) {
    // 获取可抽的学生
    DrawModel.getAvailableStudents((err, availableStudents) => {
      if (err) {
        console.error('获取可抽学生失败:', err);
        return res.render('draw/index', { 
          title: '抽签系统',
          active: 'draw',
          availableStudents: [],
          drawnStudents: [],
          error: '获取学生列表失败',
          session: req.session
        });
      }

      // 获取已抽的学生
      DrawModel.getDrawnStudents((err, drawnStudents) => {
        if (err) {
          console.error('获取已抽学生失败:', err);
          return res.render('draw/index', { 
            title: '抽签系统',
            active: 'draw',
            availableStudents: availableStudents,
            drawnStudents: [],
            error: '获取已抽学生列表失败',
            session: req.session
          });
        }

        // 获取抽签历史记录
        DrawModel.getDrawHistory((err, history) => {
          if (err) {
            console.error('获取抽签历史失败:', err);
          }

          res.render('draw/index', { 
            title: '抽签系统',
            active: 'draw',
            availableStudents: availableStudents,
            drawnStudents: drawnStudents,
            history: history || [],
            error: null,
            session: req.session
          });
        });
      });
    });
  },

  // 初始化抽签池
  initDrawPool: function(req, res) {
    DrawModel.initPool(defaultStudents, (err) => {
      if (err) {
        console.error('初始化抽签池失败:', err);
        return res.status(500).json({ success: false, message: '初始化抽签池失败' });
      }

      res.json({ success: true, message: '抽签池已初始化' });
    });
  },

  // 执行抽签
  drawStudents: function(req, res) {
    const { count, activityName } = req.body;
    
    // 验证参数
    if (!count || isNaN(parseInt(count)) || parseInt(count) <= 0) {
      return res.status(400).json({ success: false, message: '请输入有效的抽签数量' });
    }

    if (!activityName || activityName.trim() === '') {
      return res.status(400).json({ success: false, message: '请输入活动名称' });
    }

    // 执行抽签
    DrawModel.drawStudents(parseInt(count), activityName, (err, drawnStudents) => {
      if (err) {
        console.error('抽签失败:', err);
        return res.status(500).json({ success: false, message: err.message });
      }

      // 获取剩余可抽学生
      DrawModel.getAvailableStudents((err, availableStudents) => {
        if (err) {
          console.error('获取可抽学生失败:', err);
          return res.status(500).json({ 
            success: true, 
            drawnStudents: drawnStudents,
            message: '抽签成功，但获取剩余学生失败'
          });
        }

        res.json({ 
          success: true, 
          drawnStudents: drawnStudents,
          availableStudents: availableStudents,
          message: '抽签成功'
        });
      });
    });
  },

  // 重置抽签池
  resetDrawPool: function(req, res) {
    DrawModel.resetPool((err) => {
      if (err) {
        console.error('重置抽签池失败:', err);
        return res.status(500).json({ success: false, message: '重置抽签池失败' });
      }

      res.json({ success: true, message: '抽签池已重置' });
    });
  },

  // 获取抽签池状态
  getDrawPoolStatus: function(req, res) {
    DrawModel.getAllStudents((err, allStudents) => {
      if (err) {
        console.error('获取抽签池状态失败:', err);
        return res.status(500).json({ success: false, message: '获取抽签池状态失败' });
      }

      // 分类学生
      const availableStudents = allStudents.filter(student => student.is_available === 1);
      const drawnStudents = allStudents.filter(student => student.is_available === 0);

      res.json({ 
        success: true, 
        availableStudents: availableStudents,
        drawnStudents: drawnStudents
      });
    });
  },

  // 执行测试模式抽签（不保存结果，不更改抽签池状态）
  testDrawStudents: function(req, res) {
    const { count, activityName } = req.body;
    
    // 验证参数
    if (!count || isNaN(parseInt(count)) || parseInt(count) <= 0) {
      return res.status(400).json({ success: false, message: '请输入有效的抽签数量' });
    }

    if (!activityName || activityName.trim() === '') {
      return res.status(400).json({ success: false, message: '请输入活动名称' });
    }

    // 获取可抽的学生
    DrawModel.getAvailableStudents((err, students) => {
      if (err) {
        console.error('获取可抽学生失败:', err);
        return res.status(500).json({ success: false, message: '获取可抽学生失败' });
      }

      // 如果可抽学生数量不足
      if (students.length < count) {
        return res.status(400).json({ 
          success: false, 
          message: `可抽学生数量不足，当前只有 ${students.length} 名学生可抽`
        });
      }

      // 随机抽取指定数量的学生（但不改变其状态）
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

      // 返回抽签结果，但不修改数据库
      res.json({ 
        success: true, 
        drawnStudents: drawnStudents,
        availableStudents: students, // 返回所有可抽学生（不变）
        message: '测试抽签成功'
      });
    });
  },

  // 删除抽签历史记录
  deleteDrawHistory: function(req, res) {
    const recordId = req.params.id;
    
    if (!recordId || isNaN(parseInt(recordId))) {
      return res.status(400).json({ success: false, message: '无效的记录ID' });
    }
    
    DrawModel.deleteDrawHistory(parseInt(recordId), (err) => {
      if (err) {
        console.error('删除抽签历史记录失败:', err);
        return res.status(500).json({ success: false, message: '删除抽签历史记录失败' });
      }
      
      res.json({ success: true, message: '抽签历史记录已删除' });
    });
  }
};

module.exports = DrawController; 