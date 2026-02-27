# ==========================================
# Build stage
# ==========================================
FROM node:20-slim AS builder

WORKDIR /app

# 1. 替换清华源并安装 openssl 和 ca-certificates (解决网络和 SSL 校验问题)
RUN sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true \
    && sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list 2>/dev/null || true \
    && apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 2. 先拷贝 package.json 和 prisma 目录
COPY package*.json ./
COPY prisma ./prisma/

# 3. 安装依赖 (此时系统已具备 openssl 3.0 环境，npm ci 不会报错)
RUN npm ci

# 4. 拷贝所有源代码
COPY . .

# 5. 生成 Prisma Client (会自动读取 schema.prisma 去下载 3.0.x 引擎)
RUN npx prisma generate

# 6. 构建 Next.js 项目
RUN npm run build


# ==========================================
# Production stage
# ==========================================
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# 7. 生产环境同样需要 openssl 3.0 运行环境
RUN sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || true \
    && sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list 2>/dev/null || true \
    && apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 8. 创建非特权用户 (安全最佳实践)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 9. 拷贝运行所需的各类文件，并直接赋予 nextjs 权限
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/.env.local ./
COPY --from=builder /app/.env ./

# 10. 【关键所在】手动拷贝 Prisma 引擎和 Client (因为 standalone 不会自动打包它们)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# 11. 拷贝并设置启动脚本权限
COPY --from=builder /app/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
RUN chown nextjs:nodejs /app

# 12. 切换到非 root 用户
USER nextjs

EXPOSE 3000

# 13. 启动应用
ENTRYPOINT ["./docker-entrypoint.sh"]
