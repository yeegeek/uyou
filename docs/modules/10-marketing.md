# UYOU 无忧陪伴 - 营销模块

> 营销模块完整文档 | 包含PRD、API、数据库设计

---

## 一、PRD - 产品需求

### 1.1 功能清单

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 我的优惠券 | 查看/使用优惠券 | P1 |

**优惠券说明：** 优惠券类型：新人券、满减券、折扣券、指定类目券；支付方式：优惠券 → 微信支付；退款规则：使用优惠券的订单退款时，优惠券不退回；用户无钱包：所有消费和退款直接通过微信支付

**优惠券领取规则：** 每人限领（每个优惠券模板，每个用户最多可领取N张）、每日限领（每个优惠券模板，每个用户每天最多可领取M张）、总量限制（优惠券模板设置`total_count`，已领取数量达到总量后不可再领取）、时间限制（优惠券模板设置`start_at`和`end_at`，仅在发放期间可领取）

**优惠券使用校验：** 订单金额校验（订单金额需满足`min_amount`）、类目限制校验（如果优惠券设置了`category_id`，订单类目必须匹配）、城市限制校验（如果优惠券设置了`city_id`，订单城市必须匹配）、时间限制校验（优惠券未过期）、状态校验（优惠券状态为`0未使用`）、使用规则校验（新人券仅限首次下单使用，满减券订单金额需满足`min_amount`，折扣券计算折扣后金额，指定类目券订单类目必须匹配）

**优惠券过期处理：** 定时任务（每天凌晨执行，清理过期优惠券）、过期判断（`expire_at < 当前时间`且状态为`0未使用`）、过期处理（将状态更新为`2已过期`）、过期通知（优惠券过期前3天，推送提醒通知，可选）

---

## 二、API - 接口设计

### 2.1 获取我的优惠券

**GET** `/coupons/my`

**查询参数：**
- `status` (optional) - 0未使用/1已使用/2已过期
- `nextPage`, `pageSize`

**响应：**
```json
{
  "coupons": [ ... ],
  "pagination": { ... }
}
```

### 2.2 领取优惠券

**POST** `/coupons/:id/claim`

### 2.3 获取可用优惠券（下单时）

**GET** `/coupons/available`

**查询参数：**
- `orderId` (required) - 订单ID
- `amount` (required) - 订单金额

**响应：**
```json
{
  "coupons": [
    {
      "id": "coupon_id",
      "name": "新人券",
      "type": 3,
      "discountValue": 20.00,
      "minAmount": 0,
      "maxDiscount": null,
      "expireAt": "2026-02-01T00:00:00Z"
    }
  ]
}
```

---

## 三、Database - 数据库设计

### 3.1 coupons - 优惠券模板表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| name | VARCHAR(100) | NOT NULL | - | 优惠券名称 |
| type | SMALLINT | NOT NULL | - | 类型：1满减/2折扣/3立减 |
| discount_value | DECIMAL(10,2) | NOT NULL | - | 优惠值（满减金额/折扣比例/立减金额） |
| min_amount | DECIMAL(10,2) | NOT NULL | 0 | 最低消费金额（满减门槛） |
| max_discount | DECIMAL(10,2) | - | - | 最大优惠金额（折扣券限制） |
| category_id | UUID | FK → categories.id | - | 限定类目（NULL为全部） |
| city_id | UUID | FK → cities.id | - | 限定城市（NULL为全部） |
| total_count | INTEGER | NOT NULL | - | 发放总量 |
| claimed_count | INTEGER | NOT NULL | 0 | 已领取数量 |
| used_count | INTEGER | NOT NULL | 0 | 已使用数量 |
| per_user_limit | INTEGER | NOT NULL | 1 | 每人限领数量 |
| per_day_limit | INTEGER | NOT NULL | 1 | 每人每日限领数量 |
| valid_days | INTEGER | NOT NULL | - | 有效天数（领取后） |
| start_at | TIMESTAMP | NOT NULL | - | 发放开始时间 |
| end_at | TIMESTAMP | NOT NULL | - | 发放结束时间 |
| status | SMALLINT | NOT NULL | 1 | 状态：0下架/1上架 |
| created_by | UUID | FK → admins.id | - | 创建人 |

**索引：**
```sql
CREATE INDEX idx_coupons_status ON coupons(status);
CREATE INDEX idx_coupons_start_at ON coupons(start_at);
```

### 3.2 user_coupons - 用户优惠券表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| user_id | UUID | FK → users.id | - | 用户ID |
| coupon_id | UUID | FK → coupons.id | - | 优惠券模板ID |
| status | SMALLINT | NOT NULL | 0 | 状态：0未使用/1已使用/2已过期 |
| order_id | UUID | FK → orders.id | - | 使用订单ID |
| expire_at | TIMESTAMP | NOT NULL | - | 过期时间 |
| used_at | TIMESTAMP | - | - | 使用时间 |

**索引：**
```sql
CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_status ON user_coupons(status);
CREATE INDEX idx_user_coupons_expire_at ON user_coupons(expire_at);
-- 复合索引：用户优惠券列表查询（按状态筛选）
CREATE INDEX idx_user_coupons_user_status ON user_coupons(user_id, status);
```

### 3.3 activities - 活动表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| name | VARCHAR(100) | NOT NULL | - | 活动名称 |
| type | SMALLINT | NOT NULL | - | 类型：1新人/2邀请/3限时/4节日 |
| description | TEXT | - | - | 活动描述 |
| rules | JSONB | NOT NULL | - | 活动规则（JSON格式） |
| banner_url | VARCHAR(500) | - | - | 活动Banner图 |
| start_at | TIMESTAMP | NOT NULL | - | 开始时间 |
| end_at | TIMESTAMP | NOT NULL | - | 结束时间 |
| city_id | UUID | FK → cities.id | - | 限定城市（NULL为全部） |
| status | SMALLINT | NOT NULL | 1 | 状态：0下架/1上架 |
| created_by | UUID | FK → admins.id | - | 创建人 |

**活动规则JSON示例：**
```json
{
  "type": "new_user",
  "discount_type": "fixed",
  "discount_value": 20,
  "max_usage": 1,
  "conditions": {
    "first_order_only": true,
    "min_amount": 50
  }
}
```

---

> **文档更新记录**
> - v1.2 (2026-01-15)：完善优惠券领取规则、使用校验、过期处理
> - v1.1 (2026-01-15)：移除用户充值相关内容，用户所有消费和退款直接通过微信支付
> - v1.0 (2026-01-07)：初稿，完成营销模块PRD/API/DB整合
