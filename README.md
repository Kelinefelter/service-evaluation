# 服务评价系统

## 项目简介
面向多个营业厅的H5扫码评价系统，支持二维码识别营业厅、评分提交、数据统计与管理。

## 技术栈
- **前端**：纯HTML/CSS/JS，移动端H5响应式设计
- **后端**：Python FastAPI + 内置 sqlite3（零编译依赖，开箱即用）
- **数据库**：SQLite

## 目录结构
```
service-evaluation/
├── backend/                # 后端API服务
│   ├── requirements.txt    # Python依赖
│   └── main.py             # FastAPI 服务（含路由、数据库、营业厅配置）
├── frontend/               # 前端静态页面
│   ├── index.html          # 用户评价页面
│   ├── admin.html          # 管理后台页面
│   ├── css/
│   │   └── style.css       # 样式文件
│   └── js/
│       ├── app.js          # 评价页面逻辑
│       └── admin.js        # 管理后台逻辑
└── README.md               # 项目说明文档
```

## 快速启动

### 1. 安装 Python 依赖
```bash
cd service-evaluation/backend
pip install -r requirements.txt
```

### 2. 启动后端服务
```bash
cd service-evaluation/backend
uvicorn main:app --host 0.0.0.0 --port 3000 --reload
```
后端默认运行在 http://localhost:3000，自动生成 API 文档 http://localhost:3000/docs

### 3. 启动前端
使用任意静态文件服务器打开 frontend 目录，例如：
```bash
cd service-evaluation/frontend
python -m http.server 8080
```
前端默认运行在 http://localhost:8080

## 二维码使用
生成二维码指向：`http://你的域名/index.html?outlet=longshan`

营业厅代码对照：
| 代码 | 营业厅名称 |
|------|-----------|
| longshan | 龙山路营业厅 |
| huxin | 湖心路营业厅 |
| chengnan | 城南营业厅 |
| gaoxin | 高新区营业厅 |
| binhu | 滨湖营业厅 |

## API接口
- `POST /api/evaluations` - 提交评价
- `GET /api/evaluations` - 查询评价列表
- `GET /api/stats` - 统计汇总