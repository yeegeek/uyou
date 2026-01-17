# UYOU Server

UYOU 无忧陪伴后端服务

## 技术栈

- **框架**: NestJS + TypeScript
- **数据库**: PostgreSQL + PostGIS
- **缓存**: Redis
- **ORM**: Prisma
- **认证**: JWT
- **API文档**: Swagger/OpenAPI

## 项目结构

```
server/
├── prisma/
│   └── schema.prisma        # Prisma数据库模型
├── src/
│   ├── auth/               # 认证模块
│   ├── common/             # 公共模块（过滤器、拦截器、装饰器等）
│   ├── config/             # 配置模块
│   ├── database/           # 数据库模块
│   ├── users/              # 用户模块
│   ├── consultants/        # 顾问模块
│   ├── demands/            # 需求模块
│   ├── orders/             # 订单模块
│   ├── payments/           # 支付模块
│   ├── reviews/            # 评价模块
│   ├── communication/      # 通讯模块
│   ├── security/           # 安全模块
│   ├── notifications/      # 通知模块
│   ├── admin/              # 管理后台模块
│   ├── discovery/          # 发现模块
│   ├── app.module.ts       # 主模块
│   └── main.ts             # 入口文件
├── .env                    # 环境变量
├── package.json
└── tsconfig.json
```

## 开发环境搭建

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并配置：

```bash
DATABASE_URL="postgresql://uyou:uyou_dev_password@localhost:5432/uyou?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-super-secret-jwt-key
```

### 3. 启动数据库（使用Docker）

```bash
# 启动PostgreSQL和Redis
docker-compose up -d

# 查看容器状态
docker-compose ps
```

### 4. 数据库迁移

```bash
# 生成Prisma Client
pnpm exec prisma generate

# 执行数据库迁移
pnpm exec prisma migrate dev --name init

# 查看数据库
pnpm exec prisma studio
```

### 5. 启动开发服务器

```bash
# 开发模式（热重载）
pnpm run start:dev

# 生产模式
pnpm run start:prod
```

## API文档

启动服务后访问: http://localhost:3000/api/docs

## 数据库设计

完整的数据库设计文档请参考：
- `docs/modules/` - 各模块的PRD、API、数据库设计
- `docs/modules/00-shared.md` - 共享规范和设计原则

## 开发规范

1. **代码规范**: 遵循 ESLint + Prettier 配置
2. **提交规范**: 遵循 Conventional Commits
3. **API规范**: 遵循 RESTful 设计，参考 `docs/modules/00-shared.md`
4. **错误处理**: 使用统一的错误码，参考 `src/common/constants/error-codes.ts`

## 常用命令

```bash
# 开发
pnpm run start:dev

# 构建
pnpm run build

# 测试
pnpm run test

# 代码格式化
pnpm run format

# 代码检查
pnpm run lint

# Prisma相关
pnpm exec prisma generate      # 生成Prisma Client
pnpm exec prisma migrate dev   # 创建迁移
pnpm exec prisma studio        # 打开数据库管理界面
```

## 当前状态

✅ Phase 1 基础架构已完成：
- NestJS项目初始化
- Prisma ORM配置和Schema创建
- 公共模块（过滤器、拦截器、验证管道）
- 认证模块（JWT认证）
- API文档（Swagger）

⏳ 下一步：Phase 2 用户端核心功能开发
