# UYOU 无忧陪伴 - 支付模块

> 支付模块完整文档 | 包含PRD、API、数据库设计

---

## 一、PRD - 产品需求

### 1.1 功能清单

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 支付订单 | 微信支付 | P0 |
| 退款 | 取消订单后按规则退款（原路退回微信） | P0 |
| 消费记录 | 查看历史消费记录 | P1 |
| 收入概览 | 今日收入、本周收入、累计收入（顾问） | P0 |
| 收入明细 | 每笔订单的收入详情（顾问） | P0 |
| 待结算金额 | 服务完成后进入7天待结算期（顾问） | P0 |
| 提现 | 提现到微信零钱（顾问） | P0 |
| 提现记录 | 历史提现记录（顾问） | P1 |

**用户支付说明：** 支付方式仅支持微信支付，优惠券类型：新人券、满减券、折扣券、指定类目券，支付优先级：优惠券 → 微信支付，退款规则：原路退回微信（按订单取消规则），用户无钱包余额：所有消费和退款直接通过微信

### 1.2 业务流程

**支付流程（见订单模块）：** 订单创建后，用户需在指定时间内完成支付，否则订单自动取消

**支付状态与订单状态同步机制：** 支付成功（订单状态`pending_payment → paid`，支付记录状态`pending → paid`，同步时机：微信支付回调成功后立即更新），支付失败（订单状态保持`pending_payment`，支付记录状态`pending → closed`，用户可重新发起支付），支付超时（30分钟未支付，订单状态`pending_payment → cancelled`，支付记录状态`pending → closed`，订单自动取消，顾问时段释放），支付回调失败处理（重试机制最多重试3次每次间隔5分钟，最终失败订单状态回退到`pending_payment`，支付记录状态保持`pending`，需要人工处理）

**退款流程：** 订单取消 → 系统计算退款金额（按订单取消规则）→ 创建退款记录（payments表，type=2，status=0处理中）→ 自动调用微信退款API（原路退回用户微信）→ 退款回调更新退款状态（status=1已退款：退款成功，status=2退款失败：退款失败需要人工处理）→ 同步更新订单退款信息（refund_amount, refund_status, refund_at）

**退款状态流转：** `status=0`处理中（退款申请已提交，等待微信处理），`status=1`已退款（微信退款成功，原路退回用户微信），`status=2`退款失败（微信退款失败，需要人工处理）

**退款金额计算：** 退款金额 = 实付金额 × 退款比例，实付金额 = 订单总额 - 优惠金额，优惠券不退回（已在支付时使用）

**结算流程：** 订单完成 → 佣金进入情感顾问待结算账户（扣除平台10%-15%）→ 7天后自动结算 → 进入可用余额 → 顾问申请提现 → 审核通过 → 微信付款

---

## 二、API - 接口设计

### 2.1 创建支付

**POST** `/payments`

**请求：**
```json
{
  "orderId": "order_id",
  "paymentMethod": 1, // 1微信支付（仅支持微信支付）
  "couponId": "coupon_id" // 可选
}
```

**响应：**
```json
{
  "paymentId": "payment_id",
  "paymentNo": "PAY202601150001",
  "amount": 380.00,
  "discountAmount": 20.00,
  "paymentMethod": 1,
  "wxPayParams": {
    "timeStamp": "1704067200",
    "nonceStr": "random_string",
    "package": "prepay_id=wx...",
    "signType": "RSA",
    "paySign": "signature"
  }
}
```

### 2.2 查询支付状态

**GET** `/payments/:id/status`

**响应：**
```json
{
  "status": 1,
  "amount": 380.00,
  "completedAt": "2026-01-15T10:05:00Z"
}
```

**支付状态枚举：**
| 值 | 状态码 | 说明 |
|----|--------|------|
| 0 | pending | 待支付 |
| 1 | paid | 已支付 |
| 2 | closed | 已关闭（超时/取消） |

**说明：** `type=1`（订单支付）和 `type=2`（打赏）共用此状态枚举，`status=1` 表示支付成功，此时 `completedAt` 有值

