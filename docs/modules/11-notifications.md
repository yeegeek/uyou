# UYOU 无忧陪伴 - 通知模块

> 通知模块完整文档 | 包含PRD、API、数据库设计

---

## 一、PRD - 产品需求

### 1.1 功能清单

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 消息通知 | 订单状态变更、新消息提醒 | P0 |
| 通知中心 | 查看所有系统通知，支持标记已读 | P0 |

---

## 二、API - 接口设计

### 2.1 获取通知列表

**GET** `/notifications`

**查询参数：**
- `type` (optional) - 通知类型
- `isRead` (optional) - true/false
- `nextPage`, `pageSize`

**响应：**
```json
{
  "notifications": [ ... ],
  "pagination": { ... }
}
```

### 2.2 标记通知已读

**PATCH** `/notifications/:id/read`

### 2.3 全部标记已读

**POST** `/notifications/read-all`

### 2.4 获取未读数量

**GET** `/notifications/unread-count`

**响应：**
```json
{
  "count": 5,
}
```

### 2.5 获取系统公告

**GET** `/announcements`

**查询参数：**
- `type` (optional) - 1普通公告/2重要公告/3紧急公告
- `nextPage`, `pageSize`

**响应：**
```json
{
  "announcements": [ ... ],
  "pagination": { ... }
}
```

### 2.6 提交反馈

**POST** `/feedbacks`

**请求（FormData）：**
```
type: 1 // 1功能建议/2问题反馈/3投诉
content: "反馈内容"
images: File[]
contact: "联系方式（可选）"
```

---

## 三、Database - 数据库设计

### 3.1 notifications - 通知表

> 存储系统发送给用户的各类通知

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| user_id | UUID | FK → users.id | - | 接收用户ID |
| type | SMALLINT | NOT NULL | - | 通知类型（见枚举） |
| title | VARCHAR(100) | NOT NULL | - | 通知标题 |
| content | TEXT | NOT NULL | - | 通知内容 |
| related_type | VARCHAR(50) | - | - | 关联对象类型（order/demand/complaint等） |
| related_id | UUID | - | - | 关联对象ID |
| is_read | BOOLEAN | NOT NULL | false | 是否已读 |
| read_at | TIMESTAMP | - | - | 阅读时间 |

**通知类型枚举：**
| 值 | 类型 | 说明 |
|----|------|------|
| 1 | order | 订单相关（下单、接单、完成等） |
| 2 | demand | 需求相关（申请、匹配等） |
| 3 | payment | 支付相关（支付成功、退款等） |
| 4 | wallet | 钱包相关（收入、提现等） |
| 5 | review | 评价相关 |
| 6 | system | 系统通知 |
| 7 | promotion | 活动推广 |

