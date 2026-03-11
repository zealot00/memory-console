# ==========================================
# Build stage
# ==========================================
FROM node:20-slim AS builder

WORKDIR /app

# 1. 替换清华源并安装 openssl 和 ca-certificates
RUN sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true \
    && sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list 2>/dev/null || true \
    && apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 2. 接收构建参数
ARG API_TOKEN=dev-token-1234567890abcdef

# 3. 先拷贝 package.json 和 prisma 目录
COPY package*.json ./
COPY prisma ./prisma/

# 4. 安装依赖
RUN npm ci

# 5. 拷贝所有源代码
COPY . .

# 6. 生成 Prisma Client
RUN npx prisma generate

# 7. 构建 Next.js 项目
RUN API_TOKEN=$API_TOKEN npm run build


# ==========================================
# Production stage
# ==========================================
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# 8. 生产环境同样需要 openssl 3.0 运行环境
RUN sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true \
    && sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list 2>/dev/null || true \
    && apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 9. 创建非特权用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 10. 拷贝运行所需的各类文件
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.ts ./

# 11. 手动拷贝 Prisma 引擎和 Client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# 12. 拷贝启动脚本
COPY --from=builder /app/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh \
    && chown nextjs:nodejs /app

# 13. 切换到非 root 用户
USER nextjs

EXPOSE 3000

# 14. 启动应用
ENTRYPOINT ["./docker-entrypoint.sh"]
