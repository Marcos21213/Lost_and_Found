# Lost and Found Backend

本目录包含 FastAPI 后端代码。当前已完成底层基础架构、MCP 大模型客户端、用户模块接口、帖子基础管理接口、AI 语义匹配、留言收藏互动、管理员审核与统计接口；不包含任何前端代码。

## 目录结构

```text
backend/
  main.py                         FastAPI 入口文件，注册 CORS、异常处理、静态资源和路由
  mcp_client.py                   MCP 风格大模型与 Embedding 统一客户端
  .env                            环境配置模板，密钥不硬编码
  requirements.txt                Python 依赖清单
  core/
    config.py                     环境配置读取与路径解析
    response.py                   全局统一响应体封装
    exceptions.py                 全局异常处理注册
  dependencies/
    auth.py                       JWT 登录鉴权依赖
  middlewares/
    exception_middleware.py       全局异常捕获中间件
  db/
    sqlite.py                     SQLite 连接、关闭、自动建表
  routers/
    user.py                       用户注册、登录、资料、头像接口
    post.py                       帖子发布、编辑、下架、列表、详情、图片上传接口
    search.py                     AI 语义相似度搜索接口
    interact.py                   留言、收藏、我的发布/收藏/留言接口
    admin.py                      管理员审核、用户禁用、统计接口
  schemas/
    user.py                       用户模块 Pydantic v2 入参模型
    post.py                       帖子模块 Pydantic v2 入参模型
    search.py                     搜索模块 Pydantic v2 入参模型
    interact.py                   互动模块 Pydantic v2 入参模型
    admin.py                      管理员模块 Pydantic v2 入参模型
  services/
    post_vector.py                帖子向量写入、更新、删除联动服务
  vector/
    chroma.py                     ChromaDB 集合初始化与向量操作工具
  utils/
    security.py                   JWT 与 bcrypt 密码工具
    file_upload.py                图片校验、大小限制、本地存储、路径处理
  static/
    images/                       上传头像、帖子图片存储目录
  data/                           运行后自动生成 SQLite 与 ChromaDB 数据，已被 .gitignore 忽略
```

## 虚拟环境

CMD:

```cmd
cd /d D:\project\Lost_and_Found\backend
.venv\Scripts\activate.bat
python -m pip install -r requirements.txt
```

PowerShell:

```powershell
cd D:\project\Lost_and_Found\backend
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

## 启动命令

```cmd
cd /d D:\project\Lost_and_Found\backend
.venv\Scripts\activate.bat
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

启动时会自动完成：

- 创建 `static/images` 静态资源目录，并挂载到 `/static/images`
- 初始化 SQLite 数据库与 `user`、`post`、`comment`、`collect` 四张表
- 为 `collect(user_id, post_id)` 创建联合唯一索引，防止重复收藏
- 初始化 ChromaDB 集合 `lost_found_collection`，使用余弦相似度

## MCP 配置

`.env` 中预留：

```text
LLM_KEY=
EMBEDDING_KEY=
MCP_API_BASE_URL=
MCP_SESSION_HEADER=X-MCP-Session-ID
MCP_CONTEXT_MAX_CHARS=4000
MCP_TIMEOUT_SECONDS=30
LLM_MODEL_NAME=
VECTOR_MODEL_NAME=
EMBEDDING_MODEL_NAME=
EMBEDDING_DIMENSION=384
```

`mcp_client.py` 已封装：

- `llm_text_polish(raw_text)`：描述文本润色
- `llm_classify_goods(goods_description)`：物品分类识别
- `llm_content_check(content)`：广告、敏感违规内容检测
- `embedding_text(text)`：在线 Embedding 调用，未配置外网时使用本地轻量兜底向量

## 用户接口

统一前缀：`/api/user`

