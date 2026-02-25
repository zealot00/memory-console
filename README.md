# Memory Console 🧠

记忆控制台是一个基于 Next.js 和 PostgreSQL (pgvector) 的 AI 记忆管理系统，支持本地存储和云端同步。

## 功能特性

- 📝 **创建记忆** - 支持 AI 记忆和人类记忆两种类型
- 🔍 **搜索记忆** - 按标题、内容或标签搜索
- 🏷️ **标签管理** - 为记忆添加和编辑标签
- 📁 **Namespace 支持** - 按命名空间分类管理记忆
- ☁️ **云端同步** - 支持同步到阿里云
- 🎨 **现代化 UI** - 精美的响应式界面

## 快速开始

### Docker 部署（推荐）

```bash
# 克隆项目
git clone https://github.com/zealot00/memory-console.git
cd memory-console

# 启动服务（会自动构建并启动数据库和应用）
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

服务启动后访问：[http://localhost:3000](http://localhost:3000)

### 开发模式

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## Docker 部署说明

### 环境变量

在 `.env` 文件中配置以下环境变量：

```env
# 数据库连接
DATABASE_URL=postgresql://postgres:postgres@db:5432/memory_console

# API Token（用于认证）
NEXT_PUBLIC_API_TOKEN=your_api_token
```

### 端口映射

| 服务 | 端口 |
|------|------|
| 应用 | 3000 |
| PostgreSQL | 5434（外部）/ 5432（内部）|

### Docker 命令

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重新构建并启动
docker compose build --no-cache
docker compose up -d

# 查看日志
docker compose logs -f app

# 进入容器
docker exec -it memory-console sh
```

## API 测试报告

### 认证

所有 API 请求需要在 Header 中携带 Token：

```
Authorization: Bearer dev-token-1234567890abcdef
```

### CRUD 操作

**创建记忆 (POST /api/memories)**

```bash
curl -X POST -H "Authorization: Bearer dev-token-1234567890abcdef" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Memory","content":"Content here","owner":"ai","tags":["test"]}' \
  http://localhost:3000/api/memories
```

**读取记忆 (GET /api/memories)**

```bash
curl -H "Authorization: Bearer dev-token-1234567890abcdef" \
  http://localhost:3000/api/memories
```

**更新记忆 (PUT /api/memories)**

```bash
curl -X PUT -H "Authorization: Bearer dev-token-1234567890abcdef" \
  -H "Content-Type: application/json" \
  -d '{"id":"memory_id","title":"Updated Title"}' \
  http://localhost:3000/api/memories
```

**删除记忆 (DELETE /api/memories)**

```bash
curl -X DELETE -H "Authorization: Bearer dev-token-1234567890abcdef" \
  "http://localhost:3000/api/memories?id=memory_id"
```

### 测试结果

✅ 所有 CRUD 操作测试通过：
- ✅ 创建记忆成功
- ✅ 读取记忆列表成功
- ✅ 更新记忆成功
- ✅ 删除记忆成功

## 使用说明

### 创建记忆

1. 点击右上角的 **"添加记忆"** 按钮
2. 在弹出的菜单中选择 **AI 记忆** 或 **人类记忆**
3. 填写记忆标题和内容
4. 可以添加标签（用逗号分隔）
5. 点击 **"保存更改"** 按钮

### 使用 Namespace

应用支持多个命名空间来分类管理记忆：

- 🏠 **默认** - 默认命名空间
- 🌐 **全局** - 全局共享记忆
- 🔍 **审计模块** - 审计相关记忆
- 🧠 **记忆中枢** - 核心记忆存储

切换 Namespace：
1. 在左侧边栏找到 **"命名空间"** 部分
2. 点击当前命名空间
3. 选择目标命名空间即可切换

### 删除记忆

1. 点击需要删除的记忆卡片
2. 在编辑弹窗中点击左下角的 **"删除"** 按钮
3. 确认删除操作

### 搜索记忆

在页面顶部的搜索框中输入关键词，可以搜索：
- 记忆标题
- 记忆内容
- 标签

### 云端同步

- **上传到云端** - 点击上传图标将本地记忆同步到阿里云
- **从云端下载** - 点击下载图标从阿里云拉取记忆到本地

## 技术栈

- **前端**: Next.js 14, React, TypeScript, Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: PostgreSQL + pgvector
- **部署**: Docker

## 贡献者

本项目由 **自动化工程终端（AI Agent）** 独立开发和维护。

---

## 许可证

MIT
