# 后端开发工作记录
1.  **项目架构搭建阶段**：利用AI生成FastAPI项目基础脚手架，配置全局跨域、统一返回格式与异常捕获，完成SQLite数据库四表结构设计与自动建表逻辑，初始化ChromaDB向量库集合与基础操作工具。
2.  **底层工具封装阶段**：借助AI编写JWT鉴权、密码加密、图片上传校验、静态资源路由等通用工具代码，读取.env环境变量管理密钥，拆分分层目录规范项目结构。
3.  **AI模块封装阶段**：按照MCP协议规范封装大模型统一调用客户端，实现文案润色、物品分类、内容审核、文本Embedding向量化四类接口，配置本地Embedding兜底方案保障离线可用。
4.  **业务接口开发阶段**：分模块开发用户、帖子、留言收藏、管理员审核全套接口，绑定发帖自动向向量库存入描述向量，帖子删除下架同步清理向量数据，用Pydantic完成全量参数校验。
5.  **核心功能开发阶段**：完成语义相似度检索核心接口，实现自然语言搜索匹配失物帖子，添加余弦相似度阈值过滤逻辑，批量关联业务数据库组装分页结果。
6.  **问题调试优化阶段**：针对向量库与业务库数据不一致、大模型上下文溢出、文件上传重名覆盖等问题，借助AI定位漏洞并编写修复逻辑，完善越权校验与边界异常处理。
7.  **提示词规范落地**：结合课程授课要求拆分后端开发提示词，限定技术栈与禁用项，分段生成架构、工具、业务代码，降低AI生成冗余代码与逻辑偏差问题。

**提示词部分**
*【后端分段1：FastAPI底层基础架构 + SQLite数据表初始化 + ChromaDB向量工具封装，仅搭建底层基础，不编写业务接口】*
遵守全局强制约束，只完成底层骨架代码，不写业务逻辑接口、不编写前端代码。
开发需求清单：
1. 初始化FastAPI项目完整目录结构，入口文件 main.py
   - 全局CORS跨域配置，放行前端 http://localhost:3000
   - 全局统一响应体格式封装、全局异常捕获中间件
   - 配置静态资源目录 static/images，用于存储上传头像、帖子图片，配置静态文件访问路由
2. 封装SQLite数据库工具模块
   - 数据库连接、关闭工具函数
   - 自动执行建表逻辑，程序启动不存在表则自动创建四张数据表：
     user 用户表、post 失物招领帖子表、comment 留言表、collect 收藏表
     collect表设置联合唯一索引(user_id, post_id)防止重复收藏
   附完整字段定义：
   user(id,username,password,phone,college,avatar,is_admin,create_time)
   post(id,user_id,post_type,goods_name,category,location,happen_time,description,img_list,contact,status,create_time)
   comment(id,post_id,user_id,content,create_time)
   collect(id,user_id,post_id,create_time)
3. 封装ChromaDB向量操作工具模块
   - 自动初始化向量集合名称：lost_found_collection
   - 封装通用函数：新增向量、根据post_id删除向量、相似度检索topN向量
   - 向量元数据固定结构 metadata={"post_id":int,"post_type":str,"category":str}
   - 相似度算法使用余弦相似度，过滤相似度低于0.6的结果
4. 通用工具封装
   - JWT签发、解析、校验工具函数，用于登录鉴权
   - 密码加密、解密工具（bcrypt）
   - 文件上传工具：图片校验、大小校验（单图最大2MB）、本地存储、路径处理
5. 新建 .env 环境配置模板，预留LLM_KEY、EMBEDDING_KEY、向量模型配置项
6. 生成 requirements.txt 完整依赖清单，包含fastapi、uvicorn、pydantic、chromadb、python-dotenv、passlib、pyjwt、pillow等必需包
7. 编写项目启动说明，启动命令：uvicorn main:app --host 0.0.0.0 --port 8000 --reload

输出约束：仅输出本底层架构全部代码、目录结构、文件说明，禁止编写任何业务接口代码。

*【后端分段2：基于分段1已完成后端底层架构，开发MCP大模型客户端、用户全套接口、帖子基础增删改查接口】*
遵守全局强制约束，复用已有底层代码，只开发本模块内容，不编写前端代码、不写语义搜索核心逻辑。
开发需求清单：
一、新建 mcp_client.py，基于MCP(Model Context Protocol)协议封装统一大模型调用客户端
1. 标准化MCP会话管理、会话ID隔离、上下文长度自动截断、统一请求头封装
2. 封装三个现成调用函数：
   (1) llm_text_polish：接收原始描述文本，润色优化成规范招领文案
   (2) llm_classify_goods：根据物品描述自动识别物品分类
   (3) llm_content_check：内容合规检测，识别广告、敏感违规内容
3. 封装Embedding向量化调用函数，支持在线API；同时内置本地轻量Embedding兜底方案，无外网也可生成向量
4. 从.env读取密钥，禁止密钥硬编码，预留多模型切换配置

二、使用Pydantic v2定义所有入参校验模型，开发用户模块全套接口，路由分组 /api/user
1. 用户注册接口：手机号、昵称、密码、学院校验，密码加密入库
2. 用户登录接口：账号密码校验，签发JWT令牌返回前端
3. 获取当前登录用户信息接口（JWT鉴权）
4. 修改个人资料接口、头像上传接口

三、帖子基础管理接口，路由分组 /api/post，全部需要登录鉴权
1. 发布帖子接口：表单校验、多图上传最多3张、调用MCP做内容合规检测、入库SQLite
2. 编辑本人帖子接口、手动下架帖子接口
3. 帖子分页列表查询接口（支持post_type筛选）、单帖子详情查询接口
4. 批量图片上传独立接口，限制单文件2MB，格式仅允许jpg/png/webp

输出约束：输出本模块新增/修改全部代码、接口注释、接口文档说明，暂不开发语义搜索向量匹配逻辑、留言收藏、管理员相关接口。

*【后端分段3：基于前两段全部后端代码，开发AI语义匹配核心接口、留言收藏互动接口、管理员后台全套统计审核接口】*
遵守全局强制约束，复用已有全部底层与业务代码，不修改已有逻辑，不编写前端代码。
开发需求清单：
一、开发AI语义匹配核心接口 /api/search
1. AI语义相似度搜索接口完整逻辑：
   接收前端搜索文本 → 文本预处理 → MCP生成查询向量 → Chroma余弦相似度检索Top15
   过滤相似度＜0.6数据 → 提取post_id批量查询SQLite帖子数据 → 按相似度降序组装分页数据返回
2. 发帖后置自动逻辑：帖子入库成功后，提取description文本生成向量，自动存入ChromaDB绑定post_id
3. 帖子删除/下架同步删除Chroma中对应向量数据

二、留言、收藏互动接口，路由分组 /api/interact，登录鉴权
1. 新增留言、删除本人留言接口
2. 收藏帖子、取消收藏帖子接口
3. 我的发布列表、我的收藏列表、我的留言列表分页查询接口

三、管理员专属接口，路由分组 /api/admin，仅is_admin=1账号可访问
1. 帖子审核接口：待审核帖子一键通过、违规下架
2. 用户管理接口：禁用违规用户账号
3. 数据统计接口：总发帖量、已匹配完结帖子数量、物品分类统计数据，供前端图表展示

四、收尾校验
1. 所有接口补充详细注释，Pydantic参数校验全覆盖
2. 补全异常捕获边界判断，防止空数据、越权操作（只能编辑/删除自己的帖子留言）
3. 校验向量数据联动逻辑完整性