| 方法 | 路径 | 说明 | 鉴权 |
| --- | --- | --- | --- |
| POST | `/api/user/register` | 用户注册，校验手机号、昵称、密码、学院，密码加密入库 | 否 |
| POST | `/api/user/login` | 用户登录，支持手机号或昵称登录，返回 JWT | 否 |
| GET | `/api/user/me` | 获取当前登录用户信息 | 是 |
| PUT | `/api/user/profile` | 修改昵称、手机号、学院 | 是 |
| POST | `/api/user/avatar` | 上传头像，单图最大 2MB，仅支持 jpg/png/webp | 是 |

登录后请求头：

```text
Authorization: Bearer <token>
```

## 帖子接口

统一前缀：`/api/post`，全部需要登录鉴权。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/post` | 发布帖子，表单校验，多图最多 3 张，调用 MCP 内容合规检测后以 `pending` 状态入库 |
| PUT | `/api/post/{post_id}` | 编辑本人帖子 |
| PATCH | `/api/post/{post_id}/offline` | 手动下架本人帖子 |
| GET | `/api/post/list` | 分页查询帖子列表，支持 `post_type=lost/found` 筛选 |
| GET | `/api/post/{post_id}` | 查询单帖子详情 |
| POST | `/api/post/upload-images` | 独立批量上传帖子图片，最多 3 张，单文件最大 2MB，仅支持 jpg/png/webp |
| DELETE | `/api/post/{post_id}` | 删除本人帖子，并同步删除 ChromaDB 向量 |

发帖成功后会自动将 `description` 生成 Embedding 并写入 ChromaDB，绑定 `post_id`。新帖子默认是 `pending`，管理员审核通过后变为 `open`，才会进入公开列表、互动和语义搜索；编辑帖子影响 `post_type/category/description` 时会同步更新向量；下架或删除帖子时会同步删除对应向量。

## AI 语义搜索接口

统一前缀：`/api/search`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/search` | 接收搜索文本，预处理后调用 MCP 生成查询向量，ChromaDB 余弦相似度 Top15 检索，过滤相似度低于 0.6 的结果，再批量查询 SQLite 帖子并按相似度降序分页返回 |

请求体示例：

```json
{
  "keyword": "校园卡 图书馆",
  "page": 1,
  "page_size": 10
}
```

## 互动接口

统一前缀：`/api/interact`，全部需要登录鉴权。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/interact/comment` | 新增留言 |
| DELETE | `/api/interact/comment/{comment_id}` | 删除本人留言 |
| POST | `/api/interact/collect/{post_id}` | 收藏帖子 |
| DELETE | `/api/interact/collect/{post_id}` | 取消收藏帖子 |
| GET | `/api/interact/my-posts` | 我的发布列表 |
| GET | `/api/interact/my-collects` | 我的收藏列表 |
| GET | `/api/interact/my-comments` | 我的留言列表 |

## 管理员接口

统一前缀：`/api/admin`，仅 `is_admin=1` 的账号可访问。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/admin/posts` | 管理员帖子审核列表，默认查询 `status=pending` |
| PATCH | `/api/admin/posts/{post_id}/approve` | 待审核帖子一键通过，状态置为 `open` 并确保向量存在 |
| PATCH | `/api/admin/posts/{post_id}/reject` | 违规帖子下架，状态置为 `offline` 并删除向量 |
| GET | `/api/admin/users` | 管理员用户列表，支持昵称/手机号搜索 |
| PATCH | `/api/admin/users/{user_id}/disable` | 禁用违规用户账号 |
| GET | `/api/admin/statistics` | 总发帖量、已匹配完结帖子数量、物品分类统计、帖子类型统计 |

## 业务流程闭环

1. 用户注册、登录后拿到 JWT。
2. 用户发布帖子，后端完成表单校验、MCP 内容合规检测、SQLite 入库、ChromaDB 向量写入，状态为 `pending`。
3. 管理员审核通过后帖子变为 `open`，前端调用 `/api/search` 时后端生成查询向量，检索 ChromaDB，按相似度返回帖子分页数据。
4. 用户可留言、收藏、查看自己的发布/收藏/留言。
5. 用户编辑帖子会同步更新向量；用户下架或删除帖子会同步删除向量。
6. 管理员可审核通过帖子、违规下架帖子、禁用用户账号，并查看统计数据。
