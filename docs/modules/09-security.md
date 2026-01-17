# UYOU 无忧陪伴 - 安全模块

> 安全模块完整文档 | 包含PRD、API、数据库设计

---

## 一、PRD - 产品需求

### 1.1 功能清单

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 紧急求助 | 一键SOS，触发多级安全响应 | P0 |
| 实时定位共享 | 线下服务期间共享位置（可选） | P1 |
| 服务地点限制 | 仅允许公共场所，禁止私密地点 | P0 |
| 举报投诉 | 举报情感顾问违规行为 | P0 |

**紧急求助触发后系统动作：** 用户点击"紧急求助"按钮 → 长按3秒确认 → 并行执行以下动作（5秒内完成）：1. 获取当前GPS位置（精确到10米），2. 开始录音（后台持续，上传云端），3. 发送短信给紧急联系人（含位置链接），4. 推送通知给紧急联系人APP/小程序，5. 创建SOS工单，通知平台运营值班人员，6. 订单状态标记为"安全事件" → 平台运营30秒内响应 → 运营人员接单（状态：处理中）→ 尝试电话联系用户 → 联系结果判断（联系成功确认用户安全标记"已处理"，无法联系记录联系110的操作标记"已联系110"，运营人员手动拨打110记录操作日志）→ 事件记录存档 → 用于后续仲裁/法律取证

---

## 二、API - 接口设计

### 2.1 紧急求助

**POST** `/sos/alert`

**请求：**
```json
{
  "orderId": "order_id", // 可选
  "location": {
    "lat": 31.2304,
    "lng": 121.4737
  },
  "locationAddress": "详细地址"
}
```

**响应：**
```json
{
  "alertId": "alert_id",
  "status": 0,
  "message": "已通知紧急联系人和平台运营",
}
```

### 2.2 共享位置

**POST** `/orders/:id/location-share`

**请求：**
```json
{
  "location": {
    "lat": 31.2304,
    "lng": 121.4737
  },
  "locationAddress": "详细地址"
}
```

### 2.3 举报投诉

**POST** `/complaints`

**请求（FormData）：**
```
orderId: "order_id"
defendantId: "defendant_id"
type: 1 // 投诉类型：1服务质量/2态度问题/3迟到爽约/4骚扰/5欺诈/6隐私泄露/7其他
content: "投诉内容"
evidences: File[] // 证据（图片/视频/录音）
```

### 2.4 获取投诉列表

**GET** `/complaints`

**查询参数：**
- `status` (optional) - 0待处理/1处理中/2已处理/3已关闭
- `nextPage`, `pageSize`

**响应：**
```json
{
  "complaints": [ ... ],
  "pagination": { ... }
}
```

### 2.5 管理后台 - SOS工单处理

#### 2.5.1 获取SOS工单列表

**GET** `/admin/sos/alerts`

**查询参数：**
- `status` (optional) - 0待处理/1处理中/2已处理/3已联系110
- `handlerId` (optional) - 处理人ID
- `nextPage`, `pageSize`

**响应：**
```json
{
  "alerts": [
    {
      "id": "alert_id",
      "userId": "user_id",
      "userName": "用户昵称",
      "userPhone": "138****8000",
      "orderId": "order_id",
      "location": {
        "lat": 31.2304,
        "lng": 121.4737
      },
      "address": "上海市黄浦区XX路XX号",
      "status": 0,
      "createdAt": "2026-01-15T10:00:00Z",
      "handlerId": null,
      "handlerName": null
    }
  ],
  "pagination": { ... }
}
```

#### 2.5.2 处理SOS工单

**POST** `/admin/sos/alerts/:id/handle`

**请求：**
```json
{
  "action": "accept", // accept接单/processing处理中/contact_user联系用户/contact_110联系110/resolved已处理
  "remark": "已电话联系用户，用户表示安全，已解除警报"
}
```

**响应：**
```json
{
  "alertId": "alert_id",
  "status": 2,
  "handlerId": "admin_id",
  "handlerName": "管理员姓名",
  "handledAt": "2026-01-15T10:05:00Z"
}
```

**业务逻辑：** `accept`（接单）更新状态为"处理中"（status=1）记录处理人，`processing`（处理中）保持状态为"处理中"（status=1）更新备注，`contact_user`（联系用户）记录联系用户的操作更新备注，`contact_110`（联系110）更新状态为"已联系110"（status=3）记录联系110的操作和备注，`resolved`（已处理）更新状态为"已处理"（status=2）记录处理结果