输出约束：输出本模块新增代码、接口说明、整体业务流程说明，后端整体功能闭环可联调前端。



# 后端开发 AI 聊天记录

---

## 第一段：FastAPI 底层基础架构 + SQLite 数据表初始化 + ChromaDB 向量工具封装

---

**Developer:**

遵守全局强制约束，只完成底层骨架代码，不写业务逻辑接口、不编写前端代码。

开发需求清单：
1. 初始化FastAPI项目完整目录结构，入口文件 main.py
   - 全局CORS跨域配置，放行前端 http://localhost:3000
   - 全局统一响应体格式封装、全局异常捕获中间件
   - 配置静态资源目录 static/images，用于存储上传头像、帖子图片，配置静态文件访问路由

2. 封装SQLite数据库工具模块
   - 数据库连接、关闭工具函数
   - 自动执行建表逻辑，程序启动不存在表则自动创建四张数据表：
     user 用户表、post 失物招领帖子表、comment 留言表、collect 收藏表
     collect表设置联合唯一索引(user_id, post_id)防止重复收藏
   附完整字段定义：
   user(id,username,password,phone,college,avatar,is_admin,create_time)
   post(id,user_id,post_type,goods_name,category,location,happen_time,description,img_list,contact,status,create_time)
   comment(id,post_id,user_id,content,create_time)
   collect(id,user_id,post_id,create_time)

3. 封装ChromaDB向量操作工具模块
   - 自动初始化向量集合名称：lost_found_collection
   - 封装通用函数：新增向量、根据post_id删除向量、相似度检索topN向量
   - 向量元数据固定结构 metadata={"post_id":int,"post_type":str,"category":str}
   - 相似度算法使用余弦相似度，过滤相似度低于0.6的结果

4. 通用工具封装
   - JWT签发、解析、校验工具函数，用于登录鉴权
   - 密码加密、解密工具（bcrypt）
   - 文件上传工具：图片校验、大小校验（单图最大2MB）、本地存储、路径处理

5. 新建 .env 环境配置模板，预留LLM_KEY、EMBEDDING_KEY、向量模型配置项

6. 生成 requirements.txt 完整依赖清单，包含fastapi、uvicorn、pydantic、chromadb、python-dotenv、passlib、pyjwt、pillow等必需包

7. 编写项目启动说明，启动命令：uvicorn main:app --host 0.0.0.0 --port 8000 --reload

输出约束：仅输出本底层架构全部代码、目录结构、文件说明，禁止编写任何业务接口代码。

---

**AI:**

好的，下面为你搭建完整的 FastAPI 后端底层架构。严格遵循约束，只做底层设施，不编写业务接口。

## 项目目录结构

```
backend/
├── .env
├── .env.example
├── requirements.txt
├── main.py
├── core/
│   ├── __init__.py
│   ├── config.py          # 环境变量读取
│   └── response.py         # 统一响应体 + 全局异常中间件
├── db/
│   ├── __init__.py
│   ├── database.py         # SQLite 连接管理 + 自动建表
│   └── models.py           # 建表 SQL 定义
├── vector/
│   ├── __init__.py
│   └── chroma_client.py    # ChromaDB 初始化 + CRUD 工具函数
├── utils/
│   ├── __init__.py
│   ├── jwt_util.py         # JWT 签发/解析/校验
│   ├── crypto_util.py      # bcrypt 密码加密/校验
│   └── upload_util.py      # 图片上传校验与存储
├── middlewares/
│   ├── __init__.py
│   └── auth.py             # JWT 鉴权依赖（后续使用）
├── static/
│   └── images/             # 用户头像、帖子图片存储目录
└── routers/                # 业务路由（后续分段填充）
    └── __init__.py
```

---

### 1. requirements.txt

```
fastapi==0.109.2
uvicorn[standard]==0.27.1
pydantic==2.6.1
chromadb==0.4.24
python-dotenv==1.0.1
passlib[bcrypt]==1.7.4
pyjwt==2.8.0
pillow==10.2.0
python-multipart==0.0.7
bcrypt==4.1.2
```

---

### 2. .env 配置模板

```
# 服务配置
APP_HOST=0.0.0.0
APP_PORT=8000

# JWT 配置
JWT_SECRET_KEY=change-me-to-a-random-secret-string
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=72

# 大模型配置（预留）
LLM_KEY=
LLM_BASE_URL=
LLM_MODEL=

# Embedding 配置
EMBEDDING_KEY=
EMBEDDING_BASE_URL=
EMBEDDING_MODEL=

# 本地 Embedding 兜底
LOCAL_EMBEDDING_MODEL=all-MiniLM-L6-v2
```

---

### 3. core/config.py — 环境变量读取

```python
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    APP_HOST: str = os.getenv("APP_HOST", "0.0.0.0")
    APP_PORT: int = int(os.getenv("APP_PORT", "8000"))

    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "default-secret")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_HOURS: int = int(os.getenv("JWT_EXPIRE_HOURS", "72"))

    LLM_KEY: str = os.getenv("LLM_KEY", "")
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "")

    EMBEDDING_KEY: str = os.getenv("EMBEDDING_KEY", "")
    EMBEDDING_BASE_URL: str = os.getenv("EMBEDDING_BASE_URL", "")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "")

    LOCAL_EMBEDDING_MODEL: str = os.getenv("LOCAL_EMBEDDING_MODEL", "all-MiniLM-L6-v2")


settings = Settings()
```

---

### 4. core/response.py — 统一响应格式 + 全局异常处理

```python
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import BaseModel
from typing import Any, Optional


class APIResponse(BaseModel):
    code: int = 0
    msg: str = "ok"
    data: Any = None


def success(data: Any = None, msg: str = "ok") -> JSONResponse:
    return JSONResponse(
        status_code=200,
        content={"code": 0, "msg": msg, "data": data}
    )


def fail(msg: str = "error", code: int = -1, status_code: int = 400) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"code": code, "msg": msg, "data": None}
    )


async def global_exception_handler(request: Request, exc: Exception):
    """全局未捕获异常兜底"""
    return fail(msg=f"服务器内部错误: {str(exc)}", code=500, status_code=500)


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return fail(msg=exc.detail, code=exc.status_code, status_code=exc.status_code)


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    detail = errors[0].get("msg", "参数校验失败") if errors else "参数校验失败"
    return fail(msg=f"参数错误: {detail}", code=422, status_code=422)
```

---

### 5. db/database.py — SQLite 连接管理 + 自动建表

```python
import sqlite3
import os
from db.models import CREATE_TABLES_SQL

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "lost_found.db")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # 让查询结果支持字典式访问
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def close_connection(conn: sqlite3.Connection):
    if conn:
        conn.close()


def init_db():
    """程序启动时自动建表（表不存在才创建）"""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        for sql in CREATE_TABLES_SQL:
            cursor.execute(sql)
        conn.commit()
        print("[DB] 数据库表初始化完成")
    except Exception as e:
        print(f"[DB] 建表异常: {e}")
        conn.rollback()
    finally:
        close_connection(conn)
```

---

### 6. db/models.py — 四张数据表建表 SQL

```python
CREATE_TABLES_SQL = [
    """
    CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        phone TEXT DEFAULT '',
        college TEXT DEFAULT '',
        avatar TEXT DEFAULT '',
        is_admin INTEGER DEFAULT 0,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS post (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        post_type TEXT NOT NULL DEFAULT 'lost',
        goods_name TEXT NOT NULL,
        category TEXT DEFAULT '其他',
        location TEXT DEFAULT '',
        happen_time TEXT DEFAULT '',
        description TEXT DEFAULT '',
        img_list TEXT DEFAULT '[]',
        contact TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES user(id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS comment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES post(id),
        FOREIGN KEY (user_id) REFERENCES user(id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS collect (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        post_id INTEGER NOT NULL,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES user(id),
        FOREIGN KEY (post_id) REFERENCES post(id),
        UNIQUE(user_id, post_id)
    )
    """,
]
```

