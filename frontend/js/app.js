/**
 * 服务评价系统 - 用户评价页面逻辑
 * 功能: 二维码识别营业厅、评分选择、手机号校验、提交评价
 */

// ========== API 配置 ==========
// API_BASE 定义在 config.js 中，部署时修改 config.js

// ========== 营业厅映射表（前端冗余一份，快速显示） ==========
const OUTLET_MAP = {
  longshan: '龙山路营业厅',
  huxin: '湖心路营业厅',
  chengnan: '城南营业厅',
  gaoxin: '高新区营业厅',
  binhu: '滨湖营业厅',
};

// ========== 全局状态 ==========
const state = {
  outletCode: '',       // 营业厅代码（从URL参数获取）
  outletName: '',       // 营业厅名称
  selectedScore: 0,     // 当前选择的评分
  phone: '',            // 手机号
  isSubmitting: false,  // 是否正在提交
};

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
  initOutlet();
  initScoreButtons();
  initCustomScoreInput();
  initPhoneInput();
  initSubmitButton();
});

/**
 * 从URL参数中解析营业厅代码并显示名称
 */
function initOutlet() {
  const params = new URLSearchParams(window.location.search);
  const outletCode = params.get('outlet') || '';

  if (!outletCode) {
    // 没有营业厅参数，显示通用页面
    state.outletCode = '';
    state.outletName = '';
    document.getElementById('outletName').textContent = '未指定营业厅';
    console.warn('URL缺少outlet参数，示例: ?outlet=longshan');
    return;
  }

  const outletName = OUTLET_MAP[outletCode];
  if (!outletName) {
    // 未知营业厅代码
    state.outletCode = outletCode;
    state.outletName = outletCode;
    document.getElementById('outletName').textContent = '未知营业厅: ' + outletCode;
    console.warn('未知的营业厅代码:', outletCode);
    return;
  }

  state.outletCode = outletCode;
  state.outletName = outletName;
  document.getElementById('outletName').textContent = outletName;
}

/**
 * 动态生成 1-10 评分按钮
 */
function initScoreButtons() {
  const container = document.getElementById('scoreButtons');
  container.innerHTML = '';

  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement('div');
    btn.className = 'score-btn';
    btn.textContent = i;
    btn.dataset.score = i;

    btn.addEventListener('click', function () {
      selectScore(i, this);
    });

    container.appendChild(btn);
  }
}

/**
 * 选择评分
 * @param {number} score - 选择的分数
 * @param {HTMLElement} clickedBtn - 被点击的按钮元素
 */
function selectScore(score, clickedBtn) {
  state.selectedScore = score;

  // 更新UI
  document.getElementById('currentScore').textContent = score;
  document.getElementById('scoreLabel').textContent =
    score >= 9 ? '非常满意！' :
    score >= 7 ? '比较满意' :
    score >= 5 ? '一般' :
    score >= 3 ? '不太满意' : '非常不满意';

  // 自定义输入框同步
  document.getElementById('customScoreInput').value = score;

  // 按钮高亮
  document.querySelectorAll('.score-btn').forEach(b => b.classList.remove('active'));
  if (clickedBtn) {
    clickedBtn.classList.add('active');
  }

  // 检查是否可以启用提交按钮
  checkSubmitEnabled();
}

/**
 * 初始化自定义分数输入
 */
function initCustomScoreInput() {
  const input = document.getElementById('customScoreInput');

  // 输入时校验和处理
  input.addEventListener('input', function () {
    let val = parseInt(this.value, 10);

    if (isNaN(val) || val < 1) {
      val = 1;
    } else if (val > 10) {
      val = 10;
    }

    if (val >= 1 && val <= 10) {
      this.value = val;
      selectScore(val, null);

      // 高亮对应按钮
      document.querySelectorAll('.score-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.score) === val);
      });
    }
  });

  // 失焦时确保值有效
  input.addEventListener('blur', function () {
    const val = parseInt(this.value, 10);
    if (isNaN(val) || val < 1 || val > 10) {
      this.value = '';
      state.selectedScore = 0;
      document.getElementById('currentScore').textContent = '-';
      document.getElementById('scoreLabel').textContent = '请点击下方按钮选择分数';
      document.querySelectorAll('.score-btn').forEach(b => b.classList.remove('active'));
      checkSubmitEnabled();
    }
  });
}

/**
 * 初始化手机号输入
 */
function initPhoneInput() {
  const input = document.getElementById('phoneInput');
  const phoneGroup = document.getElementById('phoneGroup');

  // 只允许数字输入
  input.addEventListener('input', function () {
    // 移除非数字字符
    this.value = this.value.replace(/\D/g, '');
    state.phone = this.value;

    // 实时校验
    if (this.value.length > 0 && !isValidPhone(this.value)) {
      phoneGroup.classList.add('error');
    } else {
      phoneGroup.classList.remove('error');
    }

    checkSubmitEnabled();
  });

  // 尝试自动填充手机号
  autoFillPhone();
}

/**
 * 自动填充手机号（多策略尝试）
 * 优先级: localStorage记忆 > URL参数 > 浏览器自动填充
 */
