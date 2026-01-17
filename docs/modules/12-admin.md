# UYOU 无忧陪伴 - 管理后台模块

> 管理后台模块完整文档 | 包含PRD、API、数据库设计

---

## 一、PRD - 产品需求

### 1.1 功能清单

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 管理员登录 | 账号密码登录 | P0 |
| 数据看板 | 核心数据展示 | P0 |
| 用户管理 | 用户列表、详情、封禁/解封 | P0 |
| 情感顾问管理 | 顾问列表、审核、封禁/解封 | P0 |
| 订单管理 | 订单列表、详情、取消、退款 | P0 |
| 投诉管理 | 投诉列表、处理 | P0 |
| 评价管理 | 评价列表、审核 | P0 |
| 财务管理 | 交易流水、提现审核 | P0 |
| 系统配置 | 系统参数配置 | P0 |
| 权限管理 | 权限列表、角色权限分配 | P0 |
| 数据统计分析 | 用户行为分析、业务数据报表 | P0 |
| 优惠券管理 | 创建、发放优惠券 | P1 |
| 活动管理 | 创建、管理活动 | P1 |
| 隐私访问日志 | 查看管理员访问敏感信息记录 | P0 |

### 1.2 页面清单

| 模块 | 页面 | 说明 |
|------|------|------|
| 登录 | /login | 管理员登录 |
| 数据看板 | /dashboard | 核心数据展示 |
| 用户管理 | /users | 用户列表与详情 |
| 情感顾问管理 | /companions | 情感顾问列表与审核 |
| 订单管理 | /orders | 订单列表与详情 |
| 投诉管理 | /complaints | 投诉处理 |
| 评价管理 | /reviews | 评价审核 |
| 财务管理 | /finance | 交易流水、提现审核 |
| 系统配置 | /configs | 系统参数配置 |
| 权限管理 | /permissions | 权限列表、角色权限分配 |
| 数据分析 | /analytics | 用户行为分析、业务数据报表 |
| 营销管理 | /marketing | 优惠券、活动管理 |
| 隐私审计 | /privacy-logs | 隐私访问日志 |

---

## 二、API - 接口设计

### 2.1 管理员登录

**POST** `/admin/auth/login`

**请求：**
```json
{
  "username": "admin",
  "password": "password"
}
```

### 2.2 获取数据看板

**GET** `/admin/dashboard`

**响应：**
```json
{
  "today": {
    "orders": 100,
    "gmv": 50000.00,
    "newUsers": 50,
    "activeUsers": 500
  },
  "trends": {
    "orders": [ ... ],
    "gmv": [ ... ],
    "users": [ ... ]
  },
  "cities": [ ... ],
}
```

### 2.3 用户管理

**GET** `/admin/users` - 用户列表
**查询参数：** `keyword`, `status`, `cityId`, `nextPage`, `pageSize`
**响应格式：** `{users: [], pagination: {}}`（Debug模式包含`_debug`字段）

**GET** `/admin/users/:id` - 用户详情
**响应格式：** `{用户对象...}`（Debug模式包含`_debug`字段）

**PATCH** `/admin/users/:id/status` - 封禁/解封
**请求：** `{status: 0}` (0禁用/1正常)

### 2.4 顾问管理

**GET** `/admin/consultants` - 顾问列表
**查询参数：** `keyword`, `status`, `cityId`, `nextPage`, `pageSize`
**响应格式：** `{consultants: [], pagination: {}}`（Debug模式包含`_debug`字段）

**GET** `/admin/consultants/:id` - 顾问详情
**响应格式：** `{顾问对象...}`（Debug模式包含`_debug`字段）

**POST** `/admin/consultants/:id/approve` - 审核通过
**POST** `/admin/consultants/:id/reject` - 审核拒绝
**请求：** `{reason: "拒绝原因"}`

**PATCH** `/admin/consultants/:id/status` - 封禁/解封

### 2.5 订单管理

**GET** `/admin/orders` - 订单列表
**查询参数：** `orderNo`, `status`, `cityId`, `dateRange`, `nextPage`, `pageSize`
**响应格式：** `{orders: [], pagination: {}}`（Debug模式包含`_debug`字段）

**GET** `/admin/orders/:id` - 订单详情
**POST** `/admin/orders/:id/cancel` - 取消订单
**POST** `/admin/orders/:id/refund` - 退款处理
**请求：** `{refundAmount: 200.00, reason: "退款原因"}`