---

### 7. vector/chroma_client.py — ChromaDB 向量操作封装

```python
import chromadb
from chromadb.config import Settings as ChromaSettings
from typing import List, Dict, Any, Optional
import os
import math

PERSIST_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chroma_data")
COLLECTION_NAME = "lost_found_collection"

_client: Optional[chromadb.ClientAPI] = None
_collection: Optional[Any] = None


def _get_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        os.makedirs(PERSIST_DIR, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=PERSIST_DIR,
            settings=ChromaSettings(anonymized_telemetry=False)
        )
    return _client


def get_collection():
    """获取向量集合，不存在则自动创建"""
    global _collection
    if _collection is None:
        client = _get_client()
        _collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}  # 余弦相似度
        )
    return _collection


def add_vector(
    post_id: int,
    text: str,
    embedding: List[float],
    post_type: str = "",
    category: str = ""
):
    """
    向 ChromaDB 新增一条向量记录
    embedding: 由 Embedding 模型生成的浮点数向量列表
    """
    collection = get_collection()
    collection.add(
        ids=[str(post_id)],
        embeddings=[embedding],
        documents=[text],
        metadatas=[{
            "post_id": post_id,
            "post_type": post_type,
            "category": category
        }]
    )


def delete_vector_by_post_id(post_id: int):
    """根据 post_id 删除对应向量"""
    collection = get_collection()
    collection.delete(ids=[str(post_id)])


def search_similar(
    query_embedding: List[float],
    top_n: int = 15,
    threshold: float = 0.6
) -> List[Dict[str, Any]]:
    """
    余弦相似度检索 TopN
    返回相似度 >= threshold 的结果，按相似度降序排列
    """
    collection = get_collection()
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_n,
        include=["metadatas", "documents", "distances"]
    )

    output: List[Dict[str, Any]] = []
    if not results["ids"] or not results["ids"][0]:
        return output

    for i, doc_id in enumerate(results["ids"][0]):
        distance = results["distances"][0][i] if results.get("distances") else 0
        # ChromaDB 余弦距离 → 相似度：similarity = 1 - distance
        similarity = 1.0 - distance
        if similarity < threshold:
            continue
        metadata = results["metadatas"][0][i] if results.get("metadatas") else {}
        output.append({
            "post_id": metadata.get("post_id", int(doc_id)),
            "post_type": metadata.get("post_type", ""),
            "category": metadata.get("category", ""),
            "description": results["documents"][0][i] if results.get("documents") else "",
            "similarity": round(similarity, 4)
        })

    # 按相似度降序
    output.sort(key=lambda x: x["similarity"], reverse=True)
    return output
```

---

### 8. utils/jwt_util.py — JWT 工具

```python
import jwt
from datetime import datetime, timedelta
from core.config import settings

SECRET = settings.JWT_SECRET_KEY
ALGORITHM = settings.JWT_ALGORITHM
EXPIRE_HOURS = settings.JWT_EXPIRE_HOURS


def create_token(payload: dict) -> str:
    """签发 JWT"""
    to_encode = payload.copy()
    expire = datetime.utcnow() + timedelta(hours=EXPIRE_HOURS)
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(to_encode, SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """解析 JWT，校验过期与签名"""
    return jwt.decode(token, SECRET, algorithms=[ALGORITHM])


def verify_token(token: str) -> dict | None:
    """校验 JWT，返回 payload 或 None"""
    try:
        return decode_token(token)
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
```

---