### 2.3 获取消费记录（用户端）

**GET** `/payments/records`

**查询参数：**
- `type` (optional) - 1支付/2退款
- `nextPage`, `pageSize`

**响应：**
```json
{
  "records": [
    {
      "id": "payment_id",
      "type": 1,
      "amount": 380.00,
      "orderId": "order_id",
      "orderNo": "ORD202601150001",
      "status": 1,
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

**说明：** 用户端仅显示支付和退款记录，用户无钱包余额，所有消费和退款直接通过微信

### 2.4 查询订单退款详情

**GET** `/payments/refunds/:orderId`

**响应：**
```json
{
  "id": "payment_id",
  "paymentNo": "REF202601150001",
  "orderId": "order_id",
  "orderNo": "ORD202601150001",
  "amount": 400.00,
  "status": 1,
  "reason": "24小时以上取消，退款100%",
  "refundPolicy": {
    "timeRange": "24小时以上",
    "refundRate": 1.0,
    "description": "服务开始前24小时以上取消，全额退款"
  },
  "wxTransactionId": "wx_refund_transaction_id",
  "completedAt": "2026-01-15T11:00:00Z",
  "createdAt": "2026-01-15T10:30:00Z"
}
```

**退款状态枚举：**
| 值 | 状态码 | 说明 |
|----|--------|------|
| 0 | processing | 处理中（退款申请已提交，等待微信处理） |
| 1 | refunded | 已退款（微信退款成功，原路退回用户微信） |
| 2 | failed | 退款失败（微信退款失败，需要人工处理） |

**说明：** 仅订单状态为`cancelled`且有退款记录时返回数据，退款状态与`payments`表中的`status`字段对应（`type=2`退款记录）

---

## 2.5 顾问端钱包功能

### 2.5.1 获取钱包信息（顾问端）

**GET** `/consultants/wallet`

**响应：**
```json
{
  "balance": 1000.00,
  "pendingSettlement": 500.00,
  "availableBalance": 1500.00,
  "totalIncome": 5000.00,
  "totalWithdrawn": 2000.00
}
```

**说明：** `balance`已结算余额（可提现），`pendingSettlement`待结算金额（订单完成后7天才能结算），`availableBalance`可用余额（balance + pendingSettlement），`totalIncome`累计收入，`totalWithdrawn`累计提现

### 2.5.2 获取钱包流水（顾问端）

**GET** `/consultants/wallet/transactions`

**查询参数：**
- `type` (optional) - 1收入待结算/2结算到账/3打赏收入/4提现申请/5退款扣除
- `nextPage`, `pageSize`

**响应：**
```json
{
  "transactions": [ ... ],
  "pagination": { ... }
}
```

---

## 三、Database - 数据库设计

### 3.1 payments - 支付记录表

> 包含支付和退款信息，退款是支付的逆向操作

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| payment_no | VARCHAR(32) | UNIQUE, NOT NULL | - | 支付/退款单号 |
| type | SMALLINT | NOT NULL | 1 | 类型：1支付/2退款 |
| order_id | UUID | FK → orders.id | - | 订单ID |
| tip_id | UUID | FK → tips.id | - | 打赏ID（打赏支付时） |
| user_id | UUID | FK → users.id | - | 用户ID |
| amount | DECIMAL(10,2) | NOT NULL | - | 金额 |
| payment_method | SMALLINT | NOT NULL | 1 | 支付方式：1微信支付（仅支持微信支付） |
| wx_transaction_id | VARCHAR(64) | - | - | 微信交易号 |
| related_payment_id | UUID | FK → payments.id | - | 关联支付ID（退款时指向原支付） |
| status | SMALLINT | NOT NULL | 0 | 状态（见下方枚举） |
| reason | VARCHAR(200) | - | - | 退款原因（退款时） |
| completed_at | TIMESTAMP | - | - | 完成时间 |

**状态枚举：**
| type=1（支付） | type=2（退款） |
|---------------|---------------|
| 0待支付 | 0处理中（退款申请已提交，等待微信处理） |
| 1已支付 | 1已退款（微信退款成功，原路退回用户微信） |
| 2已关闭 | 2退款失败（微信退款失败，需要人工处理） |

**退款状态流转说明：**
- 订单取消后，自动创建退款记录（`type=2`，`status=0`处理中）
- 自动调用微信退款API，等待微信处理
- 微信退款回调后，更新退款状态：
  - 退款成功：`status=1`已退款，同步更新订单表的`refund_status`和`refund_at`
  - 退款失败：`status=2`退款失败，需要人工处理

**索引：** `payment_no` (UNIQUE), `order_id`, `user_id`, `type`, `status`, `(user_id, status)`, `(order_id, status)`

### 3.2 wallets - 钱包表（仅顾问使用）

> **重要说明**：用户不需要钱包，所有消费和退款直接通过微信支付。钱包表仅用于顾问的收入和提现。

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| user_id | UUID | FK → users.id, UNIQUE | - | 用户ID（仅顾问有记录） |
| balance | DECIMAL(10,2) | NOT NULL | 0.00 | 已结算余额（可提现） |
| pending_amount | DECIMAL(10,2) | NOT NULL | 0.00 | 待结算金额（7天后到账） |
| total_income | DECIMAL(10,2) | NOT NULL | 0.00 | 累计收入 |
| total_withdrawn | DECIMAL(10,2) | NOT NULL | 0.00 | 累计提现 |

**索引：** `user_id` (UNIQUE)

**说明：** 仅顾问用户有钱包记录（`is_consultant = true`），普通用户无钱包记录，所有消费和退款直接通过微信支付

### 3.3 wallet_transactions - 钱包流水表（仅顾问使用）

> 记录顾问钱包的所有变动，包含：收入、结算、提现、退款扣除
> **说明**：仅顾问有钱包流水，普通用户无钱包流水

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| transaction_no | VARCHAR(32) | UNIQUE, NOT NULL | - | 流水号 |
| wallet_id | UUID | FK → wallets.id | - | 钱包ID |
| type | SMALLINT | NOT NULL | - | 类型（见下方枚举） |
| amount | DECIMAL(10,2) | NOT NULL | - | 金额（正数入账，负数出账） |
| balance_before | DECIMAL(10,2) | NOT NULL | - | 变更前余额 |
| balance_after | DECIMAL(10,2) | NOT NULL | - | 变更后余额 |
| related_order_id | UUID | - | - | 关联订单ID |
| status | SMALLINT | NOT NULL | 1 | 状态：0处理中/1已完成/2已失败/3已拒绝 |
| settle_at | TIMESTAMP | - | - | 预计结算时间（待结算类型） |
| wx_payment_no | VARCHAR(64) | - | - | 微信付款单号（提现时） |
| reject_reason | VARCHAR(200) | - | - | 拒绝原因（提现被拒时） |
| remark | VARCHAR(200) | - | - | 备注 |

**类型枚举：**
| 值 | 类型 | 说明 | 金额 |
|----|------|------|------|
| 1 | income_pending | 订单收入（待结算） | +正数 |
| 2 | income_settled | 结算到账（7天后） | +正数 |
| 3 | tip_income | 打赏收入（即时到账） | +正数 |
| 4 | withdrawal | 提现申请 | -负数 |
| 5 | refund_deduct | 退款扣除 | -负数 |

**索引：** `transaction_no` (UNIQUE), `wallet_id`, `type`, `status`, `settle_at` WHERE settle_at IS NOT NULL, `created_at` (DESC)

**资金流转示例：** 订单完成 → 创建 income_pending 流水（待结算）→ pending_amount +100 → 7天后自动结算 → 创建 income_settled 流水 → pending_amount -100, balance +100 → 顾问申请提现 → 创建 withdrawal 流水（处理中）→ 审核通过 → 微信付款 → 流水状态改为已完成 → balance -100, total_withdrawn +100
