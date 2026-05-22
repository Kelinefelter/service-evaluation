# 🚀 服务评价系统 - 部署操作指南

> 本指南将逐步带你完成代码推送到 GitHub、后端部署到 Render、前端部署到 Vercel 的全过程。

---

## 📋 部署前检查清单

- [x] 代码已在本地通过所有API测试（`/api/outlets`, `/api/evaluations`, `/api/stats`）
- [ ] 拥有 GitHub 账号（没有? 去 https://github.com 免费注册）
- [ ] 拥有 Render 账号（去 https://render.com 用 GitHub 账号登录）
- [ ] 拥有 Vercel 账号（去 https://vercel.com 用 GitHub 账号登录）

---

## 第一步：推送代码到 GitHub

### 1.1 创建 GitHub Token（Classic）

1. 登录 github.com → 右上角头像 → **Settings**
2. 左侧菜单最底部 → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. 点击 **Generate new token (classic)**
4. 设置：
   - Note: `service-evaluation-deploy`
   - Expiration: `90 days`（或自定义）
   - 勾选权限：**repo**（全选）和 **workflow**
5. 点击 **Generate token**，**立即复制保存！**（离开页面后无法再查看）

### 1.2 在 GitHub 创建仓库

**方式A：用浏览器创建**
1. 打开 https://github.com/new
2. Repository name: `service-evaluation`
3. Description: `多营业厅H5扫码服务评价系统`
4. 选择 **Public**（免费私有也可）
5. **不要**勾选 "Add a README file"（我们已有）
6. 点击 **Create repository**

**方式B：用 VS Code 创建**
1. 按 `Ctrl+Shift+P` → 输入 `Git: Push to...`
2. 选择 `+ Create New Repository...`
3. 输入仓库名 `service-evaluation`
4. 选择 Public 或 Private
5. VS Code 会自动创建并推送

### 1.3 推送代码（命令行方式）

打开终端（PowerShell），逐条执行：

```powershell
# 进入项目目录
cd C:\Users\11396\Desktop\service-evaluation

# 添加远程仓库（替换 YOUR_USERNAME 为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/service-evaluation.git

# 重命名分支为 main
git branch -M main

# 推送代码
git push -u origin main
```

提示输入用户名和密码时：
- **用户名**：你的 GitHub 用户名
- **密码**：粘贴上面第1.1步生成的 **Token**（不是 GitHub 登录密码！）

---

## 第二步：部署后端到 Render

### 2.1 连接并部署

1. 登录 https://dashboard.render.com
2. 点击 **New +** → **Web Service**
3. 点击 **Connect account**（首次需要授权访问 GitHub）
4. 在仓库列表中找到 `service-evaluation`，点击 **Connect**
5. 配置页面：
   - Name: `service-evaluation-api`（或自定义）
   - Region: `Singapore`（东南亚，离中国近）
   - Root Directory: `backend`
   - Runtime: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Instance Type: **Free**（免费版）
6. 点击 **Create Web Service**

### 2.2 等待部署完成

- 部署约需 2-5 分钟
- 在 Logs 标签页可以查看实时日志
- 看到 `数据库初始化完成` 和 `Application startup complete` 即表示成功

### 2.3 获取后端地址

- 部署完成后，页面顶部会显示 URL
- 格式类似: `https://service-evaluation-api.onrender.com`
- **复制保存这个地址！下一步要用**

### 2.4 验证后端 API

在浏览器中依次访问（替换 YOUR_RENDER_URL）：

| 测试接口 | 完整地址 |
|---------|---------|
| 获取营业厅列表 | `https://xxx.onrender.com/api/outlets` |
| 统计汇总 | `https://xxx.onrender.com/api/stats` |
| API文档(Swagger) | `https://xxx.onrender.com/docs` |

**⚠️ 注意：Free 版 Render 首次访问需要约30秒"冷启动"，等待页面加载即可。**

---

## 第三步：部署前端到 Vercel

### 3.1 修改配置并推送更新

**首先，修改 `API_BASE` 为 Render 后端地址：**

编辑文件 `frontend/js/config.js`，将：
```javascript
const API_BASE = 'http://localhost:3000';
```
改为：
```javascript
const API_BASE = 'https://service-evaluation-api.onrender.com';  // 替换为你的 Render 地址
```

然后提交并推送：
```powershell
cd C:\Users\11396\Desktop\service-evaluation
git add frontend/js/config.js
git commit -m "chore: 更新API地址为Render后端"
git push
```

