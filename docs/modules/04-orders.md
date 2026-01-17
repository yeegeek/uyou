# UYOU 无忧陪伴 - 订单模块

> 订单模块完整文档 | 包含PRD、API、数据库设计

---

## 一、PRD - 产品需求

### 1.1 功能清单

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 主动预约 | 选择情感顾问 → 填写需求 → 提交预约 | P0 |
| 订单确认 | 情感顾问接单后，用户确认并支付 | P0 |
| 订单状态追踪 | 待接单/已接单/进行中/待评价/已完成/已取消 | P0 |
| 取消订单 | 服务开始前可取消，按阶梯退款规则退款 | P0 |
| 服务完成确认 | 用户确认服务完成，触发结算 | P0 |

### 1.2 业务流程

**用户直接预约情感顾问流程：** 用户浏览情感顾问 → 查看详情 → 发起预约 → 填写需求（时间、地点、时长、备注）→ 提交预约（暂不支付）→ 情感顾问收到通知 → 接单/拒单（拒单通知用户订单关闭，12小时未响应自动过期）→ 接单后用户收到通知 → 用户确认并支付（微信支付，30分钟未支付订单自动取消，取消后顾问时段释放）→ 款项进入平台托管（资金池）→ 服务时间到达双方见面/开始服务 → 服务结束用户确认完成/24小时自动确认 → 用户评价（可选）+ 五星好评可打赏小费 → 佣金进入情感顾问待结算账户（扣除平台10%-15%）→ 7天后可提现到微信零钱

**订单状态机：** `pending_accept → (顾问接单) → pending_payment → (用户支付) → paid → (服务开始) → in_progress → (服务结束) → pending_confirm → completed`  
**其他状态：** `expired`（12h超时/拒单）、`cancelled`（30min超时/取消，自动退款，退款状态在payments表中独立管理）

**支付状态与订单状态同步机制：**
- 支付成功：订单状态`pending_payment → paid`，支付记录状态`pending → paid`，同步时机：微信支付回调成功后立即更新
- 支付失败：订单状态保持`pending_payment`，支付记录状态`pending → closed`，用户可重新发起支付
- 支付超时（30分钟未支付）：订单状态`pending_payment → cancelled`，支付记录状态`pending → closed`，订单自动取消，顾问时段释放
- 支付回调失败处理：重试机制（最多重试3次，每次间隔5分钟），最终失败订单状态回退到`pending_payment`，支付记录状态保持`pending`，需要人工处理

#### 取消订单退款流程

**退款流程说明：** 订单取消后订单状态统一为`cancelled`（已取消），退款状态在`payments`表中独立管理（`type=2`退款记录），退款自动处理（取消订单后自动调用微信退款API，无需人工审核），退款原路退回（退款金额原路退回用户微信账户）

**退款金额计算规则：**

**用户取消订单：**
- 服务未开始：根据阶梯退款规则（基于距服务开始时间）- 24小时以上100%，12-24小时50%，12小时内0%
- 服务进行中：按已服务时长比例扣除 - 已服务时长比例 = 实际服务时长 / 预约总时长，退款比例 = 1 - 已服务时长比例，最低退款金额：0（如果已服务超过50%，可能不退款）
- 退款金额 = 实付金额 × 退款比例（实付金额 = 订单总额 - 优惠金额，优惠券不退回）

**顾问取消订单：**
- 服务未开始：根据距服务开始时间 - 24小时以上用户退款100%扣信用分5分，12-24小时用户退款100%扣信用分10分，12小时内用户退款100%扣信用分20分
- 服务进行中：按已服务时长比例扣除，用户全额退款（退款金额 = 实付金额 × 100%），顾问处罚扣信用分30分+警告
- 取消后推荐相似顾问给用户（补偿体验）

**取消规则说明：** 服务未开始可以取消按阶梯退款规则退款，服务进行中可以取消按已服务时长比例扣除退款，服务已完成不可取消

**退款状态流转：** `status=0`处理中（退款申请已提交，等待微信处理），`status=1`已退款（微信退款成功，原路退回用户微信），`status=2`退款失败（微信退款失败，需要人工处理）

