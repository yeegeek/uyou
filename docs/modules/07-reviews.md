# UYOU 无忧陪伴 - 评价模块

> 评价模块完整文档 | 包含PRD、API、数据库设计

---

## 一、PRD - 产品需求

### 1.1 功能清单

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 评价顾问 | 评分(1-5星) + 文字评价 + 标签（双向评价） | P0 |
| 评价用户 | 服务完成后可评价用户（双向评价） | P0 |
| 打赏小费 | 五星好评时可选择打赏顾问 | P1 |

---

## 二、API - 接口设计

### 2.1 评价订单（用户评价顾问）

**POST** `/reviews`

**请求：**
```json
{
  "orderId": "order_id",
  "rating": 5,
  "content": "评价内容",
  "tagIds": ["tag_id1", "tag_id2"],
  "isAnonymous": false
}
```

### 2.2 评价订单（顾问评价用户）

**POST** `/reviews/consultant`

**请求：**
```json
{
  "orderId": "order_id",
  "rating": 5,
  "content": "用户很好沟通",
  "tagIds": []
}
```

### 2.3 获取评价列表

**GET** `/reviews`

**查询参数：** `targetId` (required) - 被评价者ID，`targetType` (required) - user/consultant，`nextPage`, `pageSize`

**响应：**
```json
{
  "reviews": [ ... ],
  "pagination": { ... }
}
```

### 2.4 获取评价标签

**GET** `/review-tags`

**响应：**
```json
{ "tags": [ { "id": "tag_id", "name": "服务专业", "type": 1 } ] }
```

### 2.5 打赏顾问

**POST** `/tips`

**请求：**
```json
{
  "orderId": "order_id",
  "amount": 20.00,
  "message": "感谢您的陪伴"
}
```

### 2.6 删除评价

**DELETE** `/reviews/:id`

**说明：** 仅评价人可删除自己的评价，删除后，顾问的`avg_rating`会重新计算（排除已删除评价）

### 2.7 审核评价（管理后台）

**POST** `/admin/reviews/:id/audit`

**请求：**
```json
{
  "action": "approve",
  "reason": "评价内容违规"
}
```

**响应：**
```json
{
  "reviewId": "review_id",
  "status": 1,
  "reviewedAt": "2026-01-15T10:00:00Z"
}
```

**说明：** 仅管理员可操作，审核通过：评价状态`0待审核 → 1显示`，审核拒绝：评价状态`0待审核 → 2审核拒绝`（隐藏），需填写拒绝原因

---

## 三、Database - 数据库设计

### 3.1 reviews - 评价表（双向评价）

> 支持用户评价顾问 + 顾问评价用户的双向评价

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| order_id | UUID | FK → orders.id | - | 订单ID |
| reviewer_id | UUID | FK → users.id | - | 评价人ID |
| reviewee_id | UUID | FK → users.id | - | 被评价人ID |
| review_type | SMALLINT | NOT NULL | - | 评价类型：1用户评顾问/2顾问评用户 |
| rating | SMALLINT | NOT NULL | - | 评分：1-5星 |
| content | TEXT | - | - | 评价内容 |
| images | JSONB | - | - | 评价图片URLs |
| is_anonymous | BOOLEAN | NOT NULL | false | 是否匿名 |
| reply | TEXT | - | - | 被评价人回复 |
| replied_at | TIMESTAMP | - | - | 回复时间 |
| status | SMALLINT | NOT NULL | 0 | 状态：0待审核/1显示/2审核拒绝（隐藏） |
| deleted_at | TIMESTAMP | - | - | 删除时间（软删除） |
| reviewed_at | TIMESTAMP | - | - | 审核时间 |
| reviewed_by | UUID | FK → users.id | - | 审核人ID（管理员） |
| review_reason | VARCHAR(200) | - | - | 审核拒绝原因 |

**索引：**
```sql
CREATE UNIQUE INDEX idx_reviews_order_reviewer_type ON reviews(order_id, reviewer_id, review_type);
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX idx_reviews_review_type ON reviews(review_type);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
```

**唯一性约束：** `(order_id, reviewer_id, review_type)` 确保同一订单、同一评价人、同一评价类型只能评价一次，支持双向评价（用户和顾问可以分别评价对方）

**评价审核流程：**
- 评价提交后：状态为`0待审核`
- 审核通过：状态为`1显示`，评价对外可见，计入顾问`avg_rating`
- 审核拒绝：状态为`2审核拒绝`（隐藏），评价不对外显示，不计入顾问`avg_rating`

**评价后评分更新机制：**
- 更新时机：评价审核通过后更新顾问的`avg_rating`（状态`0待审核 → 1显示`），评价删除后重新计算`avg_rating`（排除已删除评价），评价审核拒绝不影响`avg_rating`
- 评分计算公式：`avg_rating = SUM(rating) / COUNT(reviews)`，仅统计`review_type=1`（用户评顾问）且`status=1`（显示）且`deleted_at IS NULL`（未删除）的评价
- 更新方式：应用层逻辑更新（评价审核通过/删除时触发），使用数据库事务确保数据一致性，考虑使用缓存优化（Redis缓存顾问评分，定期同步到数据库）

### 3.2 review_tags - 评价标签表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| name | VARCHAR(20) | UNIQUE, NOT NULL | - | 标签名称 |
| type | SMALLINT | NOT NULL | 1 | 类型：1正面/2负面 |
| sort_order | INTEGER | NOT NULL | 0 | 排序 |
| is_enabled | BOOLEAN | NOT NULL | true | 是否启用 |

### 3.3 review_tag_relations - 评价标签关联表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| review_id | UUID | FK → reviews.id | - | 评价ID |
| tag_id | UUID | FK → review_tags.id | - | 标签ID |

**索引：** `review_id`, `(review_id, tag_id)` (UNIQUE)

### 3.4 tips - 打赏/小费表

> 用户在五星好评时可以额外打赏顾问

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| tip_no | VARCHAR(32) | UNIQUE, NOT NULL | - | 打赏单号 |
| order_id | UUID | FK → orders.id | - | 关联订单ID |
| user_id | UUID | FK → users.id | - | 打赏用户ID |
| consultant_id | UUID | FK → consultants.id | - | 被打赏顾问ID |
| amount | DECIMAL(10,2) | NOT NULL | - | 打赏金额 |
| message | VARCHAR(200) | - | - | 打赏留言 |
| payment_id | UUID | FK → payments.id | - | 支付记录ID |
| status | SMALLINT | NOT NULL | 0 | 状态：0待支付/1已支付/2已取消 |

**索引：** `tip_no` (UNIQUE), `order_id`, `consultant_id`
