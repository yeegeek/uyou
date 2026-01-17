# UYOU 技术架构

> 版本：v1.1 | 更新日期：2026-01-07 | 架构状态：MVP设计阶段

---

## 一、架构概述

### 系统架构

```
用户层：微信小程序（用户端/顾问端）+ 管理后台（Web）
    ↓ HTTPS/WSS (RESTful API)
API网关层：Nginx（反向代理、负载均衡、SSL终止、限流）
    ↓
应用服务层：NestJS API Server
    ├── 认证模块 (JWT + 微信登录)
    ├── 业务模块（用户、顾问、需求、订单、支付、通讯、通知、管理后台）
    ├── 定时任务 (@nestjs/schedule)
    └── 消息队列 (Bull + Redis)
    ↓
数据存储层：PostgreSQL + PostGIS | Redis | 腾讯云COS
    ↓
第三方服务层：微信支付、腾讯云IM、隐私号服务、实名认证API、短信服务
```

### 数据流向

- **用户请求流程**：用户操作 → 小程序/管理后台 → Nginx → NestJS API → 数据库/Redis → 第三方服务
- **异步任务流程**：业务触发 → 消息队列(Redis) → 后台Worker → 处理任务 → 通知推送/数据更新
- **实时通讯流程**：用户A → 小程序 → 腾讯云IM → 小程序 → 用户B

### 技术栈总览

| 层面 | 技术选型 | 说明 |
|------|----------|------|
| 后端框架 | NestJS 10.x | Node.js企业级框架 |
| 编程语言 | TypeScript 5.x | 类型安全 |
| ORM | Prisma 5.x | 类型安全的数据库访问层 |
| 主数据库 | PostgreSQL 15+ | 支持PostGIS |
| 缓存/队列 | Redis 7.x | 缓存、分布式锁、消息队列 |
| 小程序 | 微信小程序 | 原生小程序 + TypeScript |
| 管理后台 | vue-vben-admin v5.x | Vue3 + Vite + TypeScript + Monorepo（Shadcn UI + Tailwind CSS） |
| 云服务 | 腾讯云 | 云服务器、对象存储、IM等 |
| 容器化 | Docker + docker-compose | 开发/生产环境容器化 |

---

## 二、开发环境

### Docker开发环境（推荐）

**重要：** 本项目采用Docker优先的开发方式，所有服务和依赖都容器化

**docker-compose.yml结构：** PostgreSQL（PostGIS扩展）、Redis服务

**开发工作流：**
1. 启动Docker服务：`docker-compose up -d`
2. 本地开发：代码在本地编辑，连接到容器服务
3. 数据库迁移：使用Prisma在本地执行迁移
4. 热重载：NestJS应用支持热重载

**环境变量：** `.env.docker`（Docker服务配置）、`.env`（应用配置）

---

## 三、后端架构

### NestJS模块划分

```
server/src/
├── main.ts                    # 应用入口
├── app.module.ts              # 根模块
├── common/                     # 公共模块（装饰器、过滤器、守卫、拦截器、管道、工具函数）
├── config/                     # 配置模块（数据库、Redis、微信、腾讯云）
├── modules/                    # 业务模块
│   ├── auth/                  # 认证模块
│   ├── users/                 # 用户模块
│   ├── consultants/           # 顾问模块
│   ├── orders/                # 订单模块
│   ├── payments/              # 支付模块
│   ├── demands/               # 需求模块
│   ├── reviews/               # 评价模块
│   ├── conversations/         # 会话模块
│   ├── notifications/         # 通知模块
│   ├── coupons/              # 优惠券模块
│   ├── discovery/             # 发现模块
│   └── admin/                 # 管理后台模块
├── tasks/                      # 定时任务模块
├── queues/                     # 消息队列模块
└── database/                   # 数据库模块（Prisma服务、迁移）
```

### 核心模块设计

**认证模块 (auth)：** 微信登录、手机号绑定、JWT Token生成/验证/刷新、权限控制（用户/顾问/管理员）

**技术实现：** `@nestjs/jwt` + `@nestjs/passport`（JwtStrategy、JwtAuthGuard、RolesGuard）

**订单模块 (orders)：** 订单创建、状态管理（状态机流转）、取消与退款（阶梯退款规则）

**订单状态机：** `pending_accept → pending_payment → paid → in_progress → pending_confirm → completed`  
**其他状态：** expired（12h未接单）、cancelled（用户/顾问取消）

**核心逻辑：** 价格计算（总价=服务时长×单价，平台费=总价×10-15%）、快照数据、定时任务、退款规则

**支付模块 (payments)：** 创建支付订单、微信支付集成、支付回调处理、退款处理、钱包管理（顾问）

