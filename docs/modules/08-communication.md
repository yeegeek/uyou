# UYOU 无忧陪伴 - 通讯模块

> 通讯模块完整文档 | 包含PRD、API、数据库设计

---

## 一、PRD - 产品需求

### 1.1 功能清单

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 售前咨询 | 下单前可与顾问进行轻量级沟通（无需创建订单） | P0 |
| 订单内聊天 | 下单后可与情感顾问文字/语音沟通 | P0 |
| 视频/语音通话 | 线上陪伴服务的核心功能 | P0 |
| 虚拟号码通话 | 线下服务需电话联系时，使用平台中间号 | P0 |
| 消息通知 | 订单状态变更、新消息提醒 | P0 |

**虚拟号码功能说明：** 用户和顾问真实手机号不互相暴露，线下服务订单自动绑定虚拟中间号，通过中间号拨打系统转接到对方真实号码，订单完成后48小时自动解绑，使用阿里云隐私号/腾讯云隐私保护通话服务

### 1.2 业务流程

**售前咨询流程：** 用户浏览情感顾问 → 查看详情 → 点击"咨询" → 创建售前会话（不生成订单）→ 用户与顾问轻量沟通（如：周六有空吗？）→ 用户满意 → 点击"立即预约" → 进入订单预约流程

---

## 二、API - 接口设计

### 2.1 创建售前会话

**POST** `/conversations/pre-sales`

**请求：**
```json
{
  "consultantId": "consultant_id"
}
```

**响应：**
```json
{
  "conversationId": "conversation_id",
  "imConversationId": "im_conversation_id",
}
```

### 2.2 获取会话列表

**GET** `/conversations`

**查询参数：**
- `type` (optional) - 1售前咨询/2订单会话
- `nextPage`, `pageSize`

**响应：**
```json
{
  "conversations": [ ... ],
  "pagination": { ... }
}
```

### 2.3 获取会话消息

**GET** `/conversations/:id/messages`

**查询参数：**
- `nextPage`, `pageSize`
- `before` (optional) - 时间戳，获取此时间之前的消息

**响应：**
```json
{
  "messages": [ ... ],
  "pagination": { ... }
}
```

### 2.4 虚拟号码绑定

**POST** `/virtual-numbers/bind`

> **说明**：订单创建时自动调用此接口绑定虚拟号码（仅线下服务订单）

**请求：**
```json
{
  "orderId": "order_id",
  "userPhone": "13800138000",
  "consultantPhone": "13900139000"
}
```

**响应：**
```json
{
  "bindingId": "binding_id",
  "virtualNumber": "4001234567",
  "status": 1,
  "bindAt": "2026-01-15T10:00:00Z"
}
```

**业务逻辑：** 订单创建时如果服务模式为"线下"（service_mode=1）自动调用此接口，调用第三方服务（阿里云隐私号/腾讯云隐私保护通话）进行绑定，绑定成功更新 `virtual_number_bindings` 表status=1，绑定失败记录失败原因status=2，启动重试机制

**绑定失败重试机制：** 重试次数最多3次，重试间隔（第1次失败后5分钟重试，第2次失败后15分钟重试，第3次失败后30分钟重试），重试逻辑：定时任务检查 `status=2` 且 `retry_count < 3` 的记录，按 `next_retry_at` 时间重试，3次重试失败后记录失败原因，通知运营人员处理

### 2.5 获取虚拟号码绑定信息

**GET** `/virtual-numbers/bindings/:orderId`

**响应：**
```json
{
  "bindingId": "binding_id",
  "orderId": "order_id",
  "virtualNumber": "4001234567",
  "status": 1,
  "bindAt": "2026-01-15T10:00:00Z",
  "unbindAt": null
}
```

---

## 三、Database - 数据库设计

### 3.1 conversations - 会话表

> **售前咨询支持**：`order_id` 允许为空，支持用户在下单前与顾问进行咨询沟通
> - `conversation_type = 1`：售前咨询，无订单关联
> - `conversation_type = 2`：订单会话，关联具体订单

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| conversation_type | SMALLINT | NOT NULL | 1 | 会话类型：1售前咨询/2订单会话 |
| order_id | UUID | FK → orders.id | - | 关联订单ID（售前咨询为空） |
| user_id | UUID | FK → users.id | - | 用户ID |
| consultant_id | UUID | FK → consultants.id | - | 顾问ID |
| last_message_at | TIMESTAMP | - | - | 最后消息时间 |
| last_message_preview | VARCHAR(100) | - | - | 最后消息预览 |
| user_unread_count | INTEGER | NOT NULL | 0 | 用户未读数 |
| consultant_unread_count | INTEGER | NOT NULL | 0 | 顾问未读数 |
| status | SMALLINT | NOT NULL | 1 | 状态：0关闭/1开启 |

**索引：** `user_id`, `consultant_id`, `order_id` WHERE order_id IS NOT NULL, `conversation_type`, `(user_id, consultant_id)` (UNIQUE) WHERE conversation_type = 1 AND status = 1, `(user_id, status)`, `(consultant_id, status)`