### 1.3 页面清单

| 模块 | 页面路径 | 说明 |
|------|---------|------|
| 订单流程 | /pages/order/{create,confirm,list,detail,review} | 预约、支付、订单管理、评价 |

---

## 二、API - 接口设计

**说明：** 订单只能通过以下方式创建：1. 用户发布需求并指定顾问 → 顾问接受需求 → 自动生成订单，2. 用户发布需求（不指定顾问）→ 顾问申请 → 用户选择顾问 → 自动生成订单。订单创建后，用户需在指定时间内完成支付，否则订单自动取消。

**需求状态与订单状态的关联规则：** 订单创建后关联需求状态更新为`confirmed`（已确认，已生成订单）。订单取消后的需求状态回退规则：如果订单在`pending_accept`或`pending_payment`阶段取消，需求状态回退到`pending`（可重新匹配），需求释放到需求大厅，其他顾问可申请；如果订单在`paid`之后取消，需求状态保持`confirmed`（已生成订单，不再匹配），需求不再释放到大厅，避免重复匹配

**订单状态枚举：**
| 值 | 状态码 | 说明 |
|----|--------|------|
| 0 | pending_accept | 待接单 |
| 1 | pending_payment | 待支付（顾问已接单，用户需30分钟内支付） |
| 2 | paid | 已支付，待服务 |
| 3 | in_progress | 服务中 |
| 4 | pending_confirm | 待确认完成 |
| 5 | completed | 已完成 |
| 6 | cancelled | 已取消（包含已退款情况，退款状态在payments表中管理） |
| 7 | refunded | 已退款（保留用于历史兼容，新订单统一使用cancelled） |
| 8 | expired | 已过期（12小时顾问未接单自动过期） |

**说明：** `cancelled`状态包含已取消和已退款两种情况，退款状态在`payments`表中独立管理（`type=2`退款，`status`字段），通过订单详情中的`refundInfo`字段区分是否有退款及退款状态

### 2.1 获取订单列表

**GET** `/orders`

**查询参数：**
- `status` (optional) - 订单状态
- `role` (optional) - user/consultant（用户端/顾问端）
- `nextPage`, `pageSize`

**响应：**
```json
{
  "orders": [ ... ],
  "pagination": { ... }
}
```

### 2.2 获取订单详情

**GET** `/orders/:id`

**响应：**
```json
{
  "id": "order_id",
  "orderNo": "ORD202601150001",
  "status": 2,
  "consultant": {
    "id": "consultant_id",
    "nickname": "顾问昵称",
    "avatar": "头像URL",
    "phone": "138****8888"
  },
  "category": {
    "id": "category_id",
    "name": "运动陪伴"
  },
  "serviceMode": 1,
  "scheduledStart": "2026-01-15T14:00:00Z",
  "scheduledEnd": "2026-01-15T18:00:00Z",
  "duration": 240,
  "totalAmount": 400.00,
  "platformFee": 48.00,
  "consultantIncome": 352.00,
  "serviceAddress": "服务地址",
  "userRemark": "用户备注",
  "snapshotData": { ... },
  "refundInfo": {
    "refundAmount": 400.00,
    "refundStatus": 1,
    "refundAt": "2026-01-15T11:00:00Z",
    "refundReason": "24小时以上取消，退款100%"
  },
  "createdAt": "2026-01-15T10:00:00Z",
}
```

**说明：** `refundInfo`字段仅在订单状态为`cancelled`且有退款记录时返回，`refundStatus`：0处理中/1已退款/2退款失败（对应payments表中的退款状态）

### 2.3 顾问接单

**POST** `/orders/:id/accept`

**响应：**
```json
{
  "orderId": "order_id",
  "status": 1,
  "paymentExpireAt": "2026-01-15T10:30:00Z",
}
```

### 2.4 顾问拒单

**POST** `/orders/:id/reject`

**请求：**
```json
{
  "reason": "拒单原因"
}
```

### 2.5 取消订单

**POST** `/orders/:id/cancel`

**请求：**
```json
{
  "reason": "取消原因"
}
```

