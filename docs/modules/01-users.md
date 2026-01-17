# UYOU 无忧陪伴 - 用户模块

> 用户模块完整文档 | 包含PRD、API、数据库设计

---

## 一、PRD - 产品需求

### 1.1 功能清单

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 微信一键登录 | 微信授权登录，获取头像昵称 | P0 |
| 手机号绑定 | 微信获取手机号，用于安全验证 | P0 |
| 实名认证 | 身份证+人脸识别（可选，但下单需要） | P1 |
| 个人资料编辑 | 头像、昵称、性别、生日、个人简介 | P0 |
| 紧急联系人 | 设置紧急联系人 | P0 |
| 收藏/关注 | 收藏/关注顾问 | P0 |
| 屏蔽管理 | 拉黑/屏蔽顾问 | P1 |

---

## 二、API - 接口设计

### 2.1 获取用户信息

**GET** `/users/me`

**响应：**
```json
{
  "id": "user_id",
  "nickname": "用户昵称",
  "avatar": "头像URL",
  "gender": 1,
  "birthday": "1990-01-01",
  "bio": "个人简介",
  "city": { "id": "city_id", "name": "上海" },
  "isConsultant": false,
  "status": 1
}
```

### 2.2 更新用户信息

**PATCH** `/users/me`

**请求：**
```json
{
  "nickname": "新昵称",
  "avatar": "新头像URL",
  "gender": 1,
  "birthday": "1990-01-01",
  "bio": "个人简介"
}
```

### 2.3 实名认证

**POST** `/users/verification`

**请求（FormData）：** `realName`, `idCardNo`, `idCardFront`, `idCardBack`, `facePhoto`

**响应：**
```json
{
  "verificationId": "verification_id",
  "status": 0,
  "message": "提交成功，等待审核"
}
```

### 2.4 获取实名认证状态

**GET** `/users/verification/status`

**响应：**
```json
{
  "status": 1,
  "rejectReason": null
}
```

### 2.5 设置紧急联系人

**POST** `/users/emergency-contacts`

**请求：**
```json
{
  "name": "联系人姓名",
  "phone": "13800138000",
  "relation": "朋友",
  "isPrimary": true
}
```

### 2.6 获取紧急联系人列表

**GET** `/users/emergency-contacts`

**响应：**
```json
{ "contacts": [ ... ] }
```

### 2.7 收藏用户/顾问

**POST** `/users/favorites`

**请求：**
```json
{
  "targetId": "consultant_id",
  "favoriteType": 1,
  "remark": "备注名（可选）"
}
```

**说明：** `targetId`被收藏的用户/顾问ID，`favoriteType`1普通收藏/2特别关注，`remark`备注名（可选）

**响应：**
```json
{
  "favoriteId": "favorite_id",
  "targetId": "consultant_id",
  "favoriteType": 1,
  "createdAt": "2026-01-15T10:00:00Z"
}
```

### 2.8 取消收藏

**DELETE** `/users/favorites/:id`

**响应：**
```json
{ "message": "取消收藏成功" }
```

### 2.9 获取收藏列表

**GET** `/users/favorites`

**查询参数：** `favoriteType` (optional) - 1普通收藏/2特别关注，`nextPage`, `pageSize`

**响应：**
```json
{
  "favorites": [ ... ],
  "pagination": { ... }
}
```

### 2.10 屏蔽用户/顾问

**POST** `/users/blocks`

**请求：**
```json
{
  "blockedId": "consultant_id",
  "reason": "屏蔽原因（可选）"
}
```

**响应：**
```json
{
  "blockId": "block_id",
  "blockedId": "consultant_id",
  "createdAt": "2026-01-15T10:00:00Z"
}
```

### 2.11 取消屏蔽

**DELETE** `/users/blocks/:id`

**响应：**
```json
{ "message": "取消屏蔽成功" }
```

### 2.12 获取屏蔽列表

**GET** `/users/blocks`

**查询参数：** `nextPage`, `pageSize`

**响应：**
```json
{
  "blocks": [ ... ],
  "pagination": { ... }
}
```

---

## 三、Database - 数据库设计

### 3.1 users - 用户表

> 存储所有用户的基础信息，包括普通用户和情感顾问

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| phone | VARCHAR(20) | UNIQUE, NOT NULL | - | 手机号（加密存储） |
| nickname | VARCHAR(50) | NOT NULL | - | 昵称 |
| avatar | VARCHAR(500) | - | - | 头像URL |
| gender | SMALLINT | - | 0 | 性别：0未知/1男/2女 |
| birthday | DATE | - | - | 生日 |
| bio | VARCHAR(500) | - | - | 个人简介 |
| city_id | UUID | FK → cities.id | - | 所在城市 |
| wx_openid | VARCHAR(100) | UNIQUE | - | 微信OpenID |
| wx_unionid | VARCHAR(100) | UNIQUE | - | 微信UnionID |
| is_consultant | BOOLEAN | NOT NULL | false | 是否为情感顾问 |
| status | SMALLINT | NOT NULL | 1 | 状态：0禁用/1正常 |
| login_at | TIMESTAMP | - | - | 最后登录时间 |
| last_active_ip | VARCHAR(50) | - | - | 最后活跃IP（风控用） |

