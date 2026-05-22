/**
 * 服务评价系统 - 管理后台逻辑
 * 功能: 数据统计展示、评价列表查询、按营业厅筛选、分页、CSV导出
 */

// ========== API 配置 ==========
// API_BASE 定义在 config.js 中

// ========== 全局状态 ==========
const adminState = {
  currentPage: 1,
  pageSize: 15,
  totalPages: 1,
  currentOutlet: '', // 当前筛选的营业厅
};

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
  initOutletFilter();
  loadStats();
  loadOutletStats();
  loadEvaluations();
  bindEvents();
});

/**
 * 绑定事件
 */
function bindEvents() {
  // 筛选器变化
  document.getElementById('outletFilter').addEventListener('change', function () {
    adminState.currentOutlet = this.value;
    adminState.currentPage = 1;
    loadStats();
    loadOutletStats();
    loadEvaluations();
  });

  // 刷新按钮
  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadStats();
    loadOutletStats();
    loadEvaluations();
  });

  // 导出CSV
  document.getElementById('exportBtn').addEventListener('click', exportCSV);

  // 分页按钮
  document.getElementById('prevBtn').addEventListener('click', () => {
    if (adminState.currentPage > 1) {
      adminState.currentPage--;
      loadEvaluations();
    }
  });

  document.getElementById('nextBtn').addEventListener('click', () => {
    if (adminState.currentPage < adminState.totalPages) {
      adminState.currentPage++;
      loadEvaluations();
    }
  });
}

/**
 * 初始化营业厅筛选下拉框
 */
async function initOutletFilter() {
  try {
    const response = await fetch(`${API_BASE}/api/outlets`);
    const result = await response.json();

    if (result.success && result.data) {
      const select = document.getElementById('outletFilter');
      result.data.forEach(outlet => {
        const option = document.createElement('option');
        option.value = outlet.code;
        option.textContent = outlet.name;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('获取营业厅列表失败:', error);
  }
}

/**
 * 加载总体统计数据
 */
async function loadStats() {
  try {
    const outletCode = adminState.currentOutlet;
    const url = outletCode
      ? `${API_BASE}/api/stats?outletCode=${outletCode}`
      : `${API_BASE}/api/stats`;

    const response = await fetch(url);
    const result = await response.json();

    if (result.success && result.data) {
      const { overall, outlets } = result.data;

      // 总评价数
      document.getElementById('totalCount').textContent = overall.totalCount || 0;

      // 总平均分
      document.getElementById('overallAvg').textContent =
        overall.overallAvgScore ? overall.overallAvgScore.toFixed(1) : '-';

      // 营业厅数量
      document.getElementById('todayCount').textContent = outlets.length;

      // 最高分营业厅
      if (outlets.length > 0) {
        const best = outlets.reduce((a, b) =>
          (a.avgScore || 0) > (b.avgScore || 0) ? a : b
        );
        document.getElementById('bestOutlet').textContent = best.outletName || '-';
      } else {
        document.getElementById('bestOutlet').textContent = '-';
      }
    }
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
}

/**
 * 加载各营业厅统计详情表
 */
async function loadOutletStats() {
  const tbody = document.getElementById('outletStatsBody');

  try {
    const outletCode = adminState.currentOutlet;
    const url = outletCode
      ? `${API_BASE}/api/stats?outletCode=${outletCode}`
      : `${API_BASE}/api/stats`;

    const response = await fetch(url);
    const result = await response.json();

    if (result.success && result.data && result.data.outlets) {
      const outlets = result.data.outlets;

      if (outlets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-secondary)">暂无数据</td></tr>';
        return;
      }

      tbody.innerHTML = outlets.map(o => `
        <tr>
          <td><strong>${escapeHtml(o.outletName)}</strong></td>
          <td>${o.count}</td>
          <td>
            <span class="score-badge ${o.avgScore >= 8 ? 'high' : o.avgScore >= 5 ? 'mid' : 'low'}">
              ${o.avgScore.toFixed(1)}
            </span>
          </td>
          <td>${o.minScore}</td>
          <td>${o.maxScore}</td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('加载营业厅统计失败:', error);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--danger)">加载失败</td></tr>';
  }
}

/**
 * 加载评价记录列表
 */
async function loadEvaluations() {
  const tbody = document.getElementById('evalTableBody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-secondary)">加载中...</td></tr>';

  try {
    const outletCode = adminState.currentOutlet;
    const url = new URL(`${API_BASE}/api/evaluations`);
    if (outletCode) url.searchParams.set('outletCode', outletCode);
    url.searchParams.set('page', adminState.currentPage);
    url.searchParams.set('pageSize', adminState.pageSize);

    const response = await fetch(url.toString());
    const result = await response.json();

    if (result.success && result.data) {
      const { list, total, page, pageSize } = result.data;

      adminState.totalPages = Math.ceil(total / pageSize) || 1;

      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-secondary)">暂无评价记录</td></tr>';
      } else {
        tbody.innerHTML = list.map(item => `
          <tr>
            <td>${item.id}</td>
            <td>${escapeHtml(item.outletName)}</td>
            <td>
              <span class="score-badge ${item.score >= 8 ? 'high' : item.score >= 5 ? 'mid' : 'low'}">
                ${item.score}
              </span>
            </td>
            <td>${maskPhone(item.phone)}</td>
            <td style="font-size:12px; color:var(--text-secondary)">${escapeHtml(item.ip)}</td>
            <td style="font-size:12px; color:var(--text-secondary)">${item.createdAt || '-'}</td>
          </tr>
        `).join('');
      }

      // 更新分页
      updatePagination(page, total, pageSize);
    }
  } catch (error) {
    console.error('加载评价列表失败:', error);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--danger)">加载失败，请刷新重试</td></tr>';
  }
}

/**
 * 更新分页控件
 * @param {number} page - 当前页
 * @param {number} total - 总记录数
 * @param {number} pageSize - 每页条数
 */
function updatePagination(page, total, pageSize) {
  const totalPages = Math.ceil(total / pageSize) || 1;
  adminState.totalPages = totalPages;

  document.getElementById('prevBtn').disabled = page <= 1;
  document.getElementById('nextBtn').disabled = page >= totalPages;
  document.getElementById('pageInfo').textContent =
    `第 ${page} / ${totalPages} 页 (共 ${total} 条)`;
}

/**
 * 导出CSV
 */
async function exportCSV() {
  try {
    const outletCode = adminState.currentOutlet;
    const url = new URL(`${API_BASE}/api/export`);
    if (outletCode) url.searchParams.set('outletCode', outletCode);

    // 使用 fetch 下载文件
    const response = await fetch(url.toString());

    if (!response.ok) {
      alert('导出失败，请重试');
      return;
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;

    // 从响应头获取文件名，或使用默认文件名
    const disposition = response.headers.get('Content-Disposition');
    let filename = 'evaluations.csv';
    if (disposition) {
      const match = disposition.match(/filename="?(.+?)"?$/);
      if (match) filename = match[1];
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('导出CSV失败:', error);
    alert('导出失败: ' + error.message);
  }
}

/**
 * HTML 转义，防止 XSS
 * @param {string} str - 待转义字符串
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * 手机号脱敏显示（138****1234）
 * @param {string} phone - 完整手机号
 * @returns {string}
 */
function maskPhone(phone) {
  if (!phone || phone.length !== 11) return phone;
  return phone.substring(0, 3) + '****' + phone.substring(7);
}