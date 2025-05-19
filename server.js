const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// 中间件设置
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 设置会话
app.use(session({
  secret: 'classer2308secretkey',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 3600000 } // 会话有效期1小时
}));

// 设置视图引擎
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 消息中间件 - 将会话中的消息传递给所有视图
app.use((req, res, next) => {
  res.locals.message = req.session.message;
  delete req.session.message;
  next();
});

// 路由
const indexRoutes = require('./routes/index');
const drawRoutes = require('./routes/drawRoutes'); // 抽签系统路由

app.use('/', indexRoutes);
app.use('/draw', drawRoutes); // 使用抽签系统路由

// 404错误处理
app.use((req, res) => {
  res.status(404).render('error', { 
    title: '页面未找到',
    message: '页面未找到' 
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: '服务器错误',
    message: '服务器错误，请稍后再试' 
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
}); 