**响应：**
```json
{
  "orderId": "order_id",
  "status": 6,
  "refundAmount": 400.00,
  "refundStatus": 0,
  "refundReason": "24小时以上取消，退款100%",
  "refundPolicy": {
    "timeRange": "24小时以上",
    "refundRate": 1.0,
    "description": "服务开始前24小时以上取消，全额退款"
  },
  "message": "退款申请已提交，正在处理中"
}
```

**说明：** 退款规则（基于距服务开始时间）：用户取消（24小时以上100%，12-24小时50%，12小时内0%），顾问取消（无论时间均退款100%，但会扣除顾问信用分：24h以上扣5分，12-24h扣10分，12h内扣20分）。退款金额计算：退款金额 = 实付金额 × 退款比例，实付金额 = 订单总额 - 优惠金额，优惠券不退回（已在支付时使用）。退款状态：`refundStatus=0`处理中，`refundStatus=1`已退款，`refundStatus=2`退款失败。退款流程：取消订单后自动创建退款记录并调用微信退款API，无需人工审核

### 2.6 开始服务（顾问打卡）

**POST** `/orders/:id/start`

**响应：**
```json
{
  "orderId": "order_id",
  "status": 3,
  "actualStart": "2026-01-15T14:00:00Z",
}
```

### 2.7 结束服务（顾问打卡）

**POST** `/orders/:id/end`

### 2.8 确认完成（用户确认）

**POST** `/orders/:id/complete`

**响应：**
```json
{
  "orderId": "order_id",
  "status": 4,
  "settlementAt": "2026-01-22T14:00:00Z",
}
```

---

## 三、Database - 数据库设计

### 3.1 orders - 订单表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| order_no | VARCHAR(32) | UNIQUE, NOT NULL | - | 订单号 |
| user_id | UUID | FK → users.id, NOT NULL | - | 用户ID |
| consultant_id | UUID | FK → consultants.id, NOT NULL | - | 顾问ID |
| category_id | UUID | FK → categories.id | - | 服务类目ID |
| service_mode | SMALLINT | NOT NULL | 1 | 服务模式：1线下/2线上视频/3线上语音 |
| city_id | UUID | FK → cities.id | - | 服务城市 |
| service_address | VARCHAR(200) | - | - | 服务地址（线下） |
| service_location | GEOGRAPHY(Point, 4326) | - | - | 服务坐标（线下，WGS84） |
| scheduled_start | TIMESTAMP | NOT NULL | - | 预约开始时间 |
| scheduled_end | TIMESTAMP | NOT NULL | - | 预约结束时间 |
| duration | INTEGER | NOT NULL | - | 服务时长（分钟） |
| unit_price | DECIMAL(10,2) | NOT NULL | - | 单价（元/小时） |
| total_amount | DECIMAL(10,2) | NOT NULL | - | 订单总额 |
| platform_fee | DECIMAL(10,2) | NOT NULL | - | 平台服务费 |
| consultant_income | DECIMAL(10,2) | NOT NULL | - | 顾问收入 |
| user_remark | VARCHAR(500) | - | - | 用户备注 |
| demand_id | UUID | FK → demands.id | - | 关联需求ID（从需求创建的订单） |
| coupon_id | UUID | FK → user_coupons.id | - | 使用的优惠券ID（可选） |
| discount_amount | DECIMAL(10,2) | NOT NULL | 0.00 | 优惠金额 |
| pay_amount | DECIMAL(10,2) | NOT NULL | - | 实付金额（total_amount - discount_amount） |
| snapshot_data | JSONB | - | - | 下单时快照（顾问信息、服务描述等） |
| cancellation_policy_snapshot | JSONB | - | - | 下单时退款政策快照 |
| status | SMALLINT | NOT NULL | 0 | 状态（见下方枚举） |
| cancel_reason | VARCHAR(200) | - | - | 取消原因 |
| cancel_by | SMALLINT | - | - | 取消方：1用户/2顾问/3平台 |
| refund_amount | DECIMAL(10,2) | - | 0.00 | 退款金额（冗余字段，从payments表同步） |
| refund_status | SMALLINT | - | - | 退款状态（冗余字段，从payments表同步）：0处理中/1已退款/2退款失败 |
| refund_at | TIMESTAMP | - | - | 退款完成时间（冗余字段，从payments表同步） |
| actual_start | TIMESTAMP | - | - | 实际开始时间 |
| actual_end | TIMESTAMP | - | - | 实际结束时间 |
| completed_at | TIMESTAMP | - | - | 完成时间 |