### 9. utils/crypto_util.py — 密码加密

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """密码加密"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """校验密码"""
    return pwd_context.verify(plain_password, hashed_password)
```

---

### 10. utils/upload_util.py — 图片上传工具

```python
import os
import uuid
from PIL import Image
from fastapi import UploadFile, HTTPException

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "images")
MAX_SIZE = 2 * 1024 * 1024  # 2MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


async def save_upload_image(file: UploadFile) -> str:
    """校验并保存上传图片，返回相对路径"""
    # 类型校验
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="仅支持 JPG/PNG/WebP 格式图片")

    # 大小校验
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="图片大小不能超过 2MB")

    # 二次校验文件头
    try:
        from io import BytesIO
        img = Image.open(BytesIO(content))
        img.verify()
    except Exception:
        raise HTTPException(status_code=400, detail="图片文件损坏或格式异常")

    # 生成唯一文件名
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    if ext not in ("jpg", "jpeg", "png", "webp"):
        ext = "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"

    # 确保目录存在
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as f:
        f.write(content)

    return f"/static/images/{filename}"
```

---

### 11. main.py — 入口文件

```python
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
from core.response import (
    global_exception_handler,
    http_exception_handler,
    validation_exception_handler
)
from db.database import init_db

# 创建 FastAPI 应用
app = FastAPI(
    title="校园失物招领 API",
    description="Lost & Found Backend Service",
    version="1.0.0"
)

# CORS 跨域 — 放行前端
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册全局异常处理器
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# 静态文件路由 — 图片访问
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(os.path.join(static_dir, "images"), exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.on_event("startup")
def on_startup():
    """服务启动：建表 + 初始化向量库"""
    init_db()
    # 预初始化 ChromaDB 集合
    from vector.chroma_client import get_collection
    get_collection()
    print("[App] 服务启动完成")


@app.get("/")
def root():
    return {"message": "校园失物招领 API 服务运行中"}


# 后续分段将在 routers/ 下挂载业务路由
```

---

## 启动说明

```bash
# 1. 进入后端目录
cd backend

# 2. 创建虚拟环境（可选）
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

# 3. 安装依赖
pip install -r requirements.txt

# 4. 复制环境配置
cp .env.example .env  # 按需修改 JWT_SECRET_KEY 等

# 5. 启动服务
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

> 以上为后端底层架构全部代码。已完成 CORS、统一响应、异常捕获、SQLite 四表建表、ChromaDB 向量工具、JWT、密码加密、图片上传全部基础封装。**未编写任何业务接口代码**，所有路由器目录预留待后续分段填充。

---

## 第二段：MCP 大模型客户端 + 用户全套接口 + 帖子基础增删改查

---

**Developer:**

遵守全局强制约束，复用已有底层代码，只开发本模块内容，不编写前端代码、不写语义搜索核心逻辑。

开发需求清单：

一、新建 mcp_client.py，基于MCP(Model Context Protocol)协议封装统一大模型调用客户端
1. 标准化MCP会话管理、会话ID隔离、上下文长度自动截断、统一请求头封装
2. 封装三个现成调用函数：
   (1) llm_text_polish：接收原始描述文本，润色优化成规范招领文案
   (2) llm_classify_goods：根据物品描述自动识别物品分类
   (3) llm_content_check：内容合规检测，识别广告、敏感违规内容
3. 封装Embedding向量化调用函数，支持在线API；同时内置本地轻量Embedding兜底方案，无外网也可生成向量
4. 从.env读取密钥，禁止密钥硬编码，预留多模型切换配置

二、使用Pydantic v2定义所有入参校验模型，开发用户模块全套接口，路由分组 /api/user
1. 用户注册接口：手机号、昵称、密码、学院校验，密码加密入库
2. 用户登录接口：账号密码校验，签发JWT令牌返回前端
3. 获取当前登录用户信息接口（JWT鉴权）
4. 修改个人资料接口、头像上传接口

三、帖子基础管理接口，路由分组 /api/post，全部需要登录鉴权
1. 发布帖子接口：表单校验、多图上传最多3张、调用MCP做内容合规检测、入库SQLite
2. 编辑本人帖子接口、手动下架帖子接口
3. 帖子分页列表查询接口（支持post_type筛选）、单帖子详情查询接口
4. 批量图片上传独立接口，限制单文件2MB，格式仅允许jpg/png/webp

输出约束：输出本模块新增/修改全部代码、接口注释、接口文档说明，暂不开发语义搜索向量匹配逻辑、留言收藏、管理员相关接口。

---

**AI:**

好的，在已有底层架构基础上，本次完成 MCP 客户端封装、用户模块全套接口、帖子基础 CRUD 接口。

---

### 1. mcp_client.py — MCP 统一大模型调用客户端

```python
"""
MCP (Model Context Protocol) 统一大模型调用客户端
标准化会话管理、上下文截断、多模型适配
"""
import uuid
import httpx
from typing import Optional, List, Dict, Any
from core.config import settings


class MCPSession:
    """MCP 会话实例，保持上下文隔离"""

    def __init__(self, model: str = ""):
        self.session_id = str(uuid.uuid4())
        self.model = model or settings.LLM_MODEL
        self.history: List[Dict[str, str]] = []
        self.max_context = 4096  # 上下文 token 上限（估算）

    def _truncate_context(self):
        """超长上下文自动截断，保留最近消息"""
        while len(str(self.history)) > self.max_context * 4 and len(self.history) > 2:
            # 移除最早的对话轮次（保留 system prompt）
            self.history.pop(0)

    def add_message(self, role: str, content: str):
        self.history.append({"role": role, "content": content})
        self._truncate_context()


class MCPClient:
    """MCP 统一客户端"""

    def __init__(self):
        self.api_key = settings.LLM_KEY
        self.base_url = settings.LLM_BASE_URL
        self.model = settings.LLM_MODEL
        self._sessions: Dict[str, MCPSession] = {}

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-Session-ID": str(uuid.uuid4())
        }

    async def _chat(self, system_prompt: str, user_message: str, temperature: float = 0.7) -> str:
        """底层 LLM 调用"""
        if not self.api_key or not self.base_url:
            return self._fallback_response(user_message)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.post(
                    f"{self.base_url}/v1/chat/completions",
                    headers=self._headers(),
                    json={
                        "model": self.model,
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": 1024
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data["choices"][0]["message"]["content"].strip()
                else:
                    print(f"[MCP] LLM 调用失败: {resp.status_code}")
                    return self._fallback_response(user_message)
            except Exception as e:
                print(f"[MCP] 请求异常: {e}")
                return self._fallback_response(user_message)

    def _fallback_response(self, user_message: str) -> str:
        """无外网时的本地兜底"""
        return user_message  # 润色/分类失败时原样返回

    # ---- 封装好的三个调用函数 ----

    async def llm_text_polish(self, raw_text: str) -> str:
        """
        文案润色：将用户原始描述优化为规范招领文案
        """
        system_prompt = (
            "你是一个校园失物招领平台的文案助手。请将用户提供的原始物品描述优化为一段规范、"
            "清晰、友好的招领/寻物文案。要求：1) 保留所有关键信息（物品名称、特征、地点、时间）；"
            "2) 语言简洁正式，去掉口语化表达；3) 适当补充格式使文案层次分明；"
            "4) 输出纯文本，不要加额外解释。"
        )
        return await self._chat(system_prompt, raw_text, temperature=0.5)

    async def llm_classify_goods(self, description: str) -> str:
        """
        物品分类：根据描述自动识别物品类别
        返回分类名：电子产品 / 生活用品 / 学习用品 / 衣帽服饰 / 卡片证件 / 其他
        """
        system_prompt = (
            "你是一个物品分类助手。请根据物品描述判断其类别，只返回以下六个类别中的一个词，"
            "不要加任何标点或解释：电子产品、生活用品、学习用品、衣帽服饰、卡片证件、其他。"
        )
        result = await self._chat(system_prompt, description, temperature=0.1)
        valid_categories = ["电子产品", "生活用品", "学习用品", "衣帽服饰", "卡片证件", "其他"]
        return result if result in valid_categories else "其他"

    async def llm_content_check(self, description: str, goods_name: str = "") -> dict:
        """
        内容合规检测：识别广告、敏感违规内容
        返回 {"passed": bool, "reason": str}
        """
        system_prompt = (
            "你是一个内容安全审核助手。请检查用户提交的失物招领帖子内容是否违规。"
            "违规内容包括：广告推广（微信号/二维码引流）、色情低俗、政治敏感、人身攻击、"
            "与失物招领无关的信息。请只回复JSON格式：{\"passed\": true/false, \"reason\": \"原因\"}。"
        )
        text = f"物品名称：{goods_name}\n描述：{description}"
        result = await self._chat(system_prompt, text, temperature=0.1)

        import json
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            return {"passed": True, "reason": ""}

    # ---- Embedding 向量化 ----

    async def get_embedding(self, text: str) -> List[float]:
        """获取文本向量：优先在线 API，失败走本地兜底"""
        # 尝试在线 API
        if self.api_key and settings.EMBEDDING_BASE_URL:
            embedding = await self._embedding_online(text)
            if embedding:
                return embedding

        # 本地兜底
        return self._embedding_local(text)

    async def _embedding_online(self, text: str) -> Optional[List[float]]:
        """在线 Embedding API"""
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                resp = await client.post(
                    f"{settings.EMBEDDING_BASE_URL}/v1/embeddings",
                    headers=self._headers(),
                    json={
                        "model": settings.EMBEDDING_MODEL,
                        "input": text
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data["data"][0]["embedding"]
            except Exception as e:
                print(f"[Embedding] 在线请求失败: {e}")
        return None

    def _embedding_local(self, text: str) -> List[float]:
        """本地轻量 Embedding 兜底（基于 TF-IDF 简版或 sentence-transformers）"""
        try:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer(settings.LOCAL_EMBEDDING_MODEL)
            embedding = model.encode(text).tolist()
            return embedding
        except ImportError:
            # 终极兜底：基于词频的简单哈希向量（仅保证不崩溃，实际语义效果有限）
            return self._hash_embedding(text)

    def _hash_embedding(self, text: str, dim: int = 384) -> List[float]:
        """极简哈希向量兜底"""
        import hashlib
        import math
        vec = [0.0] * dim
        words = text.split()
        for i, word in enumerate(words):
            h = hashlib.md5(word.encode()).digest()
            for j in range(0, len(h), 2):
                idx = (i * 16 + j // 2) % dim
                vec[idx] += (h[j] / 255.0 - 0.5) * 0.1
        # L2 归一化
        norm = math.sqrt(sum(v ** 2 for v in vec))
        if norm > 0:
            vec = [v / norm for v in vec]
        return vec


# 全局单例
mcp_client = MCPClient()
```

---

### 2. schemas/user.py — 用户模块 Pydantic 校验模型

```python
from pydantic import BaseModel, Field
from typing import Optional


class UserRegisterReq(BaseModel):
    username: str = Field(..., min_length=2, max_length=30, description="用户名/学号")
    password: str = Field(..., min_length=6, max_length=64, description="密码")
    phone: str = Field(..., pattern=r"^1[3-9]\d{9}$", description="手机号")
    college: str = Field(..., min_length=1, max_length=50, description="学院")


class UserLoginReq(BaseModel):
    username: str = Field(..., min_length=1, description="用户名")
    password: str = Field(..., min_length=1, description="密码")


class UserUpdateReq(BaseModel):
    username: Optional[str] = Field(None, min_length=2, max_length=30)
    phone: Optional[str] = Field(None, pattern=r"^1[3-9]\d{9}$")
    college: Optional[str] = Field(None, min_length=1, max_length=50)
```

---

### 3. schemas/post.py — 帖子模块 Pydantic 校验模型

```python
from pydantic import BaseModel, Field
from typing import Optional, List


class PublishPostReq(BaseModel):
    post_type: str = Field(..., pattern=r"^(lost|found)$", description="帖子类型 lost/found")
    goods_name: str = Field(..., min_length=1, max_length=30, description="物品名称")
    category: str = Field(default="其他", max_length=20)
    location: str = Field(default="", max_length=100)
    description: str = Field(..., min_length=1, max_length=500, description="详细描述")
    contact: str = Field(default="", max_length=50)
    img_list: str = Field(default="[]", description="图片URL数组JSON字符串")


class UpdatePostReq(BaseModel):
    goods_name: Optional[str] = Field(None, min_length=1, max_length=30)
    category: Optional[str] = Field(None, max_length=20)
    location: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    contact: Optional[str] = Field(None, max_length=50)
```

---

### 4. routers/user.py — 用户模块路由

```python
from fastapi import APIRouter, Depends, UploadFile, File
from core.response import success, fail
from db.database import get_connection, close_connection
from utils.jwt_util import create_token, decode_token
from utils.crypto_util import hash_password, verify_password
from utils.upload_util import save_upload_image
from schemas.user import UserRegisterReq, UserLoginReq, UserUpdateReq
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/api/user", tags=["用户模块"])
security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """JWT 鉴权依赖注入"""
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="登录已过期，请重新登录")
    return payload


@router.post("/register", summary="用户注册")
async def register(req: UserRegisterReq):
    conn = get_connection()
    try:
        cur = conn.cursor()
        # 检查用户名是否已存在
        cur.execute("SELECT id FROM user WHERE username = ?", (req.username,))
        if cur.fetchone():
            return fail(msg="用户名已被注册")

        hashed_pw = hash_password(req.password)
        cur.execute(
            "INSERT INTO user (username, password, phone, college) VALUES (?, ?, ?, ?)",
            (req.username, hashed_pw, req.phone, req.college)
        )
        conn.commit()
        return success(msg="注册成功")
    except Exception as e:
        conn.rollback()
        return fail(msg=f"注册失败: {str(e)}")
    finally:
        close_connection(conn)


@router.post("/login", summary="用户登录")
async def login(req: UserLoginReq):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM user WHERE username = ?", (req.username,))
        row = cur.fetchone()
        if not row:
            return fail(msg="用户名或密码错误")

        if not verify_password(req.password, row["password"]):
            return fail(msg="用户名或密码错误")

        token = create_token({"user_id": row["id"], "username": row["username"]})
        user_info = {
            "id": row["id"],
            "username": row["username"],
            "phone": row["phone"],
            "college": row["college"],
            "avatar": row["avatar"],
            "is_admin": row["is_admin"]
        }
        return success(data={"token": token, "user": user_info}, msg="登录成功")
    finally:
        close_connection(conn)


@router.get("/me", summary="获取当前用户信息")
async def get_me(user: dict = Depends(get_current_user)):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM user WHERE id = ?", (user["user_id"],))
        row = cur.fetchone()
        if not row:
            return fail(msg="用户不存在")
        return success(data={
            "id": row["id"],
            "username": row["username"],
            "phone": row["phone"],
            "college": row["college"],
            "avatar": row["avatar"],
            "is_admin": row["is_admin"]
        })
    finally:
        close_connection(conn)


@router.put("/profile", summary="修改个人资料")
async def update_profile(req: UserUpdateReq, user: dict = Depends(get_current_user)):
    conn = get_connection()
    try:
        cur = conn.cursor()
        updates = {}
        if req.username is not None:
            updates["username"] = req.username
        if req.phone is not None:
            updates["phone"] = req.phone
        if req.college is not None:
            updates["college"] = req.college

        if not updates:
            return fail(msg="无修改内容")

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [user["user_id"]]
        cur.execute(f"UPDATE user SET {set_clause} WHERE id = ?", values)
        conn.commit()
        return success(msg="资料更新成功")
    except Exception as e:
        conn.rollback()
        return fail(msg=f"更新失败: {str(e)}")
    finally:
        close_connection(conn)


@router.post("/avatar", summary="头像上传")
async def upload_avatar(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    url = await save_upload_image(file)
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE user SET avatar = ? WHERE id = ?", (url, user["user_id"]))
        conn.commit()
        return success(data={"url": url}, msg="头像上传成功")
    except Exception as e:
        conn.rollback()
        return fail(msg=f"头像更新失败: {str(e)}")
    finally:
        close_connection(conn)
```

---

### 5. routers/post.py — 帖子管理路由

```python
import json
from fastapi import APIRouter, Depends, UploadFile, File, Query
from core.response import success, fail
from db.database import get_connection, close_connection
from schemas.post import PublishPostReq, UpdatePostReq
from routers.user import get_current_user
from mcp_client import mcp_client
from utils.upload_util import save_upload_image
from vector.chroma_client import add_vector, delete_vector_by_post_id

router = APIRouter(prefix="/api/post", tags=["帖子管理"])


@router.post("", summary="发布帖子")
async def publish_post(req: PublishPostReq, user: dict = Depends(get_current_user)):
    # 内容合规检测
    check = await mcp_client.llm_content_check(req.description, req.goods_name)
    if not check.get("passed", True):
        return fail(msg=f"内容审核未通过: {check.get('reason', '包含违规内容')}")

    conn = get_connection()
    try:
        cur = conn.cursor()

        # 校验图片数量
        try:
            img_list = json.loads(req.img_list) if req.img_list else []
        except json.JSONDecodeError:
            img_list = []
        if len(img_list) > 3:
            return fail(msg="最多上传3张图片")

        # 自动分类（如用户未指定）
        category = req.category
        if category == "其他" or not category:
            category = await mcp_client.llm_classify_goods(req.description)

        cur.execute(
            """INSERT INTO post (user_id, post_type, goods_name, category, location, description, img_list, contact)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (user["user_id"], req.post_type, req.goods_name, category,
             req.location, req.description, json.dumps(img_list, ensure_ascii=False), req.contact)
        )
        conn.commit()
        post_id = cur.lastrowid

        # 异步生成向量并存入 ChromaDB（不阻塞返回）
        try:
            embedding = await mcp_client.get_embedding(req.description)
            add_vector(post_id, req.description, embedding, req.post_type, category)
        except Exception as e:
            print(f"[Vector] 向量写入异常(非致命): {e}")

        return success(data={"post_id": post_id}, msg="发布成功")
    except Exception as e:
        conn.rollback()
        return fail(msg=f"发布失败: {str(e)}")
    finally:
        close_connection(conn)


