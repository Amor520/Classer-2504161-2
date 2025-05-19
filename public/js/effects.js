/**
 * 页面特效控制脚本
 */
document.addEventListener('DOMContentLoaded', function() {
  // 导航栏滚动效果
  const navbar = document.querySelector('.navbar');
  
  if (navbar) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 30) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }
  
  // 添加波纹点击效果到所有按钮
  const buttons = document.querySelectorAll('.btn');
  
  buttons.forEach(function(button) {
    button.addEventListener('mousedown', function(e) {
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const ripple = document.createElement('span');
      ripple.className = 'btn-ripple';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      
      button.appendChild(ripple);
      
      setTimeout(function() {
        ripple.remove();
      }, 600);
    });
  });
  
  // 为卡片添加悬停效果
  const cards = document.querySelectorAll('.card');
  
  if (cards.length > 0) {
    cards.forEach(card => {
      card.addEventListener('mousemove', function(e) {
        // 计算鼠标位置相对于卡片中心的偏移
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        // 根据鼠标位置计算倾斜角度，最大倾斜5度
        const tiltX = (y / rect.height) * 5;
        const tiltY = -(x / rect.width) * 5;
        
        // 应用3D变换
        this.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`;
      });
      
      card.addEventListener('mouseleave', function() {
        // 恢复原始状态
        this.style.transform = '';
      });
    });
  }
  
  // 添加平滑滚动效果
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      
      if (target) {
        window.scrollTo({
          top: target.offsetTop - 80, // 考虑导航栏高度
          behavior: 'smooth'
        });
      }
    });
  });
}); 