### 2.6 投诉管理

**GET** `/admin/complaints` - 投诉列表
**查询参数：** `status`, `type`, `nextPage`, `pageSize`
**响应格式：** `{complaints: [], pagination: {}}`（Debug模式包含`_debug`字段）

**GET** `/admin/complaints/:id` - 投诉详情
**POST** `/admin/complaints/:id/handle` - 处理投诉

**请求：**
```json
{
  "result": "处理结果",
  "penalty": {
    "type": "warning", // warning/deduct_score/ban
    "score": 10 // 扣分（可选）
  }
}
```

### 2.7 评价管理

**GET** `/admin/reviews` - 评价列表
**查询参数：** `status`, `reviewType`, `targetId`, `nextPage`, `pageSize`
**响应格式：** `{reviews: [], pagination: {}}`（Debug模式包含`_debug`字段）

**GET** `/admin/reviews/:id` - 评价详情
**响应格式：** `{评价对象...}`（Debug模式包含`_debug`字段）

**POST** `/admin/reviews/:id/audit` - 审核评价
**请求：**
```json
{
  "action": "approve", // approve通过/reject拒绝
  "reason": "评价内容违规" // 拒绝时必填
}
```

**响应：**
```json
{
  "reviewId": "review_id",
  "status": 1, // 1显示/2审核拒绝
  "reviewedAt": "2026-01-15T10:00:00Z"
}
```

**说明：** 审核通过评价状态`0待审核 → 1显示`，审核拒绝评价状态`0待审核 → 2审核拒绝`（隐藏），需填写拒绝原因

### 2.8 财务管理

**GET** `/admin/finance/transactions` - 交易流水
**查询参数：** `type`, `dateRange`, `nextPage`, `pageSize`
**响应格式：** `{transactions: [], pagination: {}}`（Debug模式包含`_debug`字段）

**GET** `/admin/finance/withdraws` - 提现列表
**查询参数：** `status`, `nextPage`, `pageSize`
**响应格式：** `{withdraws: [], pagination: {}}`（Debug模式包含`_debug`字段）

**POST** `/admin/finance/withdraws/:id/approve` - 审核提现
**POST** `/admin/finance/withdraws/:id/reject` - 拒绝提现
**请求：** `{reason: "拒绝原因"}` (可选)

### 2.8 系统配置

#### 2.8.1 获取配置列表

**GET** `/admin/configs`

**查询参数：**
- `key` (optional) - 配置键（精确匹配）
- `nextPage`, `pageSize`