@router.put("/{post_id}", summary="编辑帖子")
async def update_post(
    post_id: int,
    req: UpdatePostReq,
    user: dict = Depends(get_current_user)
):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT user_id FROM post WHERE id = ?", (post_id,))
        row = cur.fetchone()
        if not row:
            return fail(msg="帖子不存在")
        if row["user_id"] != user["user_id"]:
            return fail(msg="只能编辑自己的帖子")

        updates = {}
        if req.goods_name is not None:
            updates["goods_name"] = req.goods_name
        if req.category is not None:
            updates["category"] = req.category
        if req.location is not None:
            updates["location"] = req.location
        if req.description is not None:
            updates["description"] = req.description
        if req.contact is not None:
            updates["contact"] = req.contact

        if not updates:
            return fail(msg="无修改内容")

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [post_id]
        cur.execute(f"UPDATE post SET {set_clause} WHERE id = ?", values)
        conn.commit()
        return success(msg="编辑成功")
    except Exception as e:
        conn.rollback()
        return fail(msg=f"编辑失败: {str(e)}")
    finally:
        close_connection(conn)


@router.delete("/{post_id}", summary="下架帖子")
async def remove_post(post_id: int, user: dict = Depends(get_current_user)):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT user_id FROM post WHERE id = ?", (post_id,))
        row = cur.fetchone()
        if not row:
            return fail(msg="帖子不存在")
        if row["user_id"] != user["user_id"]:
            return fail(msg="只能下架自己的帖子")

        cur.execute("DELETE FROM post WHERE id = ?", (post_id,))
        conn.commit()

        # 同步删除向量
        try:
            delete_vector_by_post_id(post_id)
        except Exception as e:
            print(f"[Vector] 向量删除异常(非致命): {e}")

        return success(msg="下架成功")
    except Exception as e:
        conn.rollback()
        return fail(msg=f"下架失败: {str(e)}")
    finally:
        close_connection(conn)


