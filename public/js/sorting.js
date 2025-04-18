/**
 * 德育分排序功能
 * 用于处理表格的排序功能，包括按学号、姓名和分数排序
 */

// 按学号排序
function sortByStudentId() {
  console.log('按学号排序');
  
  // 获取表格元素
  const table = document.querySelector('table');
  if (!table) {
    console.error('未找到表格元素');
    return;
  }
  
  // 获取所有行
  const tbody = table.querySelector('tbody');
  if (!tbody) {
    console.error('未找到表格体');
    return;
  }
  
  // 获取所有行并转换为数组
  const rows = Array.from(tbody.rows);
  
  // 排序行 - 按学号
  rows.sort((a, b) => {
    const idA = a.cells[1].textContent.trim();
    const idB = b.cells[1].textContent.trim();
    return idA.localeCompare(idB, undefined, { numeric: true });
  });
  
  // 清空表格
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }
  
  // 重新添加排序后的行
  rows.forEach((row, index) => {
    // 更新排名
    updateRankCell(row, index);
    tbody.appendChild(row);
  });
  
  // 更新排序按钮状态
  updateSortButtons('按学号排序');
}

// 按分数排序 (降序或升序)
function sortByScore(order) {
  console.log(`按分数${order === 'desc' ? '降序' : '升序'}排序`);
  
  // 获取表格元素
  const table = document.querySelector('table');
  if (!table) {
    console.error('未找到表格元素');
    return;
  }
  
  // 获取所有行
  const tbody = table.querySelector('tbody');
  if (!tbody) {
    console.error('未找到表格体');
    return;
  }
  
  // 获取所有行并转换为数组
  const rows = Array.from(tbody.rows);
  
  // 排序行 - 按分数
  rows.sort((a, b) => {
    const scoreA = parseFloat(a.cells[3].textContent.trim());
    const scoreB = parseFloat(b.cells[3].textContent.trim());
    return order === 'desc' ? scoreB - scoreA : scoreA - scoreB;
  });
  
  // 清空表格
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }
  
  // 重新添加排序后的行
  rows.forEach((row, index) => {
    // 更新排名
    updateRankCell(row, index);
    tbody.appendChild(row);
  });
  
  // 更新排序按钮状态
  updateSortButtons(order === 'desc' ? '分数降序' : '分数升序');
}

// 按姓名排序
function sortByName() {
  console.log('按姓名排序');
  
  // 获取表格元素
  const table = document.querySelector('table');
  if (!table) {
    console.error('未找到表格元素');
    return;
  }
  
  // 获取所有行
  const tbody = table.querySelector('tbody');
  if (!tbody) {
    console.error('未找到表格体');
    return;
  }
  
  // 获取所有行并转换为数组
  const rows = Array.from(tbody.rows);
  
  // 排序行 - 按姓名
  rows.sort((a, b) => {
    const nameA = a.cells[2].textContent.trim();
    const nameB = b.cells[2].textContent.trim();
    return nameA.localeCompare(nameB, 'zh-CN');
  });
  
  // 清空表格
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }
  
  // 重新添加排序后的行
  rows.forEach((row, index) => {
    // 更新排名
    updateRankCell(row, index);
    tbody.appendChild(row);
  });
  
  // 更新排序按钮状态
  updateSortButtons('按姓名');
}

// 更新排名单元格
function updateRankCell(row, index) {
  const rankCell = row.cells[0];
  if (index < 3) {
    const badgeClass = index === 0 ? 'bg-warning' : (index === 1 ? 'bg-secondary' : 'bg-bronze');
    rankCell.innerHTML = `<span class="badge rounded-pill ${badgeClass}">${index + 1}</span>`;
  } else {
    rankCell.textContent = index + 1;
  }
}

// 更新排序按钮状态
function updateSortButtons(activeButtonText) {
  // 查找所有排序按钮
  const sortButtons = document.querySelectorAll('.sort-btn');
  
  // 移除所有按钮的active类
  sortButtons.forEach(btn => {
    btn.classList.remove('active');
    
    // 根据按钮文本或数据属性查找匹配的按钮
    if (btn.textContent.includes(activeButtonText) || 
        (btn.dataset.sort && btn.dataset.sort === activeButtonText)) {
      btn.classList.add('active');
    }
  });
}

// 页面加载完成后初始化排序功能
document.addEventListener('DOMContentLoaded', function() {
  // 按学号排序按钮
  const idSortBtn = document.querySelector('#btnStudentId, [data-sort="按学号排序"]');
  if (idSortBtn) {
    idSortBtn.addEventListener('click', function(e) {
      e.preventDefault();
      sortByStudentId();
    });
  }
  
  // 分数降序按钮
  const scoreDescBtn = document.querySelector('#btnScoreDesc, [data-sort="分数降序"]');
  if (scoreDescBtn) {
    scoreDescBtn.addEventListener('click', function(e) {
      e.preventDefault();
      sortByScore('desc');
    });
  }
  
  // 分数升序按钮
  const scoreAscBtn = document.querySelector('#btnScoreAsc, [data-sort="分数升序"]');
  if (scoreAscBtn) {
    scoreAscBtn.addEventListener('click', function(e) {
      e.preventDefault();
      sortByScore('asc');
    });
  }
  
  // 按姓名排序按钮
  const nameBtn = document.querySelector('#btnNameAsc, [data-sort="按姓名"]');
  if (nameBtn) {
    nameBtn.addEventListener('click', function(e) {
      e.preventDefault();
      sortByName();
    });
  }
}); 