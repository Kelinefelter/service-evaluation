"""
服务评价系统 - 后端 API 服务
FastAPI + SQLite，零编译依赖

启动: uvicorn main:app --host 0.0.0.0 --port 3000 --reload
"""
import sqlite3
import os
import re
from datetime import datetime, timedelta, timezone
from contextlib import contextmanager
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

# ========== 营业厅配置 ==========
# 键为二维码简码，值为营业厅全称；新增营业厅在此添加即可
OUTLET_CONFIG = {
    "longshan": "龙山路营业厅",
    "huxin": "湖心路营业厅",
    "chengnan": "城南营业厅",
    "gaoxin": "高新区营业厅",
    "binhu": "滨湖营业厅",
}

# ========== 数据库路径 ==========
DB_PATH = os.path.join(os.path.dirname(__file__), "evaluations.db")

# 北京时间偏移
CST = timezone(timedelta(hours=8))


@contextmanager
def get_db():
    """获取数据库连接（上下文管理器，自动提交/关闭）"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # 支持按列名访问
    conn.execute("PRAGMA journal_mode=WAL")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_database():
    """初始化数据库表结构（首次启动时自动创建）"""
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS evaluations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                outlet_code TEXT NOT NULL,
                outlet_name TEXT NOT NULL,
                score INTEGER NOT NULL CHECK(score >= 1 AND score <= 10),
                phone TEXT NOT NULL,
                ip TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now', '+8 hours'))
            )
        """)
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_outlet_code ON evaluations(outlet_code)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_created_at ON evaluations(created_at)"
        )
    print("数据库初始化完成")


# ========== FastAPI 应用 ==========
app = FastAPI(title="服务评价系统 API", version="1.0.0")

# CORS 跨域（允许前端独立部署）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========== 启动事件 ==========
@app.on_event("startup")
def startup():
    init_database()


# ========== 辅助函数 ==========
def is_valid_phone(phone: str) -> bool:
    """校验11位手机号"""
    return bool(re.match(r"^1[3-9]\d{9}$", phone))


def get_now_cst() -> str:
    """获取当前北京时间字符串"""
    return datetime.now(CST).strftime("%Y-%m-%d %H:%M:%S")


# ========== API 路由 ==========


@app.get("/api/outlets")
def get_outlets():
    """获取所有营业厅列表"""
    outlets = [
        {"code": code, "name": name} for code, name in OUTLET_CONFIG.items()
    ]
    return {"success": True, "data": outlets}


@app.post("/api/evaluations")
async def submit_evaluation(request: Request):
    """
    提交评价
    请求体: { outletCode, score, phone }
    防刷: 同IP 5分钟内最多提交3次
    """
    body = await request.json()
    outlet_code = (body.get("outletCode") or "").strip()
    score_raw = body.get("score")
    phone = (body.get("phone") or "").strip()

    # 校验营业厅代码
    if not outlet_code or outlet_code not in OUTLET_CONFIG:
        raise HTTPException(status_code=400, detail="无效的营业厅代码")

    outlet_name = OUTLET_CONFIG[outlet_code]

    # 校验评分
    try:
        score = int(score_raw)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="评分必须是数字")
    if score < 1 or score > 10:
        raise HTTPException(status_code=400, detail="评分必须在1-10之间")

    # 校验手机号
    if not phone or not is_valid_phone(phone):
        raise HTTPException(status_code=400, detail="请输入正确的11位手机号")

    # 获取客户端IP
    client_ip = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or request.client.host
        or ""
    )

    # 防刷：检查同IP最近5分钟内提交次数
    five_min_ago = (datetime.now(CST) - timedelta(minutes=5)).strftime(
        "%Y-%m-%d %H:%M:%S"
    )
    with get_db() as conn:
        row = conn.execute(
            "SELECT COUNT(*) as cnt FROM evaluations WHERE ip = ? AND created_at > ?",
            (client_ip, five_min_ago),
        ).fetchone()
        if row["cnt"] >= 3:
            raise HTTPException(status_code=429, detail="提交过于频繁，请5分钟后再试")

        cursor = conn.execute(
            "INSERT INTO evaluations (outlet_code, outlet_name, score, phone, ip) VALUES (?, ?, ?, ?, ?)",
            (outlet_code, outlet_name, score, phone, client_ip),
        )
        new_id = cursor.lastrowid

    print(f"新评价: {outlet_name} | 评分: {score} | IP: {client_ip}")

    return {
        "success": True,
        "message": "提交成功，感谢您的评价！",
        "data": {"id": new_id, "outletName": outlet_name, "score": score},
    }