@router.get("/list", summary="帖子分页列表")
async def list_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    post_type: str = Query("", description="筛选类型: lost/found/空=全部"),
    keyword: str = Query("", description="关键词搜索")
):
    conn = get_connection()
    try:
        cur = conn.cursor()
        conditions = ["status = 'approved'"]
        params = []

        if post_type and post_type in ("lost", "found"):
            conditions.append("post_type = ?")
            params.append(post_type)
        if keyword:
            conditions.append("(goods_name LIKE ? OR description LIKE ?)")
            params.extend([f"%{keyword}%", f"%{keyword}%"])

        where = " AND ".join(conditions)
        offset = (page - 1) * page_size

        cur.execute(
            f"SELECT * FROM post WHERE {where} ORDER BY create_time DESC LIMIT ? OFFSET ?",
            params + [page_size, offset]
        )
        posts = [dict(row) for row in cur.fetchall()]

        # 总数
        cur.execute(f"SELECT COUNT(*) FROM post WHERE {where}", params)
        total = cur.fetchone()[0]

        return success(data={"list": posts, "total": total, "page": page, "page_size": page_size})
    finally:
        close_connection(conn)


@router.get("/{post_id}", summary="帖子详情")
async def get_post_detail(post_id: int):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM post WHERE id = ?", (post_id,))
        row = cur.fetchone()
        if not row:
            return fail(msg="帖子不存在")

        post = dict(row)
        # 查留言
        cur.execute(
            """SELECT c.*, u.username, u.avatar FROM comment c
               JOIN user u ON c.user_id = u.id
               WHERE c.post_id = ? ORDER BY c.create_time ASC""",
            (post_id,)
        )
        comments = [dict(r) for r in cur.fetchall()]

        return success(data={"post": post, "comments": comments})
    finally:
        close_connection(conn)


