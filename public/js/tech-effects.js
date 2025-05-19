/**
 * 高级技术主题特效
 */
document.addEventListener('DOMContentLoaded', function() {
  // 创建抽签池粒子效果
  createParticlesForDrawPools();
  
  // 为结果卡片添加光效
  addGlowEffectToResults();
  
  // 应用3D悬停效果
  apply3DHoverEffects();
  
  // 给按钮添加音效反馈
  addSoundEffectsToButtons();
});

/**
 * 为抽签池添加背景粒子效果
 */
function createParticlesForDrawPools() {
  const drawPoolContainer = document.getElementById('drawPoolContainer');
  
  if (!drawPoolContainer) return;
  
  // 创建粒子容器
  const particlesContainer = document.createElement('div');
  particlesContainer.className = 'draw-pool-particles';
  particlesContainer.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
  `;
  
  drawPoolContainer.style.position = 'relative';
  drawPoolContainer.insertBefore(particlesContainer, drawPoolContainer.firstChild);
  
  // 创建粒子
  const particleCount = 30;
  for (let i = 0; i < particleCount; i++) {
    createParticle(particlesContainer);
  }
}

/**
 * 创建单个粒子并设置动画
 */
function createParticle(container) {
  const particle = document.createElement('div');
  
  // 随机粒子大小和位置
  const size = Math.random() * 5 + 3;
  const x = Math.random() * 100;
  const y = Math.random() * 100;
  const duration = Math.random() * 20 + 10;
  const delay = Math.random() * 5;
  
  // 随机颜色 - 使用蓝色和紫色调
  const colors = ['rgba(13, 110, 253, 0.3)', 'rgba(102, 16, 242, 0.3)', 'rgba(13, 202, 240, 0.3)'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  particle.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    background-color: ${color};
    border-radius: 50%;
    top: ${y}%;
    left: ${x}%;
    opacity: 0;
    pointer-events: none;
    animation: float-particle ${duration}s ease-in-out ${delay}s infinite;
  `;
  
  container.appendChild(particle);
}

/**
 * 为结果卡片添加光效
 */
function addGlowEffectToResults() {
  const resultsCard = document.querySelector('.results-card');
  
  if (!resultsCard) return;
  
  resultsCard.addEventListener('mousemove', (e) => {
    const rect = resultsCard.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    resultsCard.style.setProperty('--x', `${x}px`);
    resultsCard.style.setProperty('--y', `${y}px`);
    resultsCard.classList.add('glow-on-hover');
  });
  
  resultsCard.addEventListener('mouseleave', () => {
    resultsCard.classList.remove('glow-on-hover');
  });
}

/**
 * 应用3D悬停效果给抽签池项目
 */
function apply3DHoverEffects() {
  const poolItems = document.querySelectorAll('.draw-pool-item');
  
  poolItems.forEach(item => {
    item.addEventListener('mousemove', (e) => {
      const rect = item.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / 10;
      const rotateY = (centerX - x) / 10;
      
      item.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
      item.style.zIndex = '10';
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.transform = '';
      item.style.zIndex = '';
    });
  });
}

/**
 * 为按钮添加音效反馈
 */
function addSoundEffectsToButtons() {
  // 创建音频上下文
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  
  if (!AudioContext) return;
  
  const audioCtx = new AudioContext();
  
  // 获取所有按钮
  const buttons = document.querySelectorAll('.btn');
  
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      // 创建一个简短的音效
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = button.classList.contains('btn-primary') ? 440 : 
                                  button.classList.contains('btn-success') ? 523 : 
                                  button.classList.contains('btn-warning') ? 587 : 330;
      
      gainNode.gain.value = 0.1;
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      
      // 设置音效淡出
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      oscillator.stop(audioCtx.currentTime + 0.5);
    });
  });
}

// 添加全局CSS动画
const style = document.createElement('style');
style.textContent = `
  @keyframes float-particle {
    0%, 100% {
      transform: translateY(0) translateX(0);
      opacity: 0;
    }
    50% {
      transform: translateY(-20px) translateX(10px);
      opacity: 0.8;
    }
  }
  
  .glow-on-hover {
    position: relative;
    overflow: hidden;
  }
  
  .glow-on-hover::after {
    content: '';
    position: absolute;
    width: 80px;
    height: 80px;
    background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%);
    border-radius: 50%;
    top: var(--y, 0);
    left: var(--x, 0);
    transform: translate(-50%, -50%);
    pointer-events: none;
    opacity: 0.5;
  }
`;

document.head.appendChild(style); 