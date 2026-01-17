# UYOU 无忧陪伴 - 共享文档

> 通用规范与设计原则 | 所有模块共用

---

## 一、API设计规范

### 1.1 RESTful规范

- URL命名：小写+连字符，复数形式（如 `/users`, `/orders`）
- HTTP方法：GET查询、POST创建、PUT完整更新、PATCH部分更新、DELETE删除
- 状态码：遵循HTTP标准状态码

### 1.2 统一响应格式

**成功响应（列表）：**
```json
{
  "demands": [ ... ],
  "pagination": { "nextPage": 2, "pageSize": 20, "hasMore": true }
}
```

**成功响应（单个对象）：**
```json
{
  "id": "order_id",
  "orderNo": "ORD202601150001",
  "status": 2
}
```

**错误响应：**
```json
{
  "code": "INVALID_PARAM",
  "message": "手机号格式不正确",
  "details": "手机号必须为11位数字"
}
```

**说明：**
- HTTP状态码直接表示请求结果（200成功，400参数错误，401未授权等）
- 响应体直接返回数据，无`data`包裹层
- 列表接口：`{资源名复数: [], pagination: {}}`
- 单个资源：`{资源字段...}`
- 错误响应：HTTP 400/401/403等，响应体 `{code, message, details}`
- Debug模式：请求头 `X-Debug: true` 时返回 `_debug: {memoryUsage, responseTime, timestamp}`

### 1.3 认证方式

```
Authorization: Bearer {jwt_token}
```

### 1.4 HTTP状态码与错误码

**HTTP状态码：** 200成功、400参数错误、401未授权、403无权限、404资源不存在、409资源冲突、422业务逻辑错误、500服务器错误

**错误码命名规范：** `{MODULE}_{ERROR_TYPE}`（如：`AUTH_INVALID_TOKEN`、`ORDER_NOT_FOUND`）

**业务错误码：**