**索引：** `phone` (UNIQUE), `wx_openid` (UNIQUE), `city_id`, `is_consultant`, `last_active_ip`

### 3.2 user_verifications - 用户实名认证表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| user_id | UUID | FK → users.id, UNIQUE | - | 用户ID |
| real_name | VARCHAR(50) | NOT NULL | - | 真实姓名（加密） |
| id_card_no | VARCHAR(100) | NOT NULL | - | 身份证号（加密） |
| id_card_front | VARCHAR(500) | - | - | 身份证正面照URL |
| id_card_back | VARCHAR(500) | - | - | 身份证背面照URL |
| face_photo | VARCHAR(500) | - | - | 人脸识别照片URL |
| face_similarity | DECIMAL(5,2) | - | - | 人脸相似度(%) |
| status | SMALLINT | NOT NULL | 0 | 状态：0待审核/1通过/2拒绝 |
| reject_reason | VARCHAR(200) | - | - | 拒绝原因 |
| verified_at | TIMESTAMP | - | - | 认证通过时间 |

**索引：** `user_id` (UNIQUE), `status`

### 3.3 user_emergency_contacts - 紧急联系人表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| user_id | UUID | FK → users.id | - | 用户ID |
| name | VARCHAR(50) | NOT NULL | - | 联系人姓名 |
| phone | VARCHAR(20) | NOT NULL | - | 联系人电话 |
| relation | VARCHAR(20) | - | - | 关系（父母/朋友等） |
| is_primary | BOOLEAN | NOT NULL | false | 是否首要联系人 |

**索引：** `user_id`

### 3.4 user_favorites - 用户收藏/关注表

> 用户和顾问都可以收藏/关注其他用户

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| user_id | UUID | FK → users.id | - | 收藏者ID |
| target_id | UUID | FK → users.id | - | 被收藏者ID |
| favorite_type | SMALLINT | NOT NULL | 1 | 类型：1普通收藏/2特别关注 |
| remark | VARCHAR(100) | - | - | 备注（给被收藏者的备注名） |

**索引：** `user_id`, `target_id`, `(user_id, target_id)` (UNIQUE)

### 3.5 user_blocks - 用户黑名单/屏蔽表

> 用户或顾问可以拉黑/屏蔽对方，拉黑后双方不可见、不可下单、不可发消息

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| user_id | UUID | FK → users.id | - | 操作者ID |
| blocked_id | UUID | FK → users.id | - | 被拉黑者ID |
| reason | VARCHAR(200) | - | - | 拉黑原因（可选） |

**索引：** `user_id`, `blocked_id`, `(user_id, blocked_id)` (UNIQUE)

**重要：应用层双向屏蔽实现规范**

黑名单采用**单向记录、双向检查**的设计模式：
- **数据库层**：只存储一条记录（A拉黑B），不自动创建反向记录
- **应用层**：所有涉及用户关系的查询必须做**双向检查**

**必须在以下场景实施双向检查：**
1. 顾问列表展示：排除存在黑名单关系的顾问
2. 用户详情页：检查是否被对方拉黑
3. 下单前：检查双向黑名单关系
4. 发起会话前：检查双向黑名单关系
5. 需求匹配：排除黑名单关系的顾问

**黑名单检查SQL示例：**
```sql
SELECT EXISTS (
    SELECT 1 FROM user_blocks 
    WHERE (user_id = :user_a AND blocked_id = :user_b)
       OR (user_id = :user_b AND blocked_id = :user_a)
) AS is_blocked;
```

### 3.6 user_locations - 用户位置表

> 存储用户/顾问的常用位置，用于需求匹配和距离计算。每个用户可以设置多个位置（如：家、公司）。顾问必须设置至少一个 `is_current=true` 的位置才能接单。标记 `is_current=true` 的位置用于距离匹配。

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| user_id | UUID | FK → users.id | - | 用户ID |
| name | VARCHAR(50) | NOT NULL | - | 位置名称（家/公司/常去地点） |
| city_id | UUID | FK → cities.id | - | 所在城市 |
| address | VARCHAR(200) | NOT NULL | - | 详细地址 |
| location | GEOGRAPHY(Point, 4326) | NOT NULL | - | 精确坐标（经纬度，WGS84） |
| is_current | BOOLEAN | NOT NULL | false | 是否为当前位置（用于匹配） |
| is_default | BOOLEAN | NOT NULL | false | 是否为默认位置 |

**索引：** `user_id`, `city_id`, `(user_id, is_current)` WHERE is_current = true, `location` (GIST)