**响应：**
```json
{
  "configs": [
    {
      "key": "platform_fee_rate",
      "value": "0.15",
      "type": "decimal",
      "description": "平台抽佣比例",
      "updatedBy": "admin_id",
      "updatedAt": "2026-01-15T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

#### 2.8.2 获取单个配置

**GET** `/admin/configs/:key`

**响应：**
```json
{
  "key": "platform_fee_rate",
  "value": "0.15",
  "type": "decimal",
  "description": "平台抽佣比例",
  "updatedBy": "admin_id",
  "updatedAt": "2026-01-15T10:00:00Z"
}
```

#### 2.8.3 更新配置

**PATCH** `/admin/configs/:key`

**请求：**
```json
{
  "value": "0.20"
}
```

**响应：**
```json
{
  "key": "platform_fee_rate",
  "value": "0.20",
  "updatedAt": "2026-01-15T10:00:00Z"
}
```

**配置验证规则：**
- 根据配置项的类型（`type`）进行验证
- `string` 类型：检查长度、格式（如：URL格式、邮箱格式）
- `number` 类型：检查数值范围（如：0-1之间的小数）
- `boolean` 类型：检查是否为 true/false
- `json` 类型：检查JSON格式是否正确
- 验证失败返回HTTP 400，错误信息包含具体的验证失败原因

**配置变更日志：**
- 配置变更时，自动记录到 `admin_operation_logs` 表
- `module` = 'system'
- `action` = 'config_update'
- `target_type` = 'system_config'
- `target_id` = 配置ID
- `before_data` = 变更前的配置值（JSON格式）
- `after_data` = 变更后的配置值（JSON格式）

### 2.9 优惠券管理

**POST** `/admin/coupons` - 创建优惠券
**GET** `/admin/coupons` - 优惠券列表
**查询参数：** `status`, `nextPage`, `pageSize`
**响应格式：** `{coupons: [], pagination: {}}`（Debug模式包含`_debug`字段）

**PATCH** `/admin/coupons/:id` - 更新优惠券
**POST** `/admin/coupons/:id/publish` - 发放优惠券

### 2.10 活动管理

**POST** `/admin/activities` - 创建活动
**GET** `/admin/activities` - 活动列表
**查询参数：** `status`, `type`, `nextPage`, `pageSize`
**响应格式：** `{activities: [], pagination: {}}`（Debug模式包含`_debug`字段）

**PATCH** `/admin/activities/:id` - 更新活动

### 2.11 隐私访问日志

**GET** `/admin/privacy-logs` - 访问日志列表

**查询参数：**
- `adminId` (optional)
- `targetUserId` (optional)
- `targetType` (optional)
- `nextPage`, `pageSize`

**响应格式：** `{logs: [], pagination: {}}`（Debug模式包含`_debug`字段）

### 2.12 权限管理

#### 2.12.1 获取权限列表

**GET** `/admin/permissions`

**查询参数：**
- `module` (optional) - 模块名称
- `nextPage`, `pageSize`

**响应：**
```json
{
  "permissions": [
    {
      "id": "permission_id",
      "name": "用户管理",
      "code": "user:manage",
      "module": "user",
      "action": "manage",
      "description": "用户列表、详情、封禁/解封"
    }
  ],
  "pagination": { ... }
}
```

#### 2.12.2 获取角色权限

**GET** `/admin/roles/:roleId/permissions`

**响应：**
```json
{
  "roleId": 1,
  "roleName": "运营",
  "permissions": [
    {
      "id": "permission_id",
      "code": "user:manage",
      "name": "用户管理"
    }
  ]
}
```

#### 2.12.3 分配角色权限

**POST** `/admin/roles/:roleId/permissions`

**请求：**
```json
{
  "permissionIds": ["permission_id1", "permission_id2"]
}
```

**说明：** 仅超级管理员可操作

#### 2.12.4 权限验证说明

**权限验证方式：**
- 使用权限代码（`permission.code`）进行验证
- 格式：`{module}:{action}`（如：`user:manage`、`order:view`、`complaint:handle`）
- 在API接口上使用装饰器 `@RequirePermission('user:manage')` 进行权限验证
- 验证逻辑：检查当前管理员所属角色的权限列表中是否包含该权限代码

**权限验证流程：**
1. 管理员登录后，获取其角色和权限列表，缓存到Redis（Key: `admin:permissions:{admin_id}`）
2. 请求接口时，从请求头获取Token，解析出管理员ID
3. 从Redis获取管理员权限列表，检查是否包含所需权限
4. 如果权限不足，返回HTTP 403 Forbidden

### 2.13 数据统计分析

#### 2.13.1 用户行为分析

**GET** `/admin/analytics/user-behavior`

**查询参数：**
- `userId` (optional) - 用户ID
- `behaviorType` (optional) - 行为类型（见枚举）
- `startDate` (optional) - 开始日期
- `endDate` (optional) - 结束日期
- `nextPage`, `pageSize`

**响应：**
```json
{
  "behaviors": [
    {
      "id": "behavior_id",
      "userId": "user_id",
      "userName": "用户昵称",
      "behaviorType": "view_consultant",
      "behaviorName": "查看顾问",
      "relatedType": "consultant",
      "relatedId": "consultant_id",
      "relatedName": "顾问昵称",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "pagination": { ... },
  "summary": {
    "totalBehaviors": 1000,
    "uniqueUsers": 500,
    "topBehaviors": [
      {"type": "view_consultant", "count": 500},
      {"type": "create_order", "count": 200}
    ]
  }
}
```

#### 2.13.2 业务数据报表

**GET** `/admin/analytics/reports`

**查询参数：**
- `reportType` (required) - 报表类型（见枚举）
- `startDate` (optional) - 开始日期
- `endDate` (optional) - 结束日期
- `groupBy` (optional) - 分组方式（day/week/month）

**报表类型枚举：**
| 报表类型 | 说明 |
|---------|------|
| `order_statistics` | 订单统计（订单数、GMV、平均订单金额等） |
| `user_statistics` | 用户统计（新增用户、活跃用户、留存率等） |
| `consultant_statistics` | 顾问统计（新增顾问、活跃顾问、接单率等） |
| `revenue_statistics` | 收入统计（平台收入、顾问收入、提现等） |
| `category_statistics` | 类目统计（各服务类目的订单数、GMV等） |
| `city_statistics` | 城市统计（各城市的订单数、GMV等） |

**响应示例（订单统计）：**
```json
{
  "reportType": "order_statistics",
  "period": {
    "startDate": "2026-01-01",
    "endDate": "2026-01-31"
  },
  "data": [
    {
      "date": "2026-01-01",
      "totalOrders": 100,
      "totalGmv": 50000.00,
      "avgOrderAmount": 500.00,
      "completedOrders": 80,
      "cancelledOrders": 20
    }
  ],
  "summary": {
    "totalOrders": 3100,
    "totalGmv": 1550000.00,
    "avgOrderAmount": 500.00,
    "completionRate": 80.0
  }
}
```

#### 2.13.3 数据看板统计

**GET** `/admin/analytics/dashboard`

**查询参数：**
- `dateRange` (optional) - 日期范围（today/week/month）

**响应：**
```json
{
  "overview": {
    "totalUsers": 10000,
    "totalConsultants": 500,
    "totalOrders": 5000,
    "totalGmv": 2500000.00
  },
  "today": {
    "newUsers": 50,
    "newConsultants": 5,
    "newOrders": 100,
    "todayGmv": 50000.00
  },
  "trends": {
    "users": [ ... ],
    "orders": [ ... ],
    "gmv": [ ... ]
  },
  "topCategories": [
    {"categoryName": "娱乐陪伴", "orderCount": 2000, "gmv": 1000000.00},
    {"categoryName": "运动陪伴", "orderCount": 1500, "gmv": 750000.00}
  ],
  "topCities": [
    {"cityName": "上海", "orderCount": 3000, "gmv": 1500000.00},
    {"cityName": "成都", "orderCount": 2000, "gmv": 1000000.00}
  ]
}
```

---

## 三、Database - 数据库设计

### 3.1 admins - 管理员表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| username | VARCHAR(50) | UNIQUE, NOT NULL | - | 用户名 |
| password_hash | VARCHAR(100) | NOT NULL | - | 密码哈希 |
| nickname | VARCHAR(50) | NOT NULL | - | 昵称 |
| avatar | VARCHAR(500) | - | - | 头像 |
| role | SMALLINT | NOT NULL | 1 | 角色：1运营/2超级管理员 |
| status | SMALLINT | NOT NULL | 1 | 状态：0禁用/1正常 |
| login_at | TIMESTAMP | - | - | 最后登录时间 |

### 3.2 admin_operation_logs - 管理员操作日志表

> 记录管理员的所有操作行为，用于审计和安全追溯

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| admin_id | UUID | FK → admins.id | - | 管理员ID |
| module | VARCHAR(50) | NOT NULL | - | 操作模块（user/consultant/order/complaint等） |
| action | VARCHAR(50) | NOT NULL | - | 操作类型（create/update/delete/approve/reject等） |
| target_type | VARCHAR(50) | - | - | 操作对象类型 |
| target_id | UUID | - | - | 操作对象ID |
| before_data | JSONB | - | - | 操作前数据（用于回溯） |
| after_data | JSONB | - | - | 操作后数据 |
| ip_address | VARCHAR(50) | - | - | 操作IP地址 |
| user_agent | VARCHAR(500) | - | - | 浏览器UA |
| remark | VARCHAR(500) | - | - | 操作备注 |

**索引：** `admin_id`, `module`, `action`, `(target_type, target_id)`, `created_at` (DESC)

**常见操作类型：**
| 模块 | 操作 | 说明 |
|------|------|------|
| user | ban/unban | 封禁/解封用户 |
| consultant | approve/reject | 审核顾问申请 |
| consultant | ban/unban | 封禁/解封顾问 |
| order | cancel/refund | 取消订单/退款 |
| complaint | handle | 处理投诉 |
| withdrawal | approve/reject | 审核提现 |
| system | config_update | 修改系统配置 |

### 3.3 system_configs - 系统配置表

> **说明**：`cities`（城市表）和`categories`（服务类目表）为共享表，定义见 `00-shared.md`，此处不再重复定义。

**初始数据（管理后台初始化）：**
```sql
-- 服务类目初始数据
INSERT INTO categories (name, icon, sort_order) VALUES
('娱乐陪伴', 'entertainment.png', 1),
('运动陪伴', 'sports.png', 2),
('情绪疏导', 'emotion.png', 3);

-- 城市初始数据
INSERT INTO cities (name, code, province, sort_order) VALUES
('上海', 'shanghai', '上海市', 1),
('成都', 'chengdu', '四川省', 2);
```

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| config_key | VARCHAR(100) | UNIQUE, NOT NULL | - | 配置键 |
| config_value | TEXT | NOT NULL | - | 配置值（JSON格式） |
| config_type | VARCHAR(50) | NOT NULL | - | 配置类型（string/number/decimal/boolean/json） |
| description | VARCHAR(200) | - | - | 配置说明 |
| validation_rule | JSONB | - | - | 验证规则（JSON格式，如：{"min": 0, "max": 1, "format": "decimal"}） |
| updated_by | UUID | FK → admins.id | - | 更新人 |
| updated_at | TIMESTAMP | NOT NULL | now() | 更新时间 |

**索引：** `config_key` (UNIQUE), `config_type`

**系统配置项枚举定义：**

| 配置键 | 配置类型 | 默认值 | 说明 | 验证规则 |
|--------|---------|--------|------|----------|
| `platform_fee_rate` | decimal | 0.15 | 平台抽佣比例（0-1之间的小数） | min: 0, max: 1 |
| `consultant_settlement_days` | number | 7 | 顾问待结算天数（天） | min: 1, max: 30 |
| `order_timeout_hours` | number | 12 | 订单超时取消时间（小时） | min: 1, max: 48 |
| `payment_timeout_minutes` | number | 30 | 支付超时时间（分钟） | min: 5, max: 120 |
| `order_auto_confirm_hours` | number | 24 | 订单自动确认时间（小时） | min: 1, max: 72 |
| `demand_expire_hours` | number | 24 | 需求过期时间（小时） | min: 1, max: 72 |
| `virtual_number_unbind_hours` | number | 48 | 虚拟号码解绑时间（小时） | min: 1, max: 168 |
| `location_cleanup_hours` | number | 24 | 位置数据清理时间（小时） | min: 1, max: 168 |
| `min_withdraw_amount` | decimal | 100.00 | 最小提现金额（元） | min: 10, max: 1000 |
| `max_withdraw_amount` | decimal | 50000.00 | 最大提现金额（元） | min: 1000, max: 100000 |
| `withdraw_fee_rate` | decimal | 0.00 | 提现手续费率（0-1之间的小数） | min: 0, max: 0.1 |
| `sms_provider` | string | "aliyun" | 短信服务商（aliyun/tencent） | enum: ["aliyun", "tencent"] |
| `virtual_number_provider` | string | "aliyun" | 虚拟号码服务商（aliyun/tencent） | enum: ["aliyun", "tencent"] |
| `sos_response_timeout_seconds` | number | 30 | SOS响应超时时间（秒） | min: 10, max: 300 |
| `location_report_interval_minutes` | number | 5 | 位置上报间隔（分钟） | min: 1, max: 30 |

**配置变更日志：**
- 配置变更时，自动记录到 `admin_operation_logs` 表
- `module` = 'system'
- `action` = 'config_update'
- `target_type` = 'system_config'
- `target_id` = 配置ID
- `before_data` = 变更前的配置值（JSON格式：`{"key": "platform_fee_rate", "value": "0.15"}`）
- `after_data` = 变更后的配置值（JSON格式：`{"key": "platform_fee_rate", "value": "0.20"}`）

### 3.4 permissions - 权限表

> **功能说明**：定义系统的所有权限，支持细粒度权限控制

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| name | VARCHAR(100) | NOT NULL | - | 权限名称 |
| code | VARCHAR(100) | UNIQUE, NOT NULL | - | 权限代码（格式：module:action） |
| module | VARCHAR(50) | NOT NULL | - | 模块名称（user/order/consultant/complaint等） |
| action | VARCHAR(50) | NOT NULL | - | 操作类型（view/manage/approve/reject等） |
| description | VARCHAR(200) | - | - | 权限描述 |

**索引：** `code` (UNIQUE), `module`, `action`

**权限代码命名规范：**
- 格式：`{module}:{action}`
- 模块名称：小写，单数形式（如：`user`、`order`、`consultant`）
- 操作类型：小写（如：`view`、`manage`、`approve`、`reject`、`delete`）

**常见权限代码示例：**
| 权限代码 | 说明 |
|---------|------|
| `user:view` | 查看用户 |
| `user:manage` | 用户管理（列表、详情、封禁/解封） |
| `consultant:view` | 查看顾问 |
| `consultant:manage` | 顾问管理（列表、详情、审核、封禁/解封） |
| `order:view` | 查看订单 |
| `order:manage` | 订单管理（列表、详情、取消、退款） |
| `complaint:view` | 查看投诉 |
| `complaint:handle` | 处理投诉 |
| `finance:view` | 查看财务 |
| `finance:withdraw` | 提现审核 |
| `system:config` | 系统配置管理 |
| `permission:manage` | 权限管理（仅超级管理员） |

### 3.5 role_permissions - 角色权限关联表

> **功能说明**：关联角色和权限，实现基于角色的权限控制（RBAC）

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| role | SMALLINT | NOT NULL | - | 角色：1运营/2超级管理员 |
| permission_id | UUID | FK → permissions.id | - | 权限ID |

**索引：** `(role, permission_id)` (UNIQUE), `role`, `permission_id`

**角色权限分配规则：**
- **运营（role=1）**：默认拥有除权限管理外的所有权限
- **超级管理员（role=2）**：拥有所有权限，包括权限管理

**初始权限分配（系统初始化）：**
```sql
-- 运营角色默认权限
INSERT INTO role_permissions (role, permission_id) 
SELECT 1, id FROM permissions WHERE code != 'permission:manage';

-- 超级管理员拥有所有权限
INSERT INTO role_permissions (role, permission_id) 
SELECT 2, id FROM permissions;
```

### 3.6 user_behavior_logs - 用户行为分析表

> **功能说明**：记录用户的关键行为，用于数据分析和用户画像

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| user_id | UUID | FK → users.id | - | 用户ID |
| behavior_type | VARCHAR(50) | NOT NULL | - | 行为类型（见枚举） |
| related_type | VARCHAR(50) | - | - | 关联资源类型（consultant/order/demand等） |
| related_id | UUID | - | - | 关联资源ID |
| behavior_data | JSONB | - | - | 行为数据（JSON格式，如：搜索关键词、筛选条件等） |
| ip_address | VARCHAR(50) | - | - | IP地址 |
| user_agent | VARCHAR(500) | - | - | 浏览器UA |

**索引：** `user_id`, `behavior_type`, `(related_type, related_id)`, `created_at` (DESC)

**行为类型枚举：**
| 行为类型 | 说明 | 关联资源类型 |
|---------|------|-------------|
| `view_consultant` | 查看顾问详情 | consultant |
| `view_consultant_list` | 查看顾问列表 | - |
| `search_consultant` | 搜索顾问 | - |
| `favorite_consultant` | 收藏顾问 | consultant |
| `unfavorite_consultant` | 取消收藏 | consultant |
| `block_consultant` | 屏蔽顾问 | consultant |
| `create_order` | 创建订单 | order |
| `cancel_order` | 取消订单 | order |
| `create_demand` | 发布需求 | demand |
| `apply_demand` | 申请接单 | demand |
| `create_review` | 发布评价 | review |
| `create_complaint` | 提交投诉 | complaint |
| `sos_alert` | 紧急求助 | order |
| `share_location` | 共享位置 | order |

**数据采集策略：**
- 前端埋点：在关键操作处调用行为记录接口
- 后端记录：在关键业务逻辑处自动记录行为
- 数据保留：行为数据保留6个月，超过6个月的数据迁移到归档表

---

## 四、技术实现

### 4.1 前端框架

**技术选型：** [vue-vben-admin](https://github.com/vbenjs/vue-vben-admin) v5.x

**核心特性：**
- **技术栈：** Vue3 + Vite + TypeScript + Monorepo（pnpm workspaces + TurboRepo）
- **核心UI层：** Shadcn UI + Tailwind CSS（v5.x 核心已切换到此，作为基础 UI 层）
- **业务组件适配：** 通过 monorepo 结构支持其他 UI 框架（Ant Design Vue、Naive UI、Element Plus）的业务组件适配
- **权限系统：** 动态路由权限、按钮级权限控制、菜单权限
- **主题系统：** 多主题支持（含暗色模式）、自定义主题色（基于 Tailwind CSS）
- **国际化：** 内置 i18n 支持，资源文件懒加载
- **Mock数据：** Nitro Mock 高性能本地 Mock 服务（开发环境）

**项目初始化：**
```bash
# 克隆 vue-vben-admin
git clone https://github.com/vbenjs/vue-vben-admin.git admin
cd admin

# 安装依赖（使用 pnpm）
npm install -g corepack
pnpm install

# 运行默认版本（基于 Shadcn UI + Tailwind CSS）
pnpm dev
# 或指定应用
pnpm dev:antd
```

**环境配置：**
- `.env.development`：开发环境配置（API 地址、Mock 开关等）
- `.env.production`：生产环境配置
- `VITE_GLOB_API_URL`：后端 API 地址（如：`http://localhost:3000/api`）

### 4.2 权限集成

**权限验证流程：**
1. 管理员登录后，调用 `/admin/auth/login` 获取 Token
2. 前端调用 `/admin/auth/me` 获取管理员信息和权限列表
3. 将权限列表存储到 Pinia store（`stores/permission.ts`）
4. 动态生成路由：根据权限列表过滤菜单路由
5. 按钮级权限：使用 `v-if` + 权限代码判断（如：`v-if="hasPermission('user:manage')"`）

**路由配置：**
- 路由定义在 `router/routes/` 目录
- 动态路由通过 `router/builder.ts` 根据权限生成
- 路由守卫在 `router/guard/` 目录（登录验证、权限验证）

**权限代码映射：**
- 前端权限代码需与后端 `permissions.code` 字段一致
- 格式：`{module}:{action}`（如：`user:manage`、`order:view`、`complaint:handle`）

### 4.3 API 集成

**API 封装：**
- API 接口定义在 `api/admin/` 目录
- 使用 Axios 封装，统一请求拦截器（Token 注入、错误处理）
- 响应拦截器处理统一错误码、Token 刷新

**请求示例：**
```typescript
// api/admin/user.ts
import { defHttp } from '@/utils/http/axios';

export function getUserList(params) {
  return defHttp.get({ url: '/admin/users', params });
}

export function getUserDetail(id: string) {
  return defHttp.get({ url: `/admin/users/${id}` });
}

export function updateUserStatus(id: string, status: number) {
  return defHttp.patch({ url: `/admin/users/${id}/status`, data: { status } });
}
```

### 4.4 页面开发

**页面结构：**
- 页面文件位于 `views/admin/` 目录
- 使用 Vue3 Composition API + `<script setup>`
- 列表页面使用 `Table` 组件，支持分页、筛选、排序
- 详情页面使用 `Descriptions` 组件展示数据

**开发规范：**
- 组件命名：PascalCase（如：`UserList.vue`）
- 路由路径：kebab-case（如：`/admin/users`）
- API 路径：与后端接口路径一致（如：`/admin/users`）

### 4.5 数据看板

**图表组件：**
- 使用 `echarts` 或 `@antv/g2plot` 进行数据可视化
- 看板数据通过 `/admin/dashboard` 接口获取
- 支持时间范围筛选（今日/本周/本月）

### 4.6 部署

**构建命令：**
```bash
# 构建默认版本（基于 Shadcn UI + Tailwind CSS）
pnpm build
# 或指定应用
pnpm build:antd

# 构建产物在 dist/ 目录
```

**部署配置：**
- 静态资源部署到 Nginx 或 CDN
- Nginx 配置反向代理到后端 API
- 支持动态配置（通过 `dist/_app.config.js` 修改 API 地址，无需重新构建）

**参考文档：**
- [vue-vben-admin 官方文档](https://doc.vben.pro/)
- [vue-vben-admin GitHub](https://github.com/vbenjs/vue-vben-admin)

---

> **文档更新记录**
> - v1.3 (2026-01-15)：补充数据统计分析（user_behavior_logs表、业务报表设计、数据分析API）
> - v1.2 (2026-01-15)：补充系统配置详细设计（配置项枚举、验证规则、变更日志）
> - v1.1 (2026-01-15)：补充管理员权限管理（permissions表、role_permissions表、权限验证Guard设计）
> - v1.0 (2026-01-07)：初稿，完成管理后台模块PRD/API/DB整合
