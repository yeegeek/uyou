# UYOU 无忧陪伴

> C2C情感陪伴撮合平台 | 连接情感顾问与需要陪伴的你

---

## 项目简介

UYOU（无忧陪伴）是C2C情感陪伴撮合平台，连接"情感顾问"与"需要陪伴的用户"，提供线上+线下的多场景陪伴服务。

**核心场景：** 娱乐陪伴（看电影、逛街、唱K）、运动陪伴（爬山、健身、跑步、骑行）、情绪疏导、线上陪伴（视频/语音陪聊）

**MVP目标城市：** 上海、成都

---

## 技术栈

| 层面 | 技术选型 |
|------|----------|
| 后端 | NestJS + TypeScript |
| 数据库 | PostgreSQL + Redis |
| 小程序 | 微信小程序 + TypeScript |
| 管理后台 | [vue-vben-admin](https://github.com/vbenjs/vue-vben-admin) v5.x (Vue3 + Vite + TypeScript + Monorepo，核心基于 Shadcn UI + Tailwind CSS) |
| 云服务 | 腾讯云（IM、COS） |
| 支付 | 微信支付 |

---

## 项目结构

```
uyou/
├── docs/              # 产品与设计文档
│   ├── modules/       # 模块化文档（14个模块，PRD+API+DB）
│   ├── ui-design/     # UI设计文档
│   │   ├── mockups/   # 效果图存放目录
│   │   └── GUIDE.md   # UI设计实施指南
│   ├── ui-design.md   # UI设计规范文档
│   ├── miniprogram-routes.md  # 小程序页面路由文档
│   ├── tech-architecture.md
│   └── QUICK_REFERENCE.md
├── server/            # 后端服务 (NestJS)
├── miniprogram/       # 微信小程序
├── admin/             # 管理后台 (vue-vben-admin)
├── .cursorrules       # AI助手规则
├── README.md
└── todo.md            # 开发计划和任务清单
```

---

## 工程进度

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 0 | 产品设计（PRD、数据库、API设计） | ✅ 已完成 |
| Phase 0.5 | 外部申请（微信支付、小程序等） | ⏳ 进行中 |
| Phase 0.6 | UI设计（设计规范、页面布局、效果图） | ⏳ 进行中 |
| Phase 1 | 基础架构搭建 | ⏳ 待开始 |
| Phase 2 | 用户端核心功能 | ⏳ 待开始 |
| Phase 3 | 情感顾问端核心功能 | ⏳ 待开始 |
| Phase 4 | 管理后台 | ⏳ 待开始 |
| Phase 5 | 安全与风控 | ⏳ 待开始 |
| Phase 6 | 测试与上线 | ⏳ 待开始 |

**代码状态：** 尚未开始编码（后端/小程序/管理后台）

**详细开发计划：** 查看 [todo.md](./todo.md)

---

## 文档索引

### 模块化文档（推荐）

文档已按业务模块重组，每个模块包含PRD、API、数据库设计三部分：

| 模块 | 文档 | 说明 |
|------|------|------|
| 共享规范 | [00-shared.md](./docs/modules/00-shared.md) | API规范、数据库设计原则 |
| 用户模块 | [01-users.md](./docs/modules/01-users.md) | 用户信息、实名认证、紧急联系人、收藏、屏蔽 |
| 认证模块 | [02-auth.md](./docs/modules/02-auth.md) | 微信登录、手机号绑定、Token刷新 |
| 顾问模块 | [03-consultants.md](./docs/modules/03-consultants.md) | 顾问入驻、培训、接单、收入、提现 |
| 订单模块 | [04-orders.md](./docs/modules/04-orders.md) | 订单创建、接单、取消、状态流转 |
| 支付模块 | [05-payments.md](./docs/modules/05-payments.md) | 支付、退款、钱包、提现 |
| 需求模块 | [06-demands.md](./docs/modules/06-demands.md) | 需求发布、匹配、申请、选择顾问 |
| 评价模块 | [07-reviews.md](./docs/modules/07-reviews.md) | 双向评价、标签、打赏 |
| 通讯模块 | [08-communication.md](./docs/modules/08-communication.md) | 售前咨询、订单会话、消息、通话 |
| 安全模块 | [09-security.md](./docs/modules/09-security.md) | 紧急求助、位置共享、投诉举报 |
| 营销模块 | [10-marketing.md](./docs/modules/10-marketing.md) | 优惠券、活动 |
| 通知模块 | [11-notifications.md](./docs/modules/11-notifications.md) | 系统通知、公告、反馈 |
| 管理后台 | [12-admin.md](./docs/modules/12-admin.md) | 管理员、数据看板、各类管理 |
| 发现模块 | [13-discovery.md](./docs/modules/13-discovery.md) | 城市、类目、推荐、搜索 |

**其他文档：**
- [tech-architecture.md](./docs/tech-architecture.md) - 技术架构文档
- [QUICK_REFERENCE.md](./docs/QUICK_REFERENCE.md) - 快速参考表（枚举值、接口、字段映射）

**UI设计与小程序文档：**
- [ui-design.md](./docs/ui-design.md) - UI设计规范文档（设计系统、组件库、页面布局说明）
- [miniprogram-routes.md](./docs/miniprogram-routes.md) - 微信小程序页面路由文档（页面路径、Tab配置、跳转关系）
- [ui-design/GUIDE.md](./docs/ui-design/GUIDE.md) - UI设计实施指南（AI生成效果图步骤）

**使用建议：**
- 开发时使用模块化文档（`docs/modules/`），一个文件包含完整信息
- UI设计时参考 [ui-design.md](./docs/ui-design.md) 和 [miniprogram-routes.md](./docs/miniprogram-routes.md)
- AI可以同时搜索多个模块文档（14个文件，约6000行）
- 快速查询查看 [快速参考表](./docs/QUICK_REFERENCE.md)

---

## AI助手使用说明

**新对话开始：** `请查看 @README.md 和 @todo.md 了解项目`

**开发特定功能：** `请参考 @docs/modules/04-orders.md 开发订单模块`

**重要约定：**
- 优先使用模块化文档（`docs/modules/`），一个文件包含PRD+API+DB
- 严格遵循文档：代码实现必须参考模块文档
- 更新进度：完成任务后更新 `todo.md` 复选框

---

## License

Private - All Rights Reserved