**售前咨询转化流程：** 用户浏览顾问主页 → 点击"咨询"按钮 → 创建售前会话(type=1, order_id=NULL) → 用户与顾问沟通需求 → 用户满意 → 点击"立即预约" → 创建订单 → 创建订单会话(type=2, order_id=xxx) → 售前会话可保留或自动关闭

### 3.2 messages - 消息表

> **说明**：实时通讯使用**腾讯云IM**第三方服务，以下表用于：
> 1. 数据备份与同步
> 2. 投诉取证（保留聊天记录）
> 3. 数据分析与统计
> 4. 离线消息展示
>
> 消息通过腾讯云IM回调同步到本地数据库

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| conversation_id | UUID | FK → conversations.id | - | 会话ID |
| sender_id | UUID | FK → users.id | - | 发送者ID |
| sender_type | SMALLINT | NOT NULL | - | 发送者类型：1用户/2顾问/3系统 |
| message_type | SMALLINT | NOT NULL | 1 | 消息类型：1文字/2图片/3语音/4视频/5系统通知 |
| content | TEXT | - | - | 消息内容 |
| media_url | VARCHAR(500) | - | - | 媒体URL |
| media_duration | INTEGER | - | - | 媒体时长（秒） |
| is_read | BOOLEAN | NOT NULL | false | 是否已读 |

**索引：** `conversation_id`, `created_at` (DESC)

### 3.3 call_records - 通话记录表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| order_id | UUID | FK → orders.id | - | 订单ID |
| caller_id | UUID | FK → users.id | - | 主叫方ID |
| callee_id | UUID | FK → users.id | - | 被叫方ID |
| call_type | SMALLINT | NOT NULL | - | 通话类型：1语音/2视频 |
| room_id | VARCHAR(64) | - | - | 房间ID（腾讯云IM） |
| start_at | TIMESTAMP | - | - | 开始时间 |
| end_at | TIMESTAMP | - | - | 结束时间 |
| duration | INTEGER | - | - | 通话时长（秒） |
| end_reason | SMALLINT | - | - | 结束原因：1正常挂断/2超时/3拒绝/4取消 |

### 3.4 virtual_number_bindings - 虚拟号码绑定表

> **功能说明**：记录订单关联的虚拟中间号绑定，保护用户和顾问的真实手机号
> - 订单创建时自动绑定虚拟号（通过第三方服务，如阿里云隐私号、腾讯云隐私保护通话）
> - 订单完成后48小时自动解绑
> - 支持绑定失败重试和兜底策略

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| order_id | UUID | FK → orders.id, UNIQUE | - | 关联订单ID |
| user_real_number | VARCHAR(20) | NOT NULL | - | 用户真实手机号（加密存储） |
| consultant_real_number | VARCHAR(20) | NOT NULL | - | 顾问真实手机号（加密存储） |
| virtual_number | VARCHAR(20) | NOT NULL | - | 虚拟中间号 |
| provider | VARCHAR(50) | NOT NULL | - | 服务商（aliyun/tencent/其他） |
| bind_at | TIMESTAMP | - | - | 绑定时间 |
| unbind_at | TIMESTAMP | - | - | 解绑时间 |
| status | SMALLINT | NOT NULL | 0 | 状态：0待绑定/1已绑定/2绑定失败/3已解绑/4解绑失败 |
| bind_error | VARCHAR(500) | - | - | 绑定失败原因 |
| retry_count | INTEGER | NOT NULL | 0 | 重试次数（最多3次） |
| next_retry_at | TIMESTAMP | - | - | 下次重试时间 |
| call_record_id | UUID | FK → call_records.id | - | 关联通话记录ID（可选） |

**索引：** `order_id` (UNIQUE), `status`, `unbind_at` WHERE status = 1, `(status, next_retry_at)` WHERE status = 2 AND retry_count < 3

**绑定失败重试机制：** 重试规则（最多重试3次，重试间隔：第1次失败后5分钟，第2次失败后15分钟，第3次失败后30分钟，重试条件：`status=2`绑定失败且 `retry_count < 3`），重试流程（定时任务每5分钟执行一次检查需要重试的记录，查询条件：`status=2 AND retry_count < 3 AND next_retry_at <= NOW()`，重新调用第三方服务进行绑定，成功更新 `status=1`清空 `retry_count` 和 `next_retry_at`，失败 `retry_count++`计算下次重试时间），3次重试失败后（记录失败原因到 `bind_error`，通知运营人员处理，订单仍可正常进行，但无法使用虚拟号码通话）

**自动解绑机制：** 解绑时机（订单完成后48小时自动解绑），解绑流程（定时任务检查订单状态为"已完成"且完成时间超过48小时的记录），解绑失败处理（解绑失败时 `status=4`解绑失败，记录失败原因，通知运营人员手动处理）

**隐私保护说明：** 平台聊天通过腾讯云IM进行，双方手机号不暴露；线下服务如需电话沟通，建议接入虚拟中间号服务（如阿里云隐私号、腾讯云隐私保护通话）；虚拟中间号可绑定到订单，订单完成后自动解绑