**订单状态枚举：**
| 值 | 状态码 | 说明 | 可执行操作 |
|----|--------|------|-----------|
| 0 | pending_accept | 待接单 | 顾问接单/拒单，用户取消 |
| 1 | pending_payment | 待支付 | 用户支付，30min超时取消 |
| 2 | paid | 已支付，待服务 | 用户/顾问取消（按规则） |
| 3 | in_progress | 服务中 | 顾问打卡结束，紧急求助 |
| 4 | pending_confirm | 待确认完成 | 用户确认完成，24h自动确认 |
| 5 | completed | 已完成 | 评价、打赏、投诉 |
| 6 | cancelled | 已取消 | 查看取消原因和退款信息（退款状态在payments表中管理） |
| 7 | refunded | 已退款 | 保留用于历史兼容，新订单统一使用cancelled |
| 8 | expired | 已过期 | 无（12h顾问未接单自动过期） |

**退款状态说明：**
- 退款状态在`payments`表中独立管理（`type=2`退款记录，`status`字段）
- 订单表的`refund_amount`、`refund_status`、`refund_at`字段为冗余字段，用于快速查询
- 实际退款数据以`payments`表为准，订单表字段从`payments`表同步更新

**索引：** `order_no` (UNIQUE), `user_id`, `consultant_id`, `status`, `scheduled_start`, `created_at` (DESC), `(user_id, status)`, `(consultant_id, status)`

**snapshot_data 字段JSON格式说明：**
> 存储下单时顾问的快照信息，用于历史追溯，避免顾问后续修改信息导致"货不对板"纠纷

```json
{
  "consultant": {
    "nickname": "小美",
    "avatar": "https://...",
    "intro_text": "我是一个阳光开朗的...",
    "avg_rating": 4.8,
    "total_orders": 128,
    "credit_score": 95
  },
  "service": {
    "category_name": "运动陪伴",
    "service_mode": 1,
    "description": "陪跑步、健身、打球",
    "price": 100
  }
}
```

### 3.2 order_status_logs - 订单状态变更日志表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| order_id | UUID | FK → orders.id | - | 订单ID |
| from_status | SMALLINT | - | - | 原状态 |
| to_status | SMALLINT | NOT NULL | - | 新状态 |
| operator_type | SMALLINT | NOT NULL | - | 操作者类型：1用户/2顾问/3系统/4管理员 |
| operator_id | UUID | - | - | 操作者ID |
| remark | VARCHAR(200) | - | - | 备注 |

**索引：** `order_id`

### 3.3 order_insurance - 订单保险记录表

> 记录线下服务订单的保险状态，对应PRD中"人身意外险"需求

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| order_id | UUID | FK → orders.id, UNIQUE | - | 订单ID |
| policy_no | VARCHAR(64) | - | - | 保险单号（第三方保险公司） |
| insurance_type | SMALLINT | NOT NULL | 1 | 保险类型：1人身意外险/2财产险 |
| insured_id | UUID | FK → users.id | - | 被保险人ID（通常是顾问） |
| beneficiary_id | UUID | FK → users.id | - | 受益人ID |
| coverage_amount | DECIMAL(12,2) | NOT NULL | - | 保额（元） |
| premium | DECIMAL(10,2) | NOT NULL | 0 | 保费（元，可能由平台承担） |
| start_at | TIMESTAMP | NOT NULL | - | 保险生效开始时间 |
| end_at | TIMESTAMP | NOT NULL | - | 保险生效结束时间 |
| status | SMALLINT | NOT NULL | 0 | 状态：0待生效/1已生效/2已过期/3已理赔 |

**索引：** `order_id` (UNIQUE), `status`