**技术实现：** 微信支付SDK、支付回调签名验证、分布式锁、事务处理

**需求模块 (demands)：** 需求发布、智能匹配算法、需求大厅展示、顾问申请与选择

**智能匹配算法：** 总分 = 距离分×40% + 评分分×30% + 偏好分×20% + 活跃分×10%

**匹配流程：** 筛选条件（城市相同+服务类目启用+在服务半径内+状态正常）→ 排除条件（黑名单关系+信用分<60+当前时段已有订单）→ 评分排序（取TOP 10推送）→ 降级策略（无匹配时推荐热门顾问）

**技术实现：** PostGIS的`ST_Distance`计算距离、Redis缓存匹配结果（TTL: 5分钟）、异步计算

**定时任务系统：** `@nestjs/schedule`（基于cron）

**主要任务：** 订单超时处理（每5分钟：12h未接单→expired，30min未支付→cancelled）、订单自动确认（每小时：24h未确认→completed）、需求过期处理（每10分钟：24h无人接单→expired）

**消息队列系统：** `Bull` + Redis

**队列用途：** 通知队列（异步发送系统通知、推送消息）、匹配队列（异步计算需求匹配分数）

---

## 四、数据库架构

### 数据库选型

**PostgreSQL 15+：** 支持PostGIS（地理位置查询）、JSONB支持、事务ACID保证、丰富的索引类型（GIST、GIN等）

**Redis 7.x：** 缓存（用户信息、顾问列表）、分布式锁（订单创建、支付回调）、消息队列（通知推送）

### 数据库设计原则

1. UUID主键：所有表使用UUID，便于分布式扩展
2. 软删除：关键表使用`deleted_at`，保留历史数据
3. 时间戳：统一使用`created_at`、`updated_at`
4. 索引策略：外键字段建立索引、查询条件字段建立索引、地理位置字段使用GIST索引、联合查询建立复合索引

### 数据安全

- 敏感数据加密：手机号、身份证号使用AES-256加密
- 数据备份：每日自动备份，保留30天
- 访问控制：数据库用户权限最小化
- 审计日志：管理员操作记录到`admin_operation_logs`

---

## 五、前端架构

### 微信小程序架构

**目录结构：** `pages/`（页面）、`components/`（组件）、`services/`（API服务）、`utils/`（工具函数）、`types/`（TypeScript类型）

**技术要点：** TypeScript、统一API请求封装、状态管理（可选）、组件化开发

### 管理后台架构

