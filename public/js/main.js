// 在文档加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  // 初始化粒子特效
  initParticles();
  
  // 添加卡片动画效果
  initCardAnimations();
  
  // 为导航栏中当前页面链接添加active类
  highlightCurrentNavLink();
});

// 初始化粒子背景
function initParticles() {
  if (typeof particlesJS !== 'undefined' && document.getElementById('particles-js')) {
    particlesJS('particles-js', {
      particles: {
        number: { value: 80, density: { enable: true, value_area: 800 } },
        color: { value: '#0d6efd' },
        shape: { type: 'circle' },
        opacity: { value: 0.5, random: false },
        size: { value: 3, random: true },
        line_linked: { enable: true, distance: 150, color: '#0d6efd', opacity: 0.4, width: 1 },
        move: { enable: true, speed: 2, direction: 'none', random: false, straight: false, out_mode: 'out' }
      },
      interactivity: {
        detect_on: 'canvas',
        events: {
          onhover: { enable: true, mode: 'grab' },
          onclick: { enable: true, mode: 'push' },
          resize: true
        }
      }
    });
  }
}

// 卡片动画效果
function initCardAnimations() {
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-5px)';
      this.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.1)';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05)';
    });
  });
}

// 高亮导航栏中当前页面的链接
function highlightCurrentNavLink() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || 
        (currentPath.includes(href) && href !== '/')) {
      link.classList.add('active');
    }
  });
  
  // 如果是首页，单独处理
  if (currentPath === '/') {
    const homeLink = document.querySelector('.navbar-nav .nav-link[href="/"]');
    if (homeLink) homeLink.classList.add('active');
  }
} 