**索引：**
```sql
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

### 3.2 user_devices - 用户设备表

> 存储用户设备信息，用于消息推送

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| user_id | UUID | FK → users.id | - | 用户ID |
| device_type | SMALLINT | NOT NULL | - | 设备类型：1iOS/2Android/3小程序 |
| device_id | VARCHAR(100) | - | - | 设备唯一标识 |
| push_token | VARCHAR(200) | - | - | 推送Token |
| wx_openid | VARCHAR(100) | - | - | 微信OpenID（小程序推送用） |
| app_version | VARCHAR(20) | - | - | APP版本号 |
| os_version | VARCHAR(50) | - | - | 系统版本 |
| is_active | BOOLEAN | NOT NULL | true | 是否活跃 |
| last_active_at | TIMESTAMP | - | - | 最后活跃时间 |

**索引：**
```sql
CREATE INDEX idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX idx_user_devices_push_token ON user_devices(push_token) WHERE push_token IS NOT NULL;
```

### 3.3 push_logs - 推送日志表

> 记录消息推送的发送和送达情况，用于数据分析和问题排查

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| notification_id | UUID | FK → notifications.id | - | 关联通知ID |
| user_id | UUID | FK → users.id | - | 目标用户ID |
| device_id | UUID | FK → user_devices.id | - | 目标设备ID |
| push_type | SMALLINT | NOT NULL | - | 推送类型：1微信小程序/2APP推送/3短信 |
| title | VARCHAR(100) | - | - | 推送标题 |
| content | VARCHAR(500) | - | - | 推送内容 |
| extra_data | JSONB | - | - | 附加数据（跳转参数等） |
| status | SMALLINT | NOT NULL | 0 | 状态：0待发送/1已发送/2发送失败/3已送达/4已点击 |
| error_code | VARCHAR(50) | - | - | 错误码 |
| error_message | VARCHAR(500) | - | - | 错误信息 |
| sent_at | TIMESTAMP | - | - | 发送时间 |
| delivered_at | TIMESTAMP | - | - | 送达时间 |
| clicked_at | TIMESTAMP | - | - | 点击时间 |

**索引：**
```sql
CREATE INDEX idx_push_logs_notification_id ON push_logs(notification_id);
CREATE INDEX idx_push_logs_user_id ON push_logs(user_id);
CREATE INDEX idx_push_logs_status ON push_logs(status);
CREATE INDEX idx_push_logs_created_at ON push_logs(created_at DESC);
```

### 3.4 announcements - 系统公告表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| title | VARCHAR(100) | NOT NULL | - | 公告标题 |
| content | TEXT | NOT NULL | - | 公告内容 |
| type | SMALLINT | NOT NULL | 1 | 类型：1普通公告/2重要公告/3紧急公告 |
| target | SMALLINT | NOT NULL | 0 | 目标用户：0全部/1普通用户/2顾问 |
| city_id | UUID | FK → cities.id | - | 指定城市（NULL为全部城市） |
| start_at | TIMESTAMP | NOT NULL | - | 生效开始时间 |
| end_at | TIMESTAMP | - | - | 生效结束时间（NULL为永久） |
| is_popup | BOOLEAN | NOT NULL | false | 是否弹窗展示 |
| sort_order | INTEGER | NOT NULL | 0 | 排序 |
| status | SMALLINT | NOT NULL | 1 | 状态：0下架/1上架 |
| created_by | UUID | FK → admins.id | - | 创建人 |

**索引：**
```sql
CREATE INDEX idx_announcements_status ON announcements(status);
CREATE INDEX idx_announcements_start_at ON announcements(start_at);
```

### 3.5 feedbacks - 用户反馈表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| user_id | UUID | FK → users.id | - | 反馈用户ID |
| type | SMALLINT | NOT NULL | 1 | 反馈类型：1功能建议/2问题反馈/3投诉建议/4其他 |
| content | TEXT | NOT NULL | - | 反馈内容 |
| images | JSONB | - | - | 截图URLs |
| contact | VARCHAR(50) | - | - | 联系方式（可选） |
| status | SMALLINT | NOT NULL | 0 | 状态：0待处理/1处理中/2已回复/3已关闭 |
| reply | TEXT | - | - | 回复内容 |
| handler_id | UUID | FK → admins.id | - | 处理人ID |
| replied_at | TIMESTAMP | - | - | 回复时间 |

**索引：**
```sql
CREATE INDEX idx_feedbacks_user_id ON feedbacks(user_id);
CREATE INDEX idx_feedbacks_status ON feedbacks(status);
CREATE INDEX idx_feedbacks_created_at ON feedbacks(created_at DESC);
```

### 3.6 banners - 首页轮播图表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| title | VARCHAR(100) | NOT NULL | - | 标题 |
| image_url | VARCHAR(500) | NOT NULL | - | 图片URL |
| link_type | SMALLINT | NOT NULL | 0 | 跳转类型：0无跳转/1小程序页面/2H5链接/3顾问详情 |
| link_url | VARCHAR(500) | - | - | 跳转地址 |
| position | SMALLINT | NOT NULL | 1 | 展示位置：1首页顶部/2首页中部 |
| city_id | UUID | FK → cities.id | - | 指定城市（NULL为全部城市） |
| start_at | TIMESTAMP | NOT NULL | - | 生效开始时间 |
| end_at | TIMESTAMP | - | - | 生效结束时间 |
| sort_order | INTEGER | NOT NULL | 0 | 排序 |
| status | SMALLINT | NOT NULL | 1 | 状态：0下架/1上架 |
| click_count | INTEGER | NOT NULL | 0 | 点击次数 |
| created_by | UUID | FK → admins.id | - | 创建人 |

**索引：**
```sql
CREATE INDEX idx_banners_position ON banners(position);
CREATE INDEX idx_banners_status ON banners(status);
CREATE INDEX idx_banners_start_at ON banners(start_at);
```

---

> **文档更新记录**
> - v1.0 (2026-01-07)：初稿，完成通知模块PRD/API/DB整合