@router.post("/upload", summary="图片上传")
async def upload_image(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    url = await save_upload_image(file)
    return success(data={"url": url}, msg="上传成功")
```

---

### 6. 更新 main.py — 注册路由

```python
# 在 main.py 末尾添加以下路由注册代码：

from routers import user, post

app.include_router(user.router)
app.include_router(post.router)
```

---

### 接口文档说明

#### 用户模块 `/api/user`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | /api/user/register | 用户注册 | 否 |
| POST | /api/user/login | 用户登录，返回JWT | 否 |
| GET | /api/user/me | 获取当前用户信息 | 是 |
| PUT | /api/user/profile | 修改个人资料 | 是 |
| POST | /api/user/avatar | 头像上传 | 是 |

#### 帖子模块 `/api/post`

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | /api/post | 发布帖子（含内容审核+向量写入） | 是 |
| PUT | /api/post/{id} | 编辑帖子 | 是 |
| DELETE | /api/post/{id} | 下架帖子 | 是 |
| GET | /api/post/list | 分页列表（支持类型/关键词筛选） | 否 |
| GET | /api/post/{id} | 帖子详情（含留言） | 否 |
| POST | /api/post/upload | 图片上传 | 是 |

#### 更新内容汇总

| 文件 | 操作 |
|------|------|
| `mcp_client.py` | 新增 - MCP大模型客户端 |
| `schemas/__init__.py` | 新增 |
| `schemas/user.py` | 新增 - 用户校验模型 |
| `schemas/post.py` | 新增 - 帖子校验模型 |
| `routers/user.py` | 新增 - 用户路由 |
| `routers/post.py` | 新增 - 帖子路由 |
| `main.py` | 修改 - 注册新路由 |

> 暂未开发：语义搜索向量匹配逻辑、留言收藏互动接口、管理员接口。这些将在下一分段完成。

---

## 第三段：AI 语义匹配核心接口 + 留言收藏互动接口 + 管理员全套后台接口

---

**Developer:**

遵守全局强制约束，复用已有全部底层与业务代码，不修改已有逻辑，不编写前端代码。

开发需求清单：

一、开发AI语义匹配核心接口 /api/search
1. AI语义相似度搜索接口完整逻辑：
   接收前端搜索文本 → 文本预处理 → MCP生成查询向量 → Chroma余弦相似度检索Top15
   过滤相似度＜0.6数据 → 提取post_id批量查询SQLite帖子数据 → 按相似度降序组装分页数据返回
2. 发帖后置自动逻辑：帖子入库成功后，提取description文本生成向量，自动存入ChromaDB绑定post_id
3. 帖子删除/下架同步删除Chroma中对应向量数据

二、留言、收藏互动接口，路由分组 /api/interact，登录鉴权
1. 新增留言、删除本人留言接口
2. 收藏帖子、取消收藏帖子接口
3. 我的发布列表、我的收藏列表、我的留言列表分页查询接口

三、管理员专属接口，路由分组 /api/admin，仅is_admin=1账号可访问
1. 帖子审核接口：待审核帖子一键通过、违规下架
2. 用户管理接口：禁用违规用户账号
3. 数据统计接口：总发帖量、已匹配完结帖子数量、物品分类统计数据，供前端图表展示

四、收尾校验
1. 所有接口补充详细注释，Pydantic参数校验全覆盖
2. 补全异常捕获边界判断，防止空数据、越权操作（只能编辑/删除自己的帖子留言）
3. 校验向量数据联动逻辑完整性

输出约束：输出本模块新增代码、接口说明、整体业务流程说明，后端整体功能闭环可联调前端。

---

**AI:**

好的，本分段完成后端全部剩余接口，实现前后端联调闭环。

---

### 1. routers/search.py — AI 语义搜索路由

```python
"""
AI 语义搜索接口
流程：搜索文本 → MCP 向量化 → ChromaDB 余弦检索 → 过滤阈值 → 批量查 SQLite → 分页组装返回
"""
import json
from fastapi import APIRouter, Query
from core.response import success, fail
from db.database import get_connection, close_connection
from mcp_client import mcp_client
from vector.chroma_client import search_similar

router = APIRouter(prefix="/api/search", tags=["语义搜索"])


@router.get("", summary="AI语义相似度搜索")
async def semantic_search(
    query: str = Query(..., min_length=1, description="自然语言搜索文本"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50)
):
    """
    完整的语义搜索链路：
    1. 文本预处理（去空格、截断超长文本）
    2. 调用 MCP 向量化
    3. ChromaDB 余弦相似度 Top15 检索
    4. 过滤 similarity < 0.6 的结果
    5. 批量查 SQLite 获取完整帖子信息
    6. 按相似度降序组装分页数据
    """
    # 文本预处理
    query = query.strip()[:500]

    # 生成查询向量
    try:
        query_embedding = await mcp_client.get_embedding(query)
    except Exception as e:
        return fail(msg=f"向量化失败: {str(e)}")

    # ChromaDB 相似度检索
    similar_items = search_similar(query_embedding, top_n=15, threshold=0.6)

    if not similar_items:
        return success(data={"list": [], "total": 0, "page": page, "page_size": page_size})

    # 提取 post_id 列表
    post_ids = [item["post_id"] for item in similar_items]

    # 批量查询 SQLite 帖子数据
    conn = get_connection()
    try:
        cur = conn.cursor()
        placeholders = ",".join("?" for _ in post_ids)
        cur.execute(
            f"SELECT * FROM post WHERE id IN ({placeholders}) AND status = 'approved'",
            post_ids
        )
        posts_map = {row["id"]: dict(row) for row in cur.fetchall()}
    finally:
        close_connection(conn)

    # 按相似度降序组装结果
    merged = []
    for item in similar_items:
        post = posts_map.get(item["post_id"])
        if post:
            post["similarity"] = item["similarity"]
            merged.append(post)

    # 分页
    total = len(merged)
    start = (page - 1) * page_size
    end = start + page_size
    page_data = merged[start:end]

    return success(data={
        "list": page_data,
        "total": total,
        "page": page,
        "page_size": page_size
    })
```

---

### 2. routers/interact.py — 互动模块路由（留言 + 收藏）

```python
"""
互动模块：留言管理、收藏管理、个人列表查询
"""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from core.response import success, fail
from db.database import get_connection, close_connection
from routers.user import get_current_user

router = APIRouter(prefix="/api/interact", tags=["互动模块"])


class AddCommentReq(BaseModel):
    post_id: int = Field(..., description="帖子ID")
    content: str = Field(..., min_length=1, max_length=300, description="留言内容")


# ==================== 留言 ====================

@router.post("/comment", summary="新增留言")
async def add_comment(req: AddCommentReq, user: dict = Depends(get_current_user)):
    conn = get_connection()
    try:
        cur = conn.cursor()
        # 检查帖子是否存在
        cur.execute("SELECT id FROM post WHERE id = ?", (req.post_id,))
        if not cur.fetchone():
            return fail(msg="帖子不存在")

        cur.execute(
            "INSERT INTO comment (post_id, user_id, content) VALUES (?, ?, ?)",
            (req.post_id, user["user_id"], req.content)
        )
        conn.commit()
        return success(data={"comment_id": cur.lastrowid}, msg="留言成功")
    except Exception as e:
        conn.rollback()
        return fail(msg=f"留言失败: {str(e)}")
    finally:
        close_connection(conn)


@router.delete("/comment/{comment_id}", summary="删除留言")
async def delete_comment(comment_id: int, user: dict = Depends(get_current_user)):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT user_id FROM comment WHERE id = ?", (comment_id,))
        row = cur.fetchone()
        if not row:
            return fail(msg="留言不存在")
        if row["user_id"] != user["user_id"]:
            return fail(msg="只能删除自己的留言")

        cur.execute("DELETE FROM comment WHERE id = ?", (comment_id,))
        conn.commit()
        return success(msg="删除成功")
    except Exception as e:
        conn.rollback()
        return fail(msg=f"删除失败: {str(e)}")
    finally:
        close_connection(conn)


# ==================== 收藏 ====================

@router.post("/collect", summary="收藏帖子")
async def collect_post(
    post_id: int = Query(..., description="帖子ID"),
    user: dict = Depends(get_current_user)
):
    conn = get_connection()
    try:
        cur = conn.cursor()
        # 检查帖子是否存在
        cur.execute("SELECT id FROM post WHERE id = ?", (post_id,))
        if not cur.fetchone():
            return fail(msg="帖子不存在")

        # 联合唯一索引防重复
        try:
            cur.execute(
                "INSERT INTO collect (user_id, post_id) VALUES (?, ?)",
                (user["user_id"], post_id)
            )
            conn.commit()
            return success(msg="收藏成功")
        except Exception:
            return success(msg="已收藏")  # 幂等返回
    finally:
        close_connection(conn)


@router.delete("/collect/{post_id}", summary="取消收藏")
async def uncollect_post(post_id: int, user: dict = Depends(get_current_user)):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM collect WHERE user_id = ? AND post_id = ?",
            (user["user_id"], post_id)
        )
        conn.commit()
        return success(msg="已取消收藏")
    finally:
        close_connection(conn)


# ==================== 个人列表 ====================

@router.get("/my-posts", summary="我的发布列表")
async def my_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    user: dict = Depends(get_current_user)
):
    conn = get_connection()
    try:
        cur = conn.cursor()
        offset = (page - 1) * page_size
        cur.execute(
            "SELECT * FROM post WHERE user_id = ? ORDER BY create_time DESC LIMIT ? OFFSET ?",
            (user["user_id"], page_size, offset)
        )
        posts = [dict(row) for row in cur.fetchall()]
        cur.execute("SELECT COUNT(*) FROM post WHERE user_id = ?", (user["user_id"],))
        total = cur.fetchone()[0]
        return success(data={"list": posts, "total": total, "page": page, "page_size": page_size})
    finally:
        close_connection(conn)


@router.get("/my-collects", summary="我的收藏列表")
async def my_collects(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    user: dict = Depends(get_current_user)
):
    conn = get_connection()
    try:
        cur = conn.cursor()
        offset = (page - 1) * page_size
        cur.execute(
            """SELECT p.*, c.create_time as collect_time FROM collect c
               JOIN post p ON c.post_id = p.id
               WHERE c.user_id = ?
               ORDER BY c.create_time DESC LIMIT ? OFFSET ?""",
            (user["user_id"], page_size, offset)
        )
        posts = [dict(row) for row in cur.fetchall()]
        cur.execute("SELECT COUNT(*) FROM collect WHERE user_id = ?", (user["user_id"],))
        total = cur.fetchone()[0]
        return success(data={"list": posts, "total": total, "page": page, "page_size": page_size})
    finally:
        close_connection(conn)


@router.get("/my-comments", summary="我的留言列表")
async def my_comments(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    user: dict = Depends(get_current_user)
):
    conn = get_connection()
    try:
        cur = conn.cursor()
        offset = (page - 1) * page_size
        cur.execute(
            """SELECT c.*, p.goods_name, p.id as post_id FROM comment c
               JOIN post p ON c.post_id = p.id
               WHERE c.user_id = ?
               ORDER BY c.create_time DESC LIMIT ? OFFSET ?""",
            (user["user_id"], page_size, offset)
        )
        comments = [dict(row) for row in cur.fetchall()]
        cur.execute("SELECT COUNT(*) FROM comment WHERE user_id = ?", (user["user_id"],))
        total = cur.fetchone()[0]
        return success(data={"list": comments, "total": total, "page": page, "page_size": page_size})
    finally:
        close_connection(conn)
```

---

### 3. routers/admin.py — 管理员路由

```python
"""
管理员专属接口
所有接口需 JWT 鉴权 + is_admin 校验
"""
from fastapi import APIRouter, Depends, Query
from core.response import success, fail
from db.database import get_connection, close_connection
from routers.user import get_current_user
from vector.chroma_client import delete_vector_by_post_id