function autoFillPhone() {
  const input = document.getElementById('phoneInput');
  const quickFill = document.getElementById('quickFill');
  const quickFillBtn = document.getElementById('quickFillBtn');

  // 策略1: 从URL参数获取（支持二维码携带手机号 ?outlet=longshan&phone=13800138000）
  const params = new URLSearchParams(window.location.search);
  const urlPhone = params.get('phone') || '';
  if (urlPhone && isValidPhone(urlPhone)) {
    input.value = urlPhone;
    state.phone = urlPhone;
    document.getElementById('phoneGroup').classList.remove('error');
    checkSubmitEnabled();
    return;
  }

  // 策略2: 从localStorage读取上次使用的手机号
  try {
    const rememberedPhone = localStorage.getItem('last_evaluation_phone');
    if (rememberedPhone && isValidPhone(rememberedPhone)) {
      // 显示一键填充按钮
      quickFill.style.display = 'block';
      quickFillBtn.textContent = '📱 使用 ' + rememberedPhone + ' 一键填充';
      quickFillBtn.onclick = function () {
        input.value = rememberedPhone;
        state.phone = rememberedPhone;
        document.getElementById('phoneGroup').classList.remove('error');
        checkSubmitEnabled();
        quickFill.style.display = 'none';
        input.focus();
      };
      return;
    }
  } catch (e) { /* ignore */ }

  // 策略3: 尝试使用浏览器 Credential Management API (需 HTTPS + 服务端配置)
  // 仅在已存储过手机号的场景下生效
  if (window.PasswordCredential && navigator.credentials) {
    navigator.credentials.get({
      password: false,
      mediation: 'silent'
    }).then(cred => {
      if (cred && cred.id && isValidPhone(cred.id)) {
        input.value = cred.id;
        state.phone = cred.id;
        document.getElementById('phoneGroup').classList.remove('error');
        checkSubmitEnabled();
      }
    }).catch(() => { /* ignore */ });
  }
}

/**
 * 校验手机号格式（11位，以1开头，第二位3-9）
 * @param {string} phone - 手机号
 * @returns {boolean}
 */
function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone);
}

/**
 * 初始化提交按钮
 */
function initSubmitButton() {
  const btn = document.getElementById('submitBtn');
  btn.addEventListener('click', handleSubmit);
}

/**
 * 检查并更新提交按钮状态
 */
function checkSubmitEnabled() {
  const btn = document.getElementById('submitBtn');
  const isValid = state.selectedScore >= 1 && state.selectedScore <= 10 && isValidPhone(state.phone);
  btn.disabled = !isValid;

  if (isValid) {
    btn.textContent = '提交评价';
  } else {
    btn.textContent = '请完成评分和手机号填写';
  }
}

/**
 * 处理提交
 */
async function handleSubmit() {
  // 二次校验
  if (state.selectedScore < 1 || state.selectedScore > 10) {
    showToast('请先选择评分', 'error');
    return;
  }

  if (!isValidPhone(state.phone)) {
    showToast('请输入正确的11位手机号', 'error');
    document.getElementById('phoneGroup').classList.add('error');
    return;
  }

  if (!state.outletCode) {
    showToast('营业厅信息缺失，请扫描正确的二维码', 'error');
    return;
  }

  // 防止重复提交
  if (state.isSubmitting) return;
  state.isSubmitting = true;

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = '提交中...';

  try {
    const response = await fetch(`${API_BASE}/api/evaluations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        outletCode: state.outletCode,
        outletName: state.outletName,
        score: state.selectedScore,
        phone: state.phone,
      }),
    });

    const result = await response.json();

    if (result.success) {
      // 记住手机号（下次自动填充）
      try {
        localStorage.setItem('last_evaluation_phone', state.phone);
      } catch (e) { /* ignore */ }
      // 显示成功弹窗
      showSuccess(result.message, result.data);
      // 标记已评价（防止重复评价）
      try {
        sessionStorage.setItem(`evaluated_${state.outletCode}`, '1');
      } catch (e) { /* ignore */ }
    } else {
      showToast(result.message || '提交失败，请稍后再试', 'error');
      btn.disabled = false;
      btn.textContent = '提交评价';
    }
  } catch (error) {
    console.error('提交出错:', error);
    showToast('网络错误，请检查网络后重试', 'error');
    btn.disabled = false;
    btn.textContent = '提交评价';
  } finally {
    state.isSubmitting = false;
  }
}

/**
 * 显示成功弹窗
 * @param {string} message - 成功消息
 * @param {object} data - 返回数据
 */
function showSuccess(message, data) {
  const overlay = document.getElementById('successOverlay');
  const msg = document.getElementById('successMsg');

  if (data && data.score) {
    msg.textContent = `您对 ${data.outletName} 给出了 ${data.score} 分的评价`;
  } else {
    msg.textContent = message;
  }

  overlay.style.display = 'flex';
}

/**
 * 关闭成功弹窗
 */
function closeSuccess() {
  document.getElementById('successOverlay').style.display = 'none';
  // 可在此重置表单或留空让用户看到已提交状态
}

/**
 * Toast 提示
 * @param {string} message - 提示消息
 * @param {string} type - 类型: success / error / warning
 */
function showToast(message, type = 'error') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'block';

  // 3秒后自动隐藏
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// ========== 检测是否重复评价 ==========
(function checkDuplicateEvaluation() {
  try {
    const params = new URLSearchParams(window.location.search);
    const outletCode = params.get('outlet') || '';
    if (outletCode && sessionStorage.getItem(`evaluated_${outletCode}`)) {
      // 同一会话中已评价过，但不强制阻止，仅在console提示
      console.log('该营业厅在当前会话中已有评价记录');
    }
  } catch (e) { /* ignore */ }
})();