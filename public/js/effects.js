// 页面加载完成后执行，使用立即执行函数避免全局变量污染
(function() {
  // DOMContentLoaded比load事件更早触发，提高页面响应速度
  document.addEventListener('DOMContentLoaded', function() {
    // 导航栏滚动效果 - 使用节流函数优化滚动事件
    const navbar = document.querySelector('.navbar');
    let scrollTimer = null;
    
    if (navbar) {
      window.addEventListener('scroll', function() {
        if (!scrollTimer) {
          scrollTimer = setTimeout(function() {
            if (window.pageYOffset > 50) {
              navbar.classList.add('scrolled');
            } else {
              navbar.classList.remove('scrolled');
            }
            scrollTimer = null;
          }, 100);
        }
      });
    }
    
    // 为表格行添加动画延迟 - 批量处理提高性能
    const tableRows = document.querySelectorAll('tbody tr');
    const fragment = document.createDocumentFragment();
    tableRows.forEach((row, index) => {
      row.style.animationDelay = (0.05 * index) + 's';
      fragment.appendChild(row.cloneNode(true));
    });
    
    // 为徽章添加效果 - 使用事件委托减少事件监听器数量
    document.body.addEventListener('mouseenter', function(e) {
      if (e.target.classList.contains('badge')) {
        e.target.style.animation = 'pulse 0.6s ease';
      }
    }, true);
    
    document.body.addEventListener('animationend', function(e) {
      if (e.target.classList.contains('badge')) {
        e.target.style.animation = '';
      }
    }, true);
    
    // 为按钮添加效果 - 优化波纹效果
    document.body.addEventListener('click', function(e) {
      const button = e.target.closest('.btn');
      if (button) {
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 直接使用CSS变量减少DOM操作
        button.style.setProperty('--ripple-x', x + 'px');
        button.style.setProperty('--ripple-y', y + 'px');
        button.classList.add('btn-ripple-effect');
        
        setTimeout(() => {
          button.classList.remove('btn-ripple-effect');
        }, 500);
      }
    });
    
    // 自动隐藏消息提示 - 使用requestAnimationFrame提高性能
    const alerts = document.querySelectorAll('.alert-dismissible');
    if (alerts.length > 0) {
      requestAnimationFrame(() => {
        alerts.forEach(alert => {
          setTimeout(() => {
            const closeButton = alert.querySelector('.btn-close');
            if (closeButton) {
              closeButton.click();
            }
          }, 5000);
        });
      });
    }
    
    // 为卡片添加简单悬停效果
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
      card.addEventListener('mouseenter', function() {
        // 使用transform而非多个CSS属性，提高性能
        card.style.transform = 'translateY(-3px)';
      });
      
      card.addEventListener('mouseleave', function() {
        card.style.transform = '';
      });
    });
  });
  
  // 添加新的样式 - 使用创建style标签而非动态添加类
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    /* 波纹按钮效果 */
    .btn {
      position: relative;
      overflow: hidden;
    }
    
    .btn-ripple-effect:after {
      content: '';
      position: absolute;
      width: 100px;
      height: 100px;
      left: var(--ripple-x, 50%);
      top: var(--ripple-y, 50%);
      margin-left: -50px;
      margin-top: -50px;
      background: rgba(255, 255, 255, 0.4);
      border-radius: 50%;
      animation: ripple 0.5s ease-out;
      pointer-events: none;
    }
    
    @keyframes ripple {
      to {
        transform: scale(3);
        opacity: 0;
      }
    }
    
    /* 简化表格行效果 */
    tbody tr:hover td {
      color: #007bff;
    }
    
    /* 卡片内容效果 */
    .card-body {
      transition: transform 0.3s ease;
    }
    
    .card:hover .card-body {
      transform: translateY(-3px);
    }
    
    /* 按钮加载效果 */
    .btn.loading {
      color: transparent !important;
    }
    
    .btn.loading:after {
      content: '';
      position: absolute;
      width: 1em;
      height: 1em;
      border: 2px solid #fff;
      border-right-color: transparent;
      border-radius: 50%;
      left: 50%;
      top: 50%;
      margin: -0.5em 0 0 -0.5em;
      animation: spin 0.6s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  
  document.head.appendChild(styleElement);
})(); 