#### 2.5.3 获取SOS工单详情

**GET** `/admin/sos/alerts/:id`

**响应：**
```json
{
  "id": "alert_id",
  "userId": "user_id",
  "userName": "用户昵称",
  "userPhone": "138****8000",
  "emergencyContact": {
    "name": "紧急联系人姓名",
    "phone": "139****9000"
  },
  "orderId": "order_id",
  "orderNo": "ORD202601150001",
  "location": {
    "lat": 31.2304,
    "lng": 121.4737
  },
  "address": "上海市黄浦区XX路XX号",
  "status": 0,
  "createdAt": "2026-01-15T10:00:00Z",
  "handlerId": null,
  "handlerName": null,
  "handleRemark": null,
  "handledAt": null,
  "locationHistory": [
    {
      "location": { "lat": 31.2304, "lng": 121.4737 },
      "address": "上海市黄浦区XX路XX号",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

## 三、Database - 数据库设计

### 3.1 complaints - 投诉表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| complaint_no | VARCHAR(32) | UNIQUE, NOT NULL | - | 投诉单号 |
| order_id | UUID | FK → orders.id | - | 关联订单ID |
| complainant_id | UUID | FK → users.id | - | 投诉人ID |
| complainant_type | SMALLINT | NOT NULL | - | 投诉人类型：1用户/2顾问 |
| respondent_id | UUID | FK → users.id | - | 被投诉人ID |
| respondent_type | SMALLINT | NOT NULL | - | 被投诉人类型：1用户/2顾问 |
| type | SMALLINT | NOT NULL | - | 投诉类型（见枚举） |
| description | TEXT | NOT NULL | - | 投诉描述 |
| status | SMALLINT | NOT NULL | 0 | 状态：0待处理/1处理中/2已完结 |
| result | SMALLINT | - | - | 处理结果：1支持投诉人/2支持被投诉人/3双方协调 |
| handler_id | UUID | FK → admins.id | - | 处理人ID |
| handle_remark | TEXT | - | - | 处理备注 |
| handled_at | TIMESTAMP | - | - | 处理完成时间 |

**投诉类型枚举：**
| 值 | 类型 | 说明 |
|----|------|------|
| 1 | service_quality | 服务质量问题 |
| 2 | attitude | 态度问题 |
| 3 | late | 迟到/爽约 |
| 4 | harassment | 骚扰 |
| 5 | fraud | 欺诈 |
| 6 | privacy | 隐私泄露 |
| 7 | other | 其他 |

**索引：** `complaint_no` (UNIQUE), `order_id`, `complainant_id`, `status`, `(complainant_id, status)`

### 3.2 complaint_evidences - 投诉证据表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| complaint_id | UUID | FK → complaints.id | - | 投诉ID |
| evidence_type | SMALLINT | NOT NULL | - | 证据类型：1图片/2视频/3音频/4聊天截图 |
| file_url | VARCHAR(500) | NOT NULL | - | 文件URL |
| description | VARCHAR(200) | - | - | 证据描述 |

### 3.3 sos_alerts - 紧急求助记录表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| user_id | UUID | FK → users.id | - | 用户ID |
| order_id | UUID | FK → orders.id | - | 关联订单ID |
| location | GEOGRAPHY(Point, 4326) | NOT NULL | - | 报警位置（WGS84） |
| address | VARCHAR(200) | - | - | 位置地址 |
| status | SMALLINT | NOT NULL | 0 | 状态：0待处理/1处理中/2已处理/3已联系110 |
| handler_id | UUID | FK → admins.id | - | 处理人ID |
| handle_remark | TEXT | - | - | 处理备注 |
| handled_at | TIMESTAMP | - | - | 处理时间 |
| contact_user_at | TIMESTAMP | - | - | 联系用户时间 |
| contact_110_at | TIMESTAMP | - | - | 联系110时间 |
| contact_110_record | TEXT | - | - | 联系110记录（如：接警员姓名、工号、处理结果等） |

**索引：** `user_id`, `order_id`, `status`, `handler_id`, `created_at` (DESC)

### 3.4 location_shares - 位置共享记录表

> **用途说明**：用于**线下服务期间的安全风控**，非需求匹配用途
> - 用户/顾问在线下服务期间可开启位置共享
> - 平台定时记录位置轨迹（如每5分钟一次）
> - 发生SOS紧急求助时可获取最新位置
> - 投诉/纠纷时可作为证据

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| order_id | UUID | FK → orders.id | - | 订单ID |
| user_id | UUID | FK → users.id | - | 上报者ID |
| user_type | SMALLINT | NOT NULL | - | 上报者类型：1用户/2顾问 |
| location | GEOGRAPHY(Point, 4326) | NOT NULL | - | 位置坐标（WGS84） |
| address | VARCHAR(200) | - | - | 位置地址 |

**索引：** `order_id`, `user_id`, `created_at` (DESC), `(order_id, created_at)`

**位置上报机制：** 客户端上报（用户/顾问在线下服务期间开启位置共享后，客户端每5分钟自动上报一次位置，上报接口：`POST /orders/:id/location-share`，上报时机：订单状态为"服务中"status=3时），服务端定时检查（定时任务每5分钟执行一次检查是否有订单需要上报位置，查询条件：订单状态为"服务中"且开启了位置共享，如果客户端超过10分钟未上报，服务端主动提醒客户端上报）

**位置数据清理策略：** 清理规则（清理时机：订单服务结束后24小时，清理条件：`order.status IN (4, 5, 6)`已完成/已取消/已退款且 `order.ended_at < NOW() - INTERVAL '24 hours'`，清理操作：删除该订单的所有位置记录），数据归档（可选，对于涉及SOS紧急求助或投诉的订单，位置数据不清理永久保存，归档条件：`order_id` 关联的 `sos_alerts` 或 `complaints` 表有记录，归档方式：标记 `is_archived=true`，不删除数据），存储优化方案（分区表：按月份对 `location_shares` 表进行分区，数据压缩：历史数据超过3个月进行压缩存储，定期归档：超过6个月的数据迁移到归档表，索引优化：使用复合索引 `(order_id, created_at)` 提高清理查询效率）

### 3.5 privacy_access_logs - 隐私访问日志表

> **用途**：记录管理员访问敏感信息的行为，满足隐私保护合规要求
> - 实名认证资料（身份证号、真实姓名、证件照片）
> - 用户手机号查看
> - 聊天记录查看
> - 用于审计追溯和合规检查

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| admin_id | UUID | FK → admins.id | - | 访问者（管理员）ID |
| target_type | VARCHAR(50) | NOT NULL | - | 敏感数据类型（见枚举） |
| target_id | UUID | NOT NULL | - | 被访问对象ID |
| target_user_id | UUID | FK → users.id | - | 被访问用户ID |
| access_reason | VARCHAR(200) | - | - | 访问原因/备注 |
| related_type | VARCHAR(50) | - | - | 关联业务类型（order/complaint等） |
| related_id | UUID | - | - | 关联业务ID |
| fields_accessed | TEXT[] | - | - | 具体访问的字段列表 |
| ip_address | VARCHAR(50) | - | - | 访问IP |
| user_agent | VARCHAR(500) | - | - | 浏览器UA |

**敏感数据类型枚举：**
| 值 | 说明 | 涉及表/字段 |
|----|------|-------------|
| id_card | 身份证信息 | user_verifications.id_card_no, real_name |
| id_card_photo | 身份证照片 | user_verifications.id_card_front, id_card_back |
| face_photo | 人脸照片 | user_verifications.face_photo |
| phone | 手机号（解密查看） | users.phone |
| chat_record | 聊天记录 | messages |
| call_record | 通话记录 | call_records |
| location_history | 位置历史 | location_shares |
| exam_video | 面试录像 | consultant_exams.video_url |

**索引：** `admin_id`, `target_user_id`, `target_type`, `created_at` (DESC)

**数据安全审计机制：** 敏感操作日志记录（管理员访问敏感信息记录到 `privacy_access_logs` 表，管理员操作敏感数据记录到 `admin_operation_logs` 表，用户敏感操作记录到用户行为日志），访问日志审计（定期审查 `privacy_access_logs` 表检查异常访问行为，对于频繁访问敏感信息的管理员进行安全审查，记录访问IP、访问时间、访问原因等信息），操作日志审计（定期审查 `admin_operation_logs` 表检查异常操作行为，对于敏感操作如封禁用户、审核提现、修改系统配置进行二次确认，记录操作前后的数据变更便于追溯），合规要求（敏感操作日志保留6个月满足合规要求，定期导出审计日志用于合规检查，建立审计日志的访问权限控制，仅超级管理员可查看）
