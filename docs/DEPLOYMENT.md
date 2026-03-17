# Memory Console 部署方案整合文档

> 文档版本: 1.0  
> 最后更新: 2026-03-16  
> 作者: 白面鸮 (Ptilopsis)

---

## 📋 目录

1. [版本概述](#版本概述)
2. [各版本功能对比](#各版本功能对比)
3. [推荐的部署架构](#推荐的部署架构)
4. [升级路径](#升级路径)
5. [环境变量配置](#环境变量配置)
6. [故障排查](#故障排查)

---

## 版本概述

当前项目包含三个 docker-compose 配置文件，经历了从独立向量数据库到完整应用堆栈的演进：

| 文件 | 用途 | 阶段 |
|------|------|------|
| `docker-compose.pgvector.yml` | 独立的 pgvector 向量数据库服务 | 早期阶段 |
| `docker-compose.test.yml` | 测试环境配置 | 测试阶段 |
| `docker-compose.yml` | 完整生产环境 | 当前版本 |

---

## 各版本功能对比

### 1. docker-compose.pgvector.yml (早期版本)

**定位**: 仅提供独立的 PostgreSQL + pgvector 向量数据库服务

```
┌─────────────────┐
│   pgvector      │
│   (5433:5432)   │
└─────────────────┘
```

| 特性 | 状态 |
|------|------|
| 镜像 | pgvector/pgvector:pg16 |
| 端口映射 | 5433 → 5432 |
| 数据持久化 | `/data/vector-data` (宿主机目录) |
| 健康检查 | ✅ |
| 应用服务 | ❌ |
| Ollama LLM | ❌ |
| 自动迁移 | ❌ |

**适用场景**:
- 已有 Next.js 应用，需要单独的向量数据库
- 作为其他服务的外部向量存储
- 最小化资源占用

---

### 2. docker-compose.test.yml (测试版本)

**定位**: 轻量级测试环境

```
┌──────────────┐     ┌─────────────────┐
│   app        │────▶│   postgres      │
│  (3003:3000) │     │   (5435:5432)   │
└──────────────┘     └─────────────────┘
```

| 特性 | 状态 |
|------|------|
| 镜像 | 自定义 Dockerfile.collab |
| 端口映射 | app: 3003, postgres: 5435 |
| 数据持久化 | postgres_test (命名卷) |
| 数据库名 | memory_console_test |
| 健康检查 | ❌ |
| Ollama LLM | ❌ |
| 自动迁移 | ❌ |
| 环境变量 | 简化配置 |

**适用场景**:
- 开发和测试新功能
- CI/CD 自动化测试
- 快速原型验证

---

### 3. docker-compose.yml (当前版本 - 完整功能)

**定位**: 生产级完整部署

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   app        │────▶│   db            │     │   ollama     │
│  (3000:3000) │     │  (5434:5432)    │     │ (11434:11434)│
└──────────────┘     └─────────────────┘     └──────────────┘
```

| 特性 | 状态 |
|------|------|
| 镜像 | 自定义 Dockerfile |
| 端口映射 | app: 3000, db: 5434, ollama: 11434 |
| 数据持久化 | postgres-data, ollama-data (命名卷) |
| 数据库名 | memory_console |
| 健康检查 | ✅ (db) |
| Ollama LLM | ✅ (本地) |
| 自动迁移 | ✅ (Prisma db push + migrate) |
| 向量搜索 | ✅ (pgvector) |
| 环境变量 | 完整配置 |
| 内存限制 | Ollama: 4GB |

**功能模块**:
- ✅ Next.js 应用服务 (API + 前端)
- ✅ PostgreSQL + pgvector 向量数据库
- ✅ Ollama 本地 LLM 推理
- ✅ Prisma ORM 自动迁移
- ✅ 命名空间隔离
- ✅ API Token 认证
- ✅ 审计日志

---

## 推荐的部署架构

### 生产环境 (推荐)

使用 `docker-compose.yml` 完整版本：

```bash
cd /home/zealot/Code/memory-console
cp .env.example .env
# 编辑 .env 配置必要参数
docker-compose up -d
```

**架构图**:

```
                    ┌─────────────────────────────────────────┐
                    │           Traefik Reverse Proxy         │
                    │         (192.168.3.2:80)               │
                    └──────────────────┬──────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────────┐
                    │         memory-console network          │
                    │                                          │
┌──────────────┐    │    ┌─────────────────┐                 │
│   Client     │────┼───▶│   app:3000      │                 │
│  (Browser)   │    │    │  Next.js API    │                 │
└──────────────┘    │    └────────┬────────┘                 │
                     │             │                          │
                     │    ┌────────▼────────┐    ┌──────────┐ │
                     │    │ db:5434         │    │ ollama   │ │
                     │    │ pgvector:pg16  │    │ :11434   │ │
                     │    │ (vector search)│    │ (LLM)    │ │
                     │    └────────────────┘    └──────────┘ │
                     └────────────────────────────────────────┘
```

**资源要求**:
| 组件 | 最低配置 | 推荐配置 |
|------|----------|----------|
| 内存 | 6GB | 8GB+ |
| CPU | 2 核 | 4 核 |
| 磁盘 | 10GB | 20GB+ |

---

### 开发/测试环境

使用 `docker-compose.test.yml`:

```bash
cd /home/zealot/Code/memory-console
docker-compose -f docker-compose.test.yml up -d
```

**特点**:
- 轻量级资源占用 (~2GB)
- 端口不与生产冲突 (3003)
- 独立测试数据库

---

### 外部向量数据库架构 (进阶)

如果需要在多服务间共享向量数据库：

```bash
# 启动独立的 pgvector 服务
docker-compose -f docker-compose.pgvector.yml up -d
```

**适用场景**:
- 多个应用共享同一向量数据库
- 单独的数据库运维策略
- 横向扩展需求

---

## 升级路径

### 从独立 pgvector 升级到完整版本

**场景**: 当前运行 `docker-compose.pgvector.yml`，需要迁移到完整版本

**步骤**:

1. **备份数据** (重要!)
```bash
# 停止当前服务
docker-compose -f docker-compose.pgvector.yml down

# 备份数据目录
cp -r /data/vector-data /data/vector-data.backup.$(date +%Y%m%d)
```

2. **启动完整版本**
```bash
# 使用新配置
docker-compose up -d
```

3. **验证迁移**
```bash
# 检查服务状态
docker-compose ps

# 检查数据库连接
curl http://localhost:3000/api/health
```

---

### 从测试版本升级到生产版本

**场景**: 当前运行 `docker-compose.test.yml`，需要切换到生产版本

**步骤**:

1. **停止测试环境**
```bash
docker-compose -f docker-compose.test.yml down
```

2. **配置生产环境变量**
```bash
# 复制并编辑环境变量
cp .env.example .env
# 编辑 .env，设置生产环境变量
```

3. **启动生产环境**
```bash
docker-compose up -d
```

4. **数据迁移 (可选)**
```bash
# 如果需要保留测试数据，导出再导入
# 详细操作见下方数据迁移章节
```

---

### 端口冲突解决方案

如果遇到端口冲突，修改 `docker-compose.yml` 中的端口映射：

```yaml
services:
  app:
    ports:
      - "3001:3000"  # 改为 3001
  db:
    ports:
      - "5435:5432"  # 改为 5435
```

---

## 环境变量配置

### 必需变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://postgres:postgres@db:5432/memory_console` |
| `API_TOKEN` | API 访问令牌 | `dev-token-xxxxx` |

### 可选变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NODE_ENV` | 运行环境 | `production` |
| `OPENAI_API_KEY` | OpenAI API Key | (空) |
| `OLLAMA_HOST` | Ollama 服务地址 | `http://ollama:11434` |
| `OLLAMA_MODEL` | 使用的 embedding 模型 | `bge-m3` |
| `NEXT_PUBLIC_API_TOKEN` | 前端使用的 API Token | 同 API_TOKEN |

---

## 故障排查

### 常见问题

#### 1. 数据库连接失败

**症状**: `Connection refused to db:5432`

**排查**:
```bash
# 检查数据库容器状态
docker-compose ps db

# 查看数据库日志
docker-compose logs db

# 检查健康状态
docker inspect memory-console-postgres | grep -A 10 Health
```

**解决**: 等待数据库完全启动，或检查 `depends_on` 配置

---

#### 2. Ollama 模型未加载

**症状**: 向量搜索返回空结果

**排查**:
```bash
# 检查 Ollama 容器
docker-compose logs ollama

# 手动测试
curl http://localhost:11434/api/tags
```

**解决**: 首次启动后自动下载模型，可能需要几分钟

---

#### 3. Prisma 迁移失败

**症状**: `Error: P3009` 或数据库架构不匹配

**排查**:
```bash
# 查看迁移日志
docker-compose logs app | grep -i prisma

# 手动执行迁移
docker exec -it memory-console npx prisma db push
```

---

#### 4. 端口被占用

**症状**: `Error starting userland proxy: listen tcp4 0.0.0.0:3000: bind: address already in use`

**解决**:
```bash
# 查找占用进程
lsof -i :3000

# 修改 docker-compose.yml 中的端口映射
```

---

### 健康检查脚本

```bash
#!/bin/bash
# health-check.sh

echo "=== Memory Console Health Check ==="

# 检查容器状态
echo -e "\n[1] Container Status:"
docker-compose ps

# 检查应用 API
echo -e "\n[2] API Health:"
curl -s http://localhost:3000/api/health || echo "API unreachable"

# 检查数据库连接
echo -e "\n[3] Database:"
docker exec memory-console-postgres pg_isready -U postgres

# 检查 Ollama
echo -e "\n[4] Ollama:"
curl -s http://localhost:11434/api/tags | jq -r '.models[].name' 2>/dev/null || echo "Ollama unreachable"

echo -e "\n=== Check Complete ==="
```

---

## 附录

### 快速命令参考

```bash
# 启动生产环境
docker-compose up -d

# 启动测试环境
docker-compose -f docker-compose.test.yml up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 进入容器
docker exec -it memory-console sh

# 查看资源使用
docker stats
```

### 相关文件

- `docker-compose.yml` - 生产配置
- `docker-compose.pgvector.yml` - 独立向量数据库
- `docker-compose.test.yml` - 测试配置
- `Dockerfile` - 应用镜像
- `prisma/schema.prisma` - 数据库模型
- `.env.example` - 环境变量模板