| 模块 | 错误码 | HTTP | 说明 |
|------|--------|------|------|
| AUTH | `AUTH_INVALID_TOKEN` | 401 | Token无效 |
| AUTH | `AUTH_TOKEN_EXPIRED` | 401 | Token已过期 |
| AUTH | `AUTH_PERMISSION_DENIED` | 403 | 权限不足 |
| USER | `USER_NOT_FOUND` | 404 | 用户不存在 |
| USER | `USER_BLOCKED` | 403 | 用户已被屏蔽 |
| ORDER | `ORDER_NOT_FOUND` | 404 | 订单不存在 |
| ORDER | `ORDER_STATUS_ERROR` | 422 | 订单状态错误 |
| ORDER | `ORDER_TIME_CONFLICT` | 422 | 订单时间冲突 |
| PAYMENT | `PAYMENT_NOT_FOUND` | 404 | 支付记录不存在 |
| PAYMENT | `PAYMENT_FAILED` | 422 | 支付失败 |
| PAYMENT | `PAYMENT_REFUND_FAILED` | 422 | 退款失败 |
| DEMAND | `DEMAND_NOT_FOUND` | 404 | 需求不存在 |
| DEMAND | `DEMAND_STATUS_ERROR` | 422 | 需求状态错误 |
| CONSULTANT | `CONSULTANT_NOT_FOUND` | 404 | 顾问不存在 |
| CONSULTANT | `CONSULTANT_NOT_APPROVED` | 422 | 顾问未审核通过 |
| CONSULTANT | `CONSULTANT_CREDIT_LOW` | 422 | 顾问信用分过低 |
| COMMON | `INVALID_PARAM` | 400 | 参数格式错误 |
| COMMON | `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 |

---

## 二、数据库设计原则

### 2.1 命名规范

- 表名：小写+下划线，复数形式（如 `users`, `orders`）
- 字段名：小写+下划线（如 `created_at`, `user_id`）
- 主键：统一使用 `id`，类型为 `UUID`
- 外键：`关联表单数_id`（如 `user_id`, `order_id`）

### 2.2 通用字段

所有表默认包含：`id` (UUID, PK)、`created_at` (TIMESTAMP)、`updated_at` (TIMESTAMP)、`deleted_at` (TIMESTAMP, 可选)

### 2.3 索引策略

- 主键自带索引，外键字段建立索引
- 常用查询条件字段建立索引，联合查询建立复合索引
- 索引说明采用简洁格式：`字段名 (类型, 条件)`

### 2.4 数据安全

**敏感数据加密：** users.phone、user_verifications.real_name、user_verifications.id_card_no 使用 AES-256 加密

**数据脱敏规则：**
- 日志脱敏：手机号`138****8000`、身份证号`310101****1234`、真实姓名`张*`
- API响应脱敏：用户列表/详情、订单详情、投诉详情自动脱敏
- 管理员查看敏感信息：记录到 `privacy_access_logs` 表

**数据备份策略：**
- 全量备份：每天凌晨2点，保留30天
- 增量备份：每6小时，使用WAL归档
- 备份文件存储到OSS/COS
- 每月进行备份恢复测试

### 2.5 状态枚举值规范

**通用状态值：** 0初始/待处理、1正常/进行中、2已完成/已处理、3已取消/已拒绝、4+业务特定状态

**定义格式：** 使用表格形式，状态码使用小写+下划线（snake_case）

**使用规范：**
- 数据库存储：SMALLINT类型，存储数字状态值
- API响应：返回数字状态值，前端映射显示文本
- 代码实现：使用TypeScript枚举类型

**示例（订单状态）：**
| 值 | 状态码 | 说明 |
|----|--------|------|
| 0 | pending_accept | 待接单 |
| 1 | pending_payment | 待支付 |
| 2 | paid | 已支付，待服务 |
| 3 | in_progress | 服务中 |
| 4 | pending_confirm | 待确认完成 |
| 5 | completed | 已完成 |
| 6 | cancelled | 已取消 |
| 7 | refunded | 已退款 |
| 8 | expired | 已过期 |

---

## 三、技术实现细节

### 3.1 分布式锁

**使用场景：** 订单创建/接单/支付/取消、钱包操作、需求匹配

**实现方式：** Redis `SET key value NX EX timeout`，推荐使用 `@nestjs/bull`

| 场景 | 锁Key | 超时时间 |
|------|-------|---------|
| 订单创建 | `lock:order:create:{user_id}` | 5秒 |
| 订单接单 | `lock:order:accept:{order_id}` | 3秒 |
| 订单支付 | `lock:order:pay:{order_id}` | 10秒 |
| 需求匹配 | `lock:demand:match:{demand_id}` | 10秒 |

### 3.2 消息队列

**使用场景：** 通知推送（高优先级）、匹配算法（中优先级）、数据统计（低优先级）

**实现方式：** `@nestjs/bull` + Redis，支持任务重试、延迟执行、优先级队列

### 3.3 缓存策略

| 数据类型 | 缓存Key | 过期时间 |
|---------|---------|---------|
| 用户信息 | `user:{user_id}` | 30分钟 |
| 顾问信息 | `consultant:{consultant_id}` | 30分钟 |
| 城市/类目列表 | `cities:list`, `categories:list` | 24小时 |
| 需求匹配结果 | `demand:match:{demand_id}` | 5分钟 |
| 推荐顾问列表 | `consultant:recommended:{cityId}:{categoryId}:{page}:{pageSize}` | 5分钟 |
| 订单详情 | `order:{order_id}` | 10分钟 |

**更新策略：** 失效更新（数据变更时删除缓存）、主动更新、预热缓存

### 3.4 定时任务

**实现方式：** `@nestjs/schedule` 的 `@Cron()`、`@Interval()`、`@Timeout()` 装饰器

| 任务 | Cron表达式 | 说明 |
|------|-----------|------|
| 订单超时取消 | `*/5 * * * *` | 每5分钟检查12小时未接单 |
| 订单支付超时 | `*/1 * * * *` | 每分钟检查30分钟未支付 |
| 订单自动确认 | `0 */1 * * *` | 每小时检查24小时未确认 |
| 待结算金额结算 | `0 0 * * *` | 每天0点结算7天前金额 |
| 需求过期处理 | `*/10 * * * *` | 每10分钟检查过期需求 |
| 虚拟号码绑定重试 | `*/5 * * * *` | 每5分钟重试绑定失败 |
| 虚拟号码自动解绑 | `0 */1 * * *` | 每小时解绑48小时后订单 |
| 位置数据清理 | `0 2 * * *` | 每天凌晨2点清理24小时后数据 |
| 任务执行日志清理 | `0 3 * * *` | 每天凌晨3点清理30天前日志 |

**分布式锁：** 多实例部署时使用Redis锁 `lock:scheduled_task:{task_name}`，超时时间=任务执行时间+5分钟

**失败重试：** 最多3次，指数退避（1分钟、5分钟、15分钟），3次失败后告警

**日志记录：** `task_execution_logs` 表记录执行状态、时长、结果，保留30天

### 3.5 幂等性处理

**需要保证幂等性的接口：** 订单创建/支付/取消、钱包充值

**实现方式：** Redis存储幂等Key `idempotency:{action}:{id}`，设置过期时间，存在则返回上次结果

### 3.6 并发控制

| 场景 | 控制方式 |
|------|---------|
| 订单抢单 | 分布式锁 + 数据库乐观锁 |
| 需求匹配 | 分布式锁 |
| 钱包扣款 | 分布式锁 + 数据库事务 |
| 库存扣减 | 数据库悲观锁 `SELECT ... FOR UPDATE` |

**实现方式：** 分布式锁（Redis）、乐观锁（version字段）、悲观锁（FOR UPDATE）

### 3.7 统一推送服务

**推送服务职责：** 封装微信小程序推送、APP推送、短信推送，统一失败重试和日志记录

**推送类型：**
- 系统通知（`11-notifications.md`）：订单状态变更、需求匹配等业务事件，单向推送
- 消息通知（`08-communication.md`）：用户与顾问实时通讯，通过腾讯云IM实现

**实现方式：** 创建统一推送服务模块 `src/common/push.service.ts`，各模块调用统一服务

### 3.8 接口限流策略

**实现方式：** `@nestjs/throttler` + Redis，基于IP或用户ID限流

| 接口类型 | 限流规则 |
|---------|---------|
| 登录接口 | 5次/分钟 |
| 支付接口 | 10次/分钟 |
| 提现接口 | 5次/分钟 |
| 查询接口 | 100次/分钟 |
| 创建订单 | 20次/分钟 |
| 其他接口 | 60次/分钟 |

**限流Key：** `throttle:ip:{ip_address}:{endpoint}` 或 `throttle:user:{user_id}:{endpoint}`

**错误响应：** HTTP 429，响应体 `{code: "RATE_LIMIT_EXCEEDED", message, details: {limit, remaining, resetAt}}`

---

## 四、数据格式规范

### 4.1 日期时间

- 格式：ISO 8601 (`2026-01-15T14:00:00Z`)
- 时区：UTC

### 4.2 金额

- 单位：元（人民币）
- 精度：2位小数
- 格式：`DECIMAL(10,2)`

### 4.3 地理位置

```json
{ "lat": 31.2304, "lng": 121.4737 }
```

### 4.4 分页参数

**请求参数：**
- `nextPage`: 下一页标识（页码分页：数字从1开始；游标分页：上一页最后一条记录的id）
- `pageSize`: 每页数量（默认20，最大100）

**响应格式：**
```json
{
  "pagination": {
    "nextPage": 2,
    "pageSize": 20,
    "hasMore": true
  }
}
```

**使用说明：**
- 页码分页：适用于管理后台，首次请求 `nextPage=null` 或 `1`，后续请求使用返回的 `nextPage`
- 游标分页：适用于小程序列表，首次请求 `nextPage=null`，后续请求使用上一页最后一条记录的id

---

## 五、共享数据表定义

### 5.1 cities - 城市表

> 共享表，所有模块统一使用此表定义

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| name | VARCHAR(50) | NOT NULL | - | 城市名称 |
| code | VARCHAR(20) | UNIQUE, NOT NULL | - | 城市编码 |
| province | VARCHAR(50) | - | - | 省份 |
| location | GEOGRAPHY(Point, 4326) | - | - | 城市中心坐标（WGS84） |
| is_enabled | BOOLEAN | NOT NULL | true | 是否开通 |
| sort_order | INTEGER | NOT NULL | 0 | 排序 |

**索引：** `code` (UNIQUE), `is_enabled`, `sort_order`, `location` (GIST)

### 5.2 categories - 服务类目表

> 共享表，所有模块统一使用此表定义

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| name | VARCHAR(50) | UNIQUE, NOT NULL | - | 类目名称 |
| icon | VARCHAR(500) | - | - | 图标URL |
| description | VARCHAR(200) | - | - | 类目描述 |
| sort_order | INTEGER | NOT NULL | 0 | 排序 |
| is_enabled | BOOLEAN | NOT NULL | true | 是否启用 |

**索引：** `name` (UNIQUE), `is_enabled`, `sort_order`

**引用说明：** 其他模块使用 `city_id` 或 `category_id` 字段关联，不要重复定义