### 3.2 在 Vercel 部署

1. 登录 https://vercel.com（用 GitHub 账号登录）
2. 点击 **Add New...** → **Project**
3. 在仓库列表中找到 `service-evaluation`，点击 **Import**
4. 配置页面：
   - **Framework Preset**: 选择 `Other`
   - **Root Directory**: 点击 `Edit`，选择 `frontend`
   - Build Command: 留空
   - Output Directory: 留空
   - Install Command: 留空
5. 点击 **Deploy**

### 3.3 获取前端地址

- 部署约需 30 秒
- 部署完成后会显示域名，如 `https://service-evaluation.vercel.app`
- **复制保存这个地址！**

### 3.4 验证前端

在浏览器访问以下页面：

| 页面 | 地址 |
|------|------|
| 评价页面(龙山路) | `https://xxx.vercel.app/index.html?outlet=longshan` |
| 评价页面(湖心路) | `https://xxx.vercel.app/index.html?outlet=huxin` |
| 管理后台 | `https://xxx.vercel.app/admin.html` |
| 二维码汇总 | `https://xxx.vercel.app/qrcodes.html` |

---

## 第四步：测试完整流程

### 4.1 二维码测试

1. 打开二维码汇总页面（`/qrcodes.html`）
2. 确认5个营业厅二维码都已正确生成
3. 点击右上角 **🖨️ 打印二维码汇总** 可打印
4. 用手机扫描「龙山路营业厅」的二维码

### 4.2 评价流程测试

1. 扫码后确认页面显示「龙山路营业厅」
2. 点击评分按钮「8」
3. 输入手机号：`13812345678`
4. 点击「提交评价」
5. 应显示成功弹窗：「您对 龙山路营业厅 给出了 8 分的评价」

### 4.3 管理后台测试

1. 打开管理后台 `/admin.html`
2. 确认看到刚才提交的评价记录
3. 测试营业厅筛选下拉框
4. 测试「导出CSV」按钮（应下载 .csv 文件）
5. 确认统计卡片数据正确

### 4.4 防刷测试（可选）

连续快速提交3次以上同一评价，第4次应该被拒绝，提示「操作过于频繁，请稍后再试」

---

## 🎯 交付清单

部署完成后，填写以下信息：

### 线上地址

| 项目 | 地址 |
|------|------|
| 🖥️ 后端 API | `https://xxx.onrender.com` |
| 📱 前端首页 | `https://xxx.vercel.app` |
| 📊 管理后台 | `https://xxx.vercel.app/admin.html` |
| 🔲 二维码汇总 | `https://xxx.vercel.app/qrcodes.html` |
| 📖 API 文档 | `https://xxx.onrender.com/docs` |

### 营业厅二维码链接

| 营业厅 | 评价链接 |
|--------|---------|
| 🏢 龙山路营业厅 | `https://xxx.vercel.app/index.html?outlet=longshan` |
| 🏢 湖心路营业厅 | `https://xxx.vercel.app/index.html?outlet=huxin` |
| 🏢 城南营业厅 | `https://xxx.vercel.app/index.html?outlet=chengnan` |
| 🏢 高新区营业厅 | `https://xxx.vercel.app/index.html?outlet=gaoxin` |
| 🏢 滨湖营业厅 | `https://xxx.vercel.app/index.html?outlet=binhu` |

### 添加新营业厅

1. 后端：编辑 `backend/main.py`，在 `OUTLET_CONFIG` 中添加条目
2. 前端评价页：编辑 `frontend/js/app.js`，在 `OUTLET_MAP` 中添加条目
3. 前端二维码页：编辑 `frontend/qrcodes.html`，在 `outlets` 数组中添加条目
4. 提交推送后，Render 和 Vercel 会自动重新部署

---

## ⚠️ 常见问题

**Q: Render 后端首次访问很慢？**
A: Free 版 Render 在 15 分钟无流量后会自动休眠，下次访问需要冷启动约 30 秒。升级付费版可消除此问题。

**Q: Vercel 部署后 404？**
A: 检查 Root Directory 是否设置为 `frontend`，确认 `vercel.json` 配置正确。

**Q: 管理后台加载不出数据？**
A: 检查 `frontend/js/config.js` 中的 `API_BASE` 是否正确指向 Render 后端地址，注意不要有多余的斜杠。

**Q: 手机扫码后无法提交？**
A: 确认手机能访问外网，Render 后端在境外服务器，国内访问可能稍慢。