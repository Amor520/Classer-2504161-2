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
    try {
      const { count, activityName, signedStudents, excludedStudents, excludeReason } = req.body;
      
      // 验证参数
      if (!count || isNaN(parseInt(count)) || parseInt(count) <= 0) {
        return res.status(400).json({ success: false, message: '请输入有效的抽签数量' });
      }

      if (!activityName || activityName.trim() === '') {
        return res.status(400).json({ success: false, message: '请输入活动名称' });
      }

      // 增加请求超时处理
      const timeoutId = setTimeout(() => {
        console.error('抽签请求超时');
        return res.status(504).json({ success: false, message: '请求超时，请稍后再试' });
      }, 15000); // 15秒超时

      // 执行抽签，并传入已报名和不参与抽签的学生信息
      DrawModel.drawStudents(parseInt(count), activityName, signedStudents, excludedStudents, excludeReason, (err, drawnStudents) => {
        // 清除超时计时器
        clearTimeout(timeoutId);
        
        if (err) {
          console.error('抽签失败:', err);
          return res.status(500).json({ success: false, message: err.message || '抽签过程中发生错误' });
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
    } catch (error) {
      console.error('抽签系统错误:', error);
      res.status(500).json({ success: false, message: '服务器内部错误，请稍后再试' });
    }
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
    try {
      const { count, activityName, signedStudents, excludedStudents, excludeReason } = req.body;
      
      // 验证参数
      if (!count || isNaN(parseInt(count)) || parseInt(count) <= 0) {
        return res.status(400).json({ success: false, message: '请输入有效的抽签数量' });
      }

      if (!activityName || activityName.trim() === '') {
        return res.status(400).json({ success: false, message: '请输入活动名称' });
      }

      // 增加请求超时处理
      const timeoutId = setTimeout(() => {
        console.error('测试抽签请求超时');
        return res.status(504).json({ success: false, message: '请求超时，请稍后再试' });
      }, 15000); // 15秒超时

      // 获取可抽的学生
      DrawModel.getAvailableStudents((err, students) => {
        // 清除超时计时器
        clearTimeout(timeoutId);
        
        if (err) {
          console.error('获取可抽学生失败:', err);
          return res.status(500).json({ success: false, message: '获取可抽学生失败' });
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
          return res.status(400).json({ 
            success: false, 
            message: `可抽学生数量不足，当前只有 ${availableForDraw.length} 名学生可抽`
          });
        }

        try {
          // 随机抽取指定数量的学生（但不改变其状态）
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
              // 确保ID为整数格式
              student.id = parseInt(student.id);
              finalDrawnStudents.push(student);
            });
          }
          
          // 处理不参与抽签的学生（仅用于展示）
          let excludedForDisplay = [];
          if (excludedStudents && excludedStudents.length > 0) {
            excludedForDisplay = excludedStudents.map(student => {
              return {
                ...student,
                id: parseInt(student.id),
                isExcluded: true,
                excludeReason: excludeReason || '未参与'
              };
            });
          }

          // 返回抽签结果，但不修改数据库
          res.json({ 
            success: true, 
            drawnStudents: finalDrawnStudents,
            excludedStudents: excludedForDisplay,
            availableStudents: students, // 返回所有可抽学生（不变）
            message: '测试抽签成功'
          });
        } catch (innerError) {
          console.error('测试抽签过程错误:', innerError);
          res.status(500).json({ 
            success: false, 
            message: '测试抽签过程中发生错误'
          });
        }
      });
    } catch (error) {
      console.error('测试抽签系统错误:', error);
      res.status(500).json({ success: false, message: '服务器内部错误，请稍后再试' });
    }
  },

  // 删除抽签历史记录
  deleteDrawHistory: function(req, res) {
    // 检查是否为超级管理员
    if (!req.session || !req.session.admin || req.session.admin.role !== 2) {
      return res.status(403).json({ 
        success: false, 
        message: '权限不足，仅超级管理员可以删除抽签历史记录' 
      });
    }
    
    const recordId = req.params.id;
    
    if (!recordId || isNaN(parseInt(recordId))) {
      return res.status(400).json({ success: false, message: '无效的记录ID' });
    }
    
    // 首先获取历史记录
    DrawModel.getDrawHistoryById(parseInt(recordId), (err, record) => {
      if (err) {
        console.error('获取抽签历史记录失败:', err);
        return res.status(500).json({ success: false, message: '获取抽签历史记录失败' });
      }
      
      if (!record) {
        return res.status(404).json({ success: false, message: '找不到该抽签历史记录' });
      }
      
      // 删除历史记录
      DrawModel.deleteDrawHistory(parseInt(recordId), (err) => {
        if (err) {
          console.error('删除抽签历史记录失败:', err);
          return res.status(500).json({ success: false, message: '删除抽签历史记录失败' });
        }
        
        // 判断是否需要恢复抽签池
        const shouldRestore = req.body.restore === true;
        if (shouldRestore) {
          DrawModel.restoreDrawnStudentsToPool(record.drawn_names, (err) => {
            if (err) {
              console.error('恢复抽签池失败:', err);
              return res.status(500).json({ 
                success: true, 
                message: '抽签历史记录已删除，但恢复抽签池失败',
                restored: false
              });
            }
            
            res.json({ 
              success: true, 
              message: '抽签历史记录已删除，抽签池已恢复',
              restored: true
            });
          });
        } else {
          res.json({ 
            success: true, 
            message: '抽签历史记录已删除',
            restored: false
          });
        }
      });
    });
  },
  
  // 删除所有抽签历史记录
  deleteAllDrawHistory: function(req, res) {
    // 先获取记录数量，检查是否有记录需要删除
    DrawModel.getDrawHistory((err, history) => {
      if (err) {
        console.error('获取抽签历史记录失败:', err);
        return res.status(500).json({ success: false, message: '获取抽签历史记录失败' });
      }
      
      // 如果没有记录，直接返回成功
      if (!history || history.length === 0) {
        return res.json({ 
          success: true, 
          message: '没有记录需要删除',
          count: 0 
        });
      }
      
      // 有记录，执行删除
      DrawModel.deleteAllDrawHistory((err) => {
        if (err) {
          console.error('删除所有抽签历史记录失败:', err);
          return res.status(500).json({ success: false, message: '删除所有抽签历史记录失败' });
        }

        res.json({ 
          success: true, 
          message: `已成功删除 ${history.length} 条抽签历史记录`,
          count: history.length
        });
      });
    });
  },
  
  // 获取单条抽签历史记录详情
  getDrawHistoryById: function(req, res) {
    const id = req.params.id;
    
    if (!id) {
      return res.status(400).json({ success: false, message: '请提供有效的抽签记录ID' });
    }
    
    DrawModel.getDrawHistoryById(id, (err, history) => {
      if (err) {
        console.error('获取抽签历史记录详情失败:', err);
        return res.status(500).json({ success: false, message: '获取抽签历史记录详情失败' });
      }
      
      if (!history) {
        return res.status(404).json({ success: false, message: '未找到该抽签历史记录' });
      }
      
      // 处理抽中的学生名字列表
      let drawnStudents = [];
      if (history.drawn_names) {
        drawnStudents = history.drawn_names.split(',').map(name => {
          return { name: name.trim() };
        });
      }
      
      // 处理已报名的学生名字列表
      let signedStudents = [];
      if (history.signed_names) {
        signedStudents = history.signed_names.split(',').filter(name => name.trim()).map(name => {
          return { name: name.trim() };
        });
      }
      
      // 处理不参与抽签的学生名字列表
      let excludedStudents = [];
      if (history.excluded_names) {
        excludedStudents = history.excluded_names.split(',').filter(name => name.trim()).map(name => {
          return { 
            name: name.trim(),
            excludeReason: history.exclude_reason || '未说明原因'
          };
        });
      }
      
      // 返回结构化数据
      res.json({
        success: true,
        history: {
          id: history.id,
          activityName: history.activity_name,
          drawCount: history.draw_count,
          drawnStudents: drawnStudents,
          signedStudents: signedStudents,
          excludedStudents: excludedStudents,
          excludeReason: history.exclude_reason || '',
          createdAt: history.created_at
        }
      });
    });
  },

  // 获取所有抽签历史记录
  getAllDrawHistory: function(req, res) {
    DrawModel.getDrawHistory((err, history) => {
      if (err) {
        console.error('获取抽签历史记录失败:', err);
        return res.status(500).json({ success: false, message: '获取抽签历史记录失败' });
      }
      
      res.json({
        success: true,
        history: history || []
      });
    });
  }
};

module.exports = DrawController; 