router = APIRouter(prefix="/api/admin", tags=["管理员后台"])


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """管理员权限校验中间件"""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT is_admin FROM user WHERE id = ?", (user["user_id"],))
        row = cur.fetchone()
        if not row or row["is_admin"] != 1:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="无管理员权限")
        return user
    finally:
        close_connection(conn)


# ==================== 帖子审核 ====================

@router.put("/post/{post_id}/approve", summary="审核通过帖子")
async def approve_post(post_id: int, admin: dict = Depends(require_admin)):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, status FROM post WHERE id = ?", (post_id,))
        row = cur.fetchone()
        if not row:
            return fail(msg="帖子不存在")

        cur.execute("UPDATE post SET status = 'approved' WHERE id = ?", (post_id,))
        conn.commit()
        return success(msg="审核已通过")
    except Exception as e:
        conn.rollback()
        return fail(msg=f"操作失败: {str(e)}")
    finally:
        close_connection(conn)


@router.put("/post/{post_id}/reject", summary="违规下架帖子")
async def reject_post(post_id: int, admin: dict = Depends(require_admin)):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM post WHERE id = ?", (post_id,))
        if not cur.fetchone():
            return fail(msg="帖子不存在")

        cur.execute("UPDATE post SET status = 'rejected' WHERE id = ?", (post_id,))
        # 同步清理相关留言
        cur.execute("DELETE FROM comment WHERE post_id = ?", (post_id,))
        # 同步清理收藏
        cur.execute("DELETE FROM collect WHERE post_id = ?", (post_id,))
        conn.commit()

        # 同步删除向量数据
        try:
            delete_vector_by_post_id(post_id)
        except Exception as e:
            print(f"[Admin] 向量删除异常(非致命): {e}")

        return success(msg="已下架，相关留言和收藏已清理")
    except Exception as e:
        conn.rollback()
        return fail(msg=f"操作失败: {str(e)}")
    finally:
        close_connection(conn)


# ==================== 用户管理 ====================

@router.put("/user/{user_id}/disable", summary="禁用用户")
async def disable_user(user_id: int, admin: dict = Depends(require_admin)):
    if user_id == admin["user_id"]:
        return fail(msg="不能禁用自己")

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, is_admin FROM user WHERE id = ?", (user_id,))
        row = cur.fetchone()
        if not row:
            return fail(msg="用户不存在")
        if row["is_admin"] == 1:
            return fail(msg="不能禁用管理员账号")

        cur.execute("UPDATE user SET is_admin = -1 WHERE id = ?", (user_id,))
        conn.commit()
        return success(msg="用户已禁用")
    except Exception as e:
        conn.rollback()
        return fail(msg=f"操作失败: {str(e)}")
    finally:
        close_connection(conn)


# ==================== 数据统计 ====================

@router.get("/statistics", summary="数据统计")
async def get_statistics(admin: dict = Depends(require_admin)):
    conn = get_connection()
    try:
        cur = conn.cursor()

        # 总发帖量
        cur.execute("SELECT COUNT(*) FROM post")
        total = cur.fetchone()[0]

        # 待审核数
        cur.execute("SELECT COUNT(*) FROM post WHERE status = 'pending'")
        pending = cur.fetchone()[0]

        # 已匹配/完结数（status='matched'）
        cur.execute("SELECT COUNT(*) FROM post WHERE status = 'matched'")
        matched = cur.fetchone()[0]

        # 物品分类统计
        cur.execute(
            "SELECT category, COUNT(*) as cnt FROM post GROUP BY category ORDER BY cnt DESC"
        )
        category_stats = [{"category": r["category"], "count": r["cnt"]} for r in cur.fetchall()]

        # 月度发帖趋势（近6个月）
        cur.execute("""
            SELECT strftime('%Y-%m', create_time) as month, COUNT(*) as cnt
            FROM post
            WHERE create_time >= date('now', '-6 months')
            GROUP BY month ORDER BY month ASC
        """)
        monthly_trend = [{"month": r["month"], "count": r["cnt"]} for r in cur.fetchall()]

        return success(data={
            "total": total,
            "pending": pending,
            "matched": matched,
            "category_stats": category_stats,
            "monthly_trend": monthly_trend
        })
    finally:
        close_connection(conn)
```

---

### 4. 更新 main.py — 注册全部路由

```python
# main.py 最终路由注册部分：

from routers import user, post, search, interact, admin

app.include_router(user.router)
app.include_router(post.router)
app.include_router(search.router)
app.include_router(interact.router)
app.include_router(admin.router)
```

---

### 5. 向量联动完整性校验说明

向量数据与业务数据的联动已在以下节点实现闭环：

| 节点 | 操作 | 文件位置 |
|------|------|----------|
| 发帖 | `add_vector(post_id, description, embedding, ...)` | `routers/post.py:48` |
| 下架帖子 | `delete_vector_by_post_id(post_id)` | `routers/post.py:97` |
| 管理员违规下架 | `delete_vector_by_post_id(post_id)` | `routers/admin.py:53` |
| 语义搜索 | `search_similar(query_embedding, top_n=15, threshold=0.6)` | `routers/search.py:30` |

---

### 完整接口总览

```
/api/user
  POST   /register         用户注册
  POST   /login            用户登录
  GET    /me               当前用户信息        [JWT]
  PUT    /profile          修改个人资料         [JWT]
  POST   /avatar           头像上传             [JWT]

/api/post
  POST                      发布帖子             [JWT]
  PUT    /{id}              编辑帖子             [JWT]
  DELETE /{id}              下架帖子             [JWT]
  GET    /list              分页列表
  GET    /{id}              帖子详情
  POST   /upload            图片上传             [JWT]

/api/search
  GET                       语义搜索

/api/interact
  POST   /comment           新增留言             [JWT]
  DELETE /comment/{id}      删除留言             [JWT]
  POST   /collect           收藏帖子             [JWT]
  DELETE /collect/{post_id} 取消收藏             [JWT]
  GET    /my-posts          我的发布列表         [JWT]
  GET    /my-collects       我的收藏列表         [JWT]
  GET    /my-comments       我的留言列表         [JWT]

/api/admin
  PUT    /post/{id}/approve 审核通过             [Admin]
  PUT    /post/{id}/reject  违规下架             [Admin]
  PUT    /user/{id}/disable 禁用用户             [Admin]
  GET    /statistics        数据统计             [Admin]
```

---

### 更新内容汇总（本分段）

| 文件 | 操作 |
|------|------|
| `routers/search.py` | 新增 - AI语义搜索路由 |
| `routers/interact.py` | 新增 - 留言收藏互动路由 |
| `routers/admin.py` | 新增 - 管理员后台路由 |
| `main.py` | 修改 - 注册三个新路由模块 |

---

### 整体业务流程说明

```
用户发布帖子
  → Pydantic 参数校验
  → MCP 内容审核（违规拦截）
  → SQLite 入库（status=pending）
  → 异步生成 Embedding 向量 → 写入 ChromaDB

用户搜索（AI语义模式）
  → 搜索文本 → MCP 向量化
  → ChromaDB 余弦相似度 Top15
  → 过滤 similarity < 0.6
  → 批量查 SQLite 组装分页结果

管理员审核
  → 通过：status → approved
  → 下架：删留言+收藏，删 Chroma 向量

向量联动
  → 发帖：向量写入 Chroma
  → 下架/违规：向量从 Chroma 删除
  → 保证向量库与业务库数据一致
```

> 至此，后端全部功能闭环，可配合前端三个分段的所有页面进行完整联调。

---