**技术选型：** [vue-vben-admin](https://github.com/vbenjs/vue-vben-admin) v5.x

**核心特性：**
- **技术栈：** Vue3 + Vite + TypeScript + Monorepo（pnpm workspaces + TurboRepo）
- **核心UI层：** Shadcn UI + Tailwind CSS（v5.x 核心已切换到此，作为基础 UI 层）
- **业务组件适配：** 通过 monorepo 结构支持其他 UI 框架（Ant Design Vue、Naive UI、Element Plus）的业务组件适配
- **权限系统：** 动态路由权限、按钮级权限控制、菜单权限
- **主题系统：** 多主题支持（含暗色模式）、自定义主题色（基于 Tailwind CSS）
- **国际化：** 内置 i18n 支持，资源文件懒加载
- **Mock数据：** Nitro Mock 高性能本地 Mock 服务
- **工程化：** ESLint、Prettier、Stylelint、TypeScript 严格模式

**目录结构（基于 vue-vben-admin）：**
```
admin/
├── apps/
│   └── web-antd/         # 主应用（核心 UI 层：Shadcn UI + Tailwind CSS）
│       ├── src/
│       │   ├── router/    # 路由配置（动态路由、权限控制）
│       │   ├── stores/   # Pinia 状态管理（用户、权限、标签页等）
│       │   ├── views/     # 页面视图
│       │   ├── components/# 业务组件（基于 Shadcn UI）
│       │   ├── api/      # API 接口封装
│       │   └── locales/  # 国际化资源
│       └── .env*         # 环境变量配置
├── packages/              # 共享包（核心 UI 组件基于 Shadcn UI、工具函数等）
└── internal/             # 内部配置（Vite、Tailwind CSS、TS 等）
```

**说明：** v5.x 核心已切换到 Shadcn UI + Tailwind CSS 作为基础 UI 层，`apps/web-antd` 等应用目录名称是历史命名，但核心 UI 组件已基于 Shadcn UI + Tailwind CSS 构建。

**技术要点：**
- Vue3 Composition API、Shadcn UI、Tailwind CSS、Pinia、Axios
- 动态路由生成（基于后端权限接口）
- 路由守卫（登录验证、权限验证）
- 请求拦截器（Token 注入、错误处理）
- 响应拦截器（统一错误处理、Token 刷新）

---

## 六、第三方服务集成

**微信支付：** SDK `wechatpay-node-v3`，流程：统一下单 → 调起支付 → 支付回调，安全措施：签名验证、回调幂等性处理

**腾讯云IM：** RESTful API（用户管理、消息发送）、WebSocket（实时消息推送）、回调接口（消息同步到本地数据库）、功能：单聊、群聊、音视频通话、消息推送、离线消息

**腾讯云COS（对象存储）：** 用途：用户头像、顾问照片、视频介绍、静态资源，SDK `cos-nodejs-sdk-v5`，上传策略：预签名URL或服务端直传，CDN加速

**隐私号服务：** 服务商：阿里云隐私号/腾讯云隐私保护通话，功能：订单绑定虚拟中间号、双向通话转接、48小时自动解绑、通话记录查询

---

## 七、部署架构

### 服务器架构

```
腾讯云服务器 (CVM)
├── Nginx（反向代理、负载均衡、SSL终止、限流）
└── Docker（容器化）
    └── NestJS API Server（PM2进程管理）
         ↓
    腾讯云数据库（PostgreSQL）+ 腾讯云Redis
```

### 容器化部署

**Dockerfile：** 多阶段构建，Node.js 18-alpine基础镜像，生产环境优化

### Nginx配置

**核心配置：** 反向代理、限流（10 req/s per IP）、SSL配置（Let's Encrypt）、健康检查（`/health`接口）、Gzip压缩

---

## 八、安全架构

### 认证与授权

**JWT Token机制：** Access Token（2小时）、Refresh Token（7天）、Token存储在客户端，服务端无状态

**权限控制：** 基于角色的访问控制（RBAC），用户角色：普通用户、情感顾问、管理员

### 数据安全

**加密存储：** 敏感字段（手机号、身份证号）使用AES-256加密，密码使用bcrypt哈希，传输加密：全站HTTPS

**数据脱敏：** API返回时自动脱敏（如手机号：138****8888），日志中不记录敏感信息

### 接口安全

**防护措施：** 请求签名验证、接口限流（Nginx层全局限流10 req/s per IP，应用层使用`@nestjs/throttler`）、CORS配置、SQL注入防护（Prisma参数化查询）、XSS防护（输入验证和转义）、CSRF防护（管理后台使用CSRF Token）

### 安全功能

紧急求助（SOS）、位置共享（线下服务）、服务地点限制（仅公共场所）、虚拟号码（保护真实手机号）

---

## 九、性能优化

### 数据库优化

**索引策略：** 外键字段建立索引、查询条件字段建立索引、地理位置字段使用GIST索引、联合查询建立复合索引

**查询优化：** 使用Prisma的`select`只查询需要的字段、分页查询使用`cursor`或`offset`、复杂查询使用数据库视图、定期分析慢查询日志

### 缓存策略

**Redis缓存：** 用户信息缓存（TTL: 1小时）、顾问列表缓存（TTL: 5分钟）、城市/类目配置缓存（TTL: 24小时）、热点数据缓存（如推荐顾问）

**缓存更新：** 写入时更新缓存（Cache Aside模式），缓存失效时重新加载

### API优化

**响应优化：** 压缩响应（gzip）、分页查询、字段选择、接口合并

**并发控制：** Redis分布式锁（防止重复操作）、数据库连接池（Prisma自动管理，默认10个连接）、异步处理（使用消息队列处理耗时任务）、请求去重（关键操作使用幂等性设计）

---

## 十、监控与日志

### 日志系统

**日志级别：** ERROR（错误）、WARN（警告）、INFO（信息）、DEBUG（调试）

**日志内容：** 请求日志、错误日志、业务日志、操作日志

**日志存储：** 本地文件（开发环境）、腾讯云CLS（生产环境，可选）

### 监控指标

**系统监控：** CPU、内存、磁盘使用率、API响应时间（P50、P95、P99）、错误率、数据库连接数、查询时间

**业务监控：** 订单量、GMV、用户活跃度、支付成功率、匹配成功率

**告警规则：** API错误率 > 5%、响应时间 P95 > 1秒、数据库连接数 > 80%、支付失败率 > 2%

### 错误追踪

**工具：** Sentry（可选）

**追踪内容：** 异常堆栈、用户上下文、请求参数、环境信息

---

## 十一、扩展性设计

### 水平扩展

**无状态设计：** API服务无状态，可水平扩展；Session存储在Redis（如需要）；文件存储在COS，不依赖本地存储；JWT Token无状态，无需共享Session

**负载均衡：** Nginx负载均衡（轮询/加权轮询）、多实例部署（Docker容器）、健康检查（`/health`接口）、自动故障转移

**扩展步骤：** 增加NestJS服务实例（Docker容器）→ 更新Nginx upstream配置 → 重新加载Nginx配置 → 监控各实例健康状态

### 数据库扩展

**读写分离（未来）：** 主库写操作、从库读操作、Prisma支持读写分离配置

**分库分表（未来）：** 按城市分库、订单表按时间分表

### 微服务化（未来）

**服务拆分：** 用户服务、订单服务、支付服务、匹配服务、通知服务、通讯服务

**通信方式：** 同步通信（RESTful API）、异步通信（消息队列RabbitMQ/Kafka）、服务发现（Consul/Eureka，可选）、API网关（Kong/Zuul）

**拆分原则：** 按业务边界拆分（高内聚、低耦合）、独立数据库（避免跨服务事务）、最终一致性（通过消息队列保证）

---

## 十二、开发环境搭建

### 必需工具

Node.js 18+、PostgreSQL 15+、Redis 7+、Docker（可选）

### 环境变量

`DATABASE_URL`、`REDIS_URL`、`JWT_SECRET`、`WECHAT_APPID`、`WECHAT_SECRET`、`TENCENT_IM_SECRET_ID`、`TENCENT_IM_SECRET_KEY`

### 开发命令

```bash
npm install              # 安装依赖
npx prisma migrate dev   # 数据库迁移
npx prisma generate     # 生成Prisma Client
npm run start:dev       # 启动开发服务器（热重载）
npm run test            # 运行测试
npm run lint            # 代码检查
```

### 开发工具推荐

**必需工具：** VS Code/Cursor、Postman/Insomnia、DBeaver/pgAdmin、Redis Insight

**推荐插件：** ESLint、Prettier、Prisma、TypeScript Vue Plugin (Volar)

---

## 十三、部署流程

### 部署步骤

1. 代码构建：`npm run build`
2. 数据库迁移：`npx prisma migrate deploy`
3. Docker构建：`docker build -t uyou-api .`
4. 容器启动：`docker-compose up -d`
5. 健康检查：`curl http://localhost:3000/health`

### CI/CD（未来）

**GitHub Actions / GitLab CI：** 自动运行测试、自动构建Docker镜像、自动部署到测试环境、手动触发生产部署

### 环境配置

**环境类型：** 开发环境（Docker Compose）、测试环境（独立数据库）、预发布环境（生产环境镜像）、生产环境（容器化部署）

**环境变量管理：** 开发环境使用`.env`和`.env.docker`文件，生产环境使用环境变量注入，敏感信息使用密钥管理服务

---

## 十四、技术选型说明

**后端框架：NestJS** - 企业级Node.js框架、模块化设计、内置依赖注入、丰富的生态系统、原生支持TypeScript

**ORM：Prisma** - 类型安全的数据库访问、自动生成TypeScript类型、直观的查询API、强大的迁移工具、支持PostGIS扩展

**数据库：PostgreSQL** - 支持PostGIS（地理位置查询必需）、JSONB支持、事务ACID保证、丰富的索引类型、成熟稳定

**缓存：Redis** - 高性能内存数据库、支持多种数据结构、支持分布式锁、可用作消息队列、丰富的命令和功能

**前端：微信小程序 + vue-vben-admin** - 小程序：原生性能好、微信生态集成；管理后台：vue-vben-admin v5.x 核心基于 Shadcn UI + Tailwind CSS 作为基础 UI 层，提供开箱即用的中后台解决方案，支持动态路由权限、多主题、国际化、Mock数据等企业级特性，基于 Vue3 + Vite + TypeScript + Monorepo 架构，开发效率高、可维护性强

---

## 十五、常见问题

**为什么使用PostGIS而不是其他地理位置方案？**  
PostGIS是PostgreSQL的地理位置扩展，支持复杂的地理位置查询（如距离计算、范围查询），性能优于应用层计算，且与PostgreSQL深度集成。

**为什么使用Redis作为消息队列而不是RabbitMQ？**  
MVP阶段使用Redis队列足够，简单易用，减少技术栈复杂度。未来可升级到RabbitMQ/Kafka。

**如何保证支付回调的幂等性？**  
使用分布式锁 + 数据库唯一索引，确保同一支付订单号只处理一次。

**定时任务如何保证高可用？**  
使用分布式锁，确保多实例部署时只有一个实例执行定时任务。

**如何保证数据一致性？**  
使用数据库事务（单服务内）、使用最终一致性（跨服务，通过消息队列）、关键操作使用分布式锁。