@app.get("/api/evaluations")
def get_evaluations(
    outletCode: str = Query("", description="按营业厅代码筛选"),
    page: int = Query(1, ge=1, description="页码"),
    pageSize: int = Query(20, ge=1, le=100, description="每页条数"),
):
    """查询评价列表（分页）"""
    offset = (page - 1) * pageSize
    with get_db() as conn:
        if outletCode:
            count_row = conn.execute(
                "SELECT COUNT(*) as total FROM evaluations WHERE outlet_code = ?",
                (outletCode,),
            ).fetchone()
            rows = conn.execute(
                """SELECT id, outlet_code, outlet_name, score, phone, ip, created_at
                   FROM evaluations WHERE outlet_code = ?
                   ORDER BY created_at DESC LIMIT ? OFFSET ?""",
                (outletCode, pageSize, offset),
            ).fetchall()
        else:
            count_row = conn.execute(
                "SELECT COUNT(*) as total FROM evaluations"
            ).fetchone()
            rows = conn.execute(
                """SELECT id, outlet_code, outlet_name, score, phone, ip, created_at
                   FROM evaluations
                   ORDER BY created_at DESC LIMIT ? OFFSET ?""",
                (pageSize, offset),
            ).fetchall()

    total = count_row["total"]
    list_data = [
        {
            "id": r["id"],
            "outletCode": r["outlet_code"],
            "outletName": r["outlet_name"],
            "score": r["score"],
            "phone": r["phone"],
            "ip": r["ip"],
            "createdAt": r["created_at"],
        }
        for r in rows
    ]

    return {"success": True, "data": {"list": list_data, "total": total, "page": page, "pageSize": pageSize}}


@app.get("/api/stats")
def get_stats(
    outletCode: str = Query("", description="按营业厅代码筛选（可选）"),
):
    """统计汇总：总评价数、平均分、各营业厅统计"""
    with get_db() as conn:
        if outletCode:
            where = "WHERE outlet_code = ?"
            params = (outletCode,)
        else:
            where = ""
            params = ()

        # 各营业厅分组统计
        group_rows = conn.execute(
            f"""SELECT outlet_code, outlet_name,
                       COUNT(*) as count,
                       ROUND(AVG(score), 1) as avg_score,
                       MIN(score) as min_score,
                       MAX(score) as max_score
                FROM evaluations {where}
                GROUP BY outlet_code, outlet_name
                ORDER BY count DESC""",
            params,
        ).fetchall()

        # 总体统计
        overall_row = conn.execute(
            f"""SELECT COUNT(*) as total_count,
                       ROUND(AVG(score), 1) as overall_avg_score
                FROM evaluations {where}""",
            params,
        ).fetchone()

    outlets_stats = [
        {
            "outletCode": r["outlet_code"],
            "outletName": r["outlet_name"],
            "count": r["count"],
            "avgScore": r["avg_score"],
            "minScore": r["min_score"],
            "maxScore": r["max_score"],
        }
        for r in group_rows
    ]

    overall = {
        "totalCount": overall_row["total_count"] or 0,
        "overallAvgScore": overall_row["overall_avg_score"] or 0,
    }

    return {"success": True, "data": {"overall": overall, "outlets": outlets_stats}}


@app.get("/api/export")
def export_csv(
    outletCode: str = Query("", description="按营业厅代码筛选（可选）"),
):
    """导出评价数据为CSV文件"""
    with get_db() as conn:
        if outletCode:
            rows = conn.execute(
                """SELECT id, outlet_code, outlet_name, score, phone, ip, created_at
                   FROM evaluations WHERE outlet_code = ?
                   ORDER BY created_at DESC""",
                (outletCode,),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT id, outlet_code, outlet_name, score, phone, ip, created_at
                   FROM evaluations ORDER BY created_at DESC"""
            ).fetchall()

    # 构建CSV（带BOM，确保Excel正确识别中文）
    bom = "\ufeff"
    headers = ["ID", "营业厅代码", "营业厅名称", "评分", "手机号", "IP地址", "提交时间"]
    csv_lines = [bom + ",".join(headers)]
    for r in rows:
        csv_lines.append(
            f'{r["id"]},"{r["outlet_code"]}","{r["outlet_name"]}",'
            f'{r["score"]},"{r["phone"]}","{r["ip"]}","{r["created_at"]}"'
        )
    csv_content = "\n".join(csv_lines)

    filename = (
        f"evaluations_{outletCode}_{int(datetime.now(CST).timestamp())}.csv"
        if outletCode
        else f"evaluations_{int(datetime.now(CST).timestamp())}.csv"
    )

    return Response(
        content=csv_content.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )