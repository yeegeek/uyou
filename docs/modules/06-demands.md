# UYOU 无忧陪伴 - 需求模块

> 需求模块完整文档 | 包含PRD、API、数据库设计

---

## 一、PRD - 产品需求

### 1.1 功能清单

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 发布需求 | 不指定顾问，发布到需求大厅等待顾问接单 | P0 |
| 需求管理 | 查看已发布需求、申请列表、选择顾问 | P0 |

### 1.2 业务流程

**用户发布情感需求流程（不指定顾问）：** 用户发布情感需求 → 填写需求详情（选择服务类目、时间、地点、预算，可选：期望顾问性别、年龄范围）→ 提交需求（状态：pending）→ 系统智能匹配（状态：matching）→ 推送给TOP 10匹配顾问 → 60秒内有顾问响应？是：锁定需求状态→matched，否：释放到大厅 → 需求大厅展示（状态=pending时可见）→ 顾问申请接单（可报价）→ 用户收到申请列表 → 用户选择顾问 → 状态→confirmed → 生成订单 → 进入订单支付流程 → 24小时无人接单 → 状态→expired → 系统推送"无匹配"提示 + 推荐热门顾问

**需求状态机：** pending → matching → locked → matched → confirmed | cancelled | expired  
**大厅可见性：** 仅 `pending` 状态可见，`matching/locked/matched` 锁定不可见（防重复申请）

**60秒锁定机制说明：** 系统推送需求给TOP 10匹配顾问后，需求进入60秒锁定期，锁定期间需求状态为`locked`，其他顾问不可申请，60秒内有顾问响应（申请接单）需求状态转为`matched`锁定该顾问，60秒内无顾问响应锁定解除需求状态回退到`pending`释放到需求大厅，锁定超时后需求可被其他顾问申请

**匹配失败后的状态流转：** 无匹配结果（`matching → pending`系统未找到匹配顾问，需求释放到大厅），匹配超时（`matching → expired`24小时无人接单，需求过期），锁定超时（`locked → pending`60秒内无顾问响应，锁定解除，需求释放到大厅）

**需求状态与订单状态的关联规则：** 订单创建后需求状态更新为`confirmed`（已确认，已生成订单）。订单取消后的需求状态回退规则：如果订单在`pending_accept`或`pending_payment`阶段取消，需求状态回退到`pending`（可重新匹配），需求释放到需求大厅，其他顾问可申请；如果订单在`paid`之后取消，需求状态保持`confirmed`（已生成订单，不再匹配），需求不再释放到大厅，避免重复匹配

**智能匹配算法说明：**

**匹配评分公式：** 总分 = 距离分×40% + 评分分×30% + 偏好分×20% + 活跃分×10%

| 维度 | 权重 | 计算方式 |
|------|------|----------|
| 距离分 | 40% | 100 - (距离km / 服务半径km × 100)，最低0分 |
| 评分分 | 30% | 顾问avg_rating / 5 × 100 |
| 偏好分 | 20% | 性别匹配+20，年龄匹配+20，服务类目匹配+60（满分100分，各项可叠加） |
| 活跃分 | 10% | 在线+50，7天内有接单+30，24h内有登录+20（最高100分，可叠加） |

**匹配流程：** 1. 筛选（城市相同 + 服务类目启用 + 在服务半径内 + 状态正常）→ 2. 排除（黑名单关系 + 信用分<60 + 当前时段已有订单）→ 3. 评分（按公式计算总分）→ 4. 排序（取TOP 10推送）→ 5. 降级（无匹配时推荐热门顾问，评分前20）

---

## 二、API - 接口设计

### 2.1 发布需求

**POST** `/demands`

**请求：**
```json
{
  "consultantId": "consultant_id", // 可选，指定顾问则只发送给该顾问，不指定则系统匹配或进入需求大厅
  "categoryId": "category_id",
  "serviceMode": 1, // 1线下/2线上视频/3线上语音
  "cityId": "city_id",
  "serviceAddress": "服务地址",
  "serviceLocation": {
    "lat": 31.2304,
    "lng": 121.4737
  },
  "preferredGender": 0, // 0不限/1男/2女
  "preferredAgeMin": 20,
  "preferredAgeMax": 35,
  "budgetMin": 100.00,
  "budgetMax": 500.00,
  "scheduledStart": "2026-01-15T14:00:00Z",
  "scheduledEnd": "2026-01-15T18:00:00Z",
  "description": "需求描述"
}
```

**说明：** `consultantId` 为可选字段，指定顾问：需求直接发送给该顾问，顾问接受后自动生成订单；不指定顾问：需求进入系统匹配流程或需求大厅，多个顾问可申请，用户选择后生成订单

**响应：**
```json
{
  "demandId": "demand_id",
  "demandNo": "DEM202601150001",
  "status": 0,
}
```

### 2.2 获取我的需求列表

**GET** `/demands/my`

**查询参数：**
- `status` (optional) - 0待匹配/1匹配中/2已匹配/3已确认/4已取消/5已过期
- `nextPage`, `pageSize`

**响应：**
```json
{
  "demands": [ ... ],
  "pagination": { ... }
}
```

### 2.3 获取需求详情

**GET** `/demands/:id`

**响应：**
```json
{
  "id": "demand_id",
  "demandNo": "DEM202601150001",
  "status": 0,
  ...,
}
```

### 2.4 获取需求申请列表

**GET** `/demands/:id/applications`

**响应：**
```json
{
  "applications": [
    {
      "id": "application_id",
      "consultant": {
        "id": "consultant_id",
        "nickname": "顾问昵称",
        "avatar": "头像URL",
        "avgRating": 4.8
      },
      "price": 200.00,
      "message": "我可以提供...",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

### 2.5 选择顾问（从需求申请中选择）

**POST** `/demands/:id/select-consultant`

**请求：**
```json
{
  "applicationId": "application_id"
}
```

**响应：**
```json
{
  "orderId": "order_id",
  "orderNo": "ORD202601150001",
}
```

### 2.6 取消需求

**POST** `/demands/:id/cancel`

### 2.7 查询需求锁定状态

**GET** `/demands/:id/lock-status`

**响应：**
```json
{
  "demandId": "demand_id",
  "status": 2,
  "isLocked": true,
  "lockedUntil": "2026-01-15T10:01:00Z",
  "lockedByConsultant": {
    "id": "consultant_id",
    "nickname": "顾问昵称"
  },
  "remainingSeconds": 45
}
```

**说明：** 仅当需求状态为`locked`时返回锁定信息，`remainingSeconds`锁定剩余秒数（用于前端倒计时）

---

## 三、Database - 数据库设计

### 3.1 demands - 情感需求表

> **位置匹配逻辑**：
> 1. 用户发布需求时填写 `service_location`（期望服务坐标）
> 2. 系统查询 `user_locations` 表中 `is_current=true` 的顾问位置
> 3. 计算顾问位置与需求位置的距离
> 4. 筛选距离 ≤ 顾问 `service_radius` 的顾问进行匹配/推送

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| demand_no | VARCHAR(32) | UNIQUE, NOT NULL | - | 需求单号 |
| user_id | UUID | FK → users.id | - | 发布用户ID |
| category_id | UUID | FK → categories.id | - | 服务类目ID |
| service_mode | SMALLINT | NOT NULL | 1 | 服务模式：1线下/2线上视频/3线上语音 |
| city_id | UUID | FK → cities.id | - | 服务城市 |
| service_address | VARCHAR(200) | - | - | 期望服务地址 |
| service_location | GEOGRAPHY(Point, 4326) | - | - | 期望服务坐标（WGS84） |
| preferred_gender | SMALLINT | - | 0 | 期望顾问性别：0不限/1男/2女 |
| preferred_age_min | SMALLINT | - | - | 期望顾问最小年龄 |
| preferred_age_max | SMALLINT | - | - | 期望顾问最大年龄 |
| scheduled_start | TIMESTAMP | NOT NULL | - | 期望开始时间 |
| scheduled_end | TIMESTAMP | NOT NULL | - | 期望结束时间 |
| duration | INTEGER | NOT NULL | - | 期望时长（分钟，冗余字段，可由scheduled_end - scheduled_start计算） |
| budget_min | DECIMAL(10,2) | - | - | 预算最低（元/小时） |
| budget_max | DECIMAL(10,2) | - | - | 预算最高（元/小时） |
| description | TEXT | - | - | 需求描述 |
| status | SMALLINT | NOT NULL | 0 | 状态（见下方枚举） |
| assigned_consultant_id | UUID | FK → consultants.id | - | 系统分配的顾问ID |
| locked_until | TIMESTAMP | - | - | 锁定到期时间（60秒锁定期） |
| locked_by_consultant_id | UUID | FK → consultants.id | - | 锁定顾问ID（60秒响应期内响应的顾问） |
| matched_at | TIMESTAMP | - | - | 匹配成功时间 |
| expired_at | TIMESTAMP | NOT NULL | - | 需求过期时间 |

**需求状态枚举：**
| 值 | 状态 | 说明 |
|----|------|------|
| 0 | pending | 待匹配（在需求大厅展示） |
| 1 | matching | 系统匹配中（正在计算匹配分数） |
| 2 | locked | 已锁定（60秒响应期，推送给顾问后锁定） |
| 3 | matched | 已匹配（顾问已响应，待用户确认） |
| 4 | accepted | 顾问已接单，待用户确认 |
| 5 | confirmed | 已确认，已生成订单 |
| 6 | expired | 已过期 |
| 7 | cancelled | 已取消 |

**索引：** `demand_no` (UNIQUE), `user_id`, `city_id`, `category_id`, `status`, `scheduled_start`, `created_at` (DESC), `locked_until` WHERE locked_until IS NOT NULL, `service_location` (GIST), `(user_id, status)`, `(city_id, status)` WHERE status = 0

**需求匹配SQL示例：**
```sql
-- 为需求匹配附近的在线顾问
SELECT c.*, ul.location, ul.address, cs.service_radius,
       ST_Distance(ul.location, d.service_location) / 1000 AS distance_km
FROM demands d
CROSS JOIN LATERAL (
    SELECT c.*, ul.location, ul.address, cs.service_radius
    FROM consultants c
    JOIN user_locations ul ON ul.user_id = c.id AND ul.is_current = true
    JOIN consultant_services cs ON cs.consultant_id = c.id 
      AND cs.category_id = d.category_id 
      AND cs.service_mode = d.service_mode
      AND cs.is_enabled = true
    WHERE c.status = 1 
      AND c.online_status IN (1, 2)  -- 在线或忙碌
      AND c.city_id = d.city_id
      AND ST_DWithin(ul.location, d.service_location, cs.service_radius * 1000)
      AND (d.preferred_gender = 0 OR EXISTS (SELECT 1 FROM users u WHERE u.id = c.id AND u.gender = d.preferred_gender))
    ORDER BY c.avg_rating DESC, ST_Distance(ul.location, d.service_location)
    LIMIT 10
) matched_consultants
WHERE d.id = :demand_id;
```

### 3.2 demand_locks - 需求锁定记录表

> 记录需求的60秒锁定信息，用于锁定超时处理和审计

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| demand_id | UUID | FK → demands.id | - | 需求ID |
| consultant_id | UUID | FK → consultants.id | - | 锁定顾问ID（60秒响应期内响应的顾问） |
| locked_at | TIMESTAMP | NOT NULL | now() | 锁定开始时间 |
| locked_until | TIMESTAMP | NOT NULL | - | 锁定到期时间（locked_at + 60秒） |
| status | SMALLINT | NOT NULL | 0 | 状态：0锁定中/1已响应/2已超时 |
| responded_at | TIMESTAMP | - | - | 顾问响应时间（申请接单时间） |

**索引：** `demand_id`, `consultant_id`, `locked_until` WHERE status = 0, `status`

**锁定机制说明：** 系统推送需求给TOP 10顾问后创建锁定记录（`status=0`锁定中），60秒内有顾问响应（申请接单）更新锁定记录（`status=1`已响应，`responded_at`有值），60秒内无顾问响应定时任务处理（`status=2`已超时），需求状态回退到`pending`，锁定超时处理：定时任务每10秒检查一次，释放超时的锁定需求

### 3.3 demand_applications - 需求申请表

> 顾问对需求的申请/接单记录

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| demand_id | UUID | FK → demands.id | - | 需求ID |
| consultant_id | UUID | FK → consultants.id | - | 顾问ID |
| price | DECIMAL(10,2) | NOT NULL | - | 报价（元/小时） |
| message | VARCHAR(500) | - | - | 申请留言 |
| status | SMALLINT | NOT NULL | 0 | 状态：0待处理/1被选中/2未被选中 |

**索引：** `demand_id`, `consultant_id`, `(demand_id, consultant_id)` (UNIQUE)
