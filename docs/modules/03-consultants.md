# UYOU 无忧陪伴 - 顾问模块

> 顾问模块完整文档 | 包含PRD、API、数据库设计

---

## 一、PRD - 产品需求

### 1.1 功能清单

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 申请入驻 | 提交基本信息、照片、视频自我介绍 | P0 |
| 实名认证 | 身份证+人脸识别（必须） | P0 |
| 培训考核 | 观看培训视频 + 在线考试 | P0 |
| 审核状态 | 查看审核进度、驳回原因 | P0 |
| 需求大厅 | 查看用户发布的情感需求，可筛选 | P0 |
| 申请接单 | 对需求提交申请，可自定义报价和留言 | P0 |
| 咨询消息 | 处理用户的售前咨询消息 | P0 |
| 系统推送 | 接收系统智能匹配推送的需求 | P0 |
| 预约管理 | 查看用户对自己的直接预约申请 | P0 |
| 接单/拒单 | 确认或拒绝用户的预约 | P0 |
| 订单列表 | 查看进行中、待服务、已完成订单 | P0 |
| 服务开始/结束 | 打卡确认服务时间 | P0 |
| 基本信息 | 编辑昵称、头像、个人简介 | P0 |
| 照片墙 | 上传生活照（最多9张） | P0 |
| 视频介绍 | 使用前置摄像头现场录制自我介绍视频（必须，禁止上传，防止造假） | P0 |
| 服务设置 | 设置可提供的服务类型、价格、时间 | P0 |
| 服务范围 | 设置可服务的区域 | P0 |
| 在线状态 | 设置忙碌/在线/离线 | P0 |
| 收入概览 | 今日收入、本周收入、累计收入 | P0 |
| 收入明细 | 每笔订单的收入详情 | P0 |
| 待结算金额 | 服务完成后进入7天待结算期 | P0 |
| 提现 | 提现到微信零钱 | P0 |
| 提现记录 | 历史提现记录 | P1 |

### 1.2 业务流程

**情感顾问入驻流程：** 用户点击"成为情感顾问" → 填写基本信息 → 上传照片/视频 → 上传视频自我介绍 → 实名认证 → 提交审核 → 等待审核（1-3工作日）→ 审核通过进入培训阶段/驳回（最多3次，失败后30天冷却）→ 培训阶段观看培训视频（进度100%）→ 预约视频面试 → 参加视频面试考核 → 管理员录入面试结果 → 面试通过正式上线/不通过可预约补考（最多2次，2次补考未通过需重新提交资料，重审累计3次失败永久禁止）

**入驻状态机：** draft → submitted → under_review → training → exam → active  
**限制规则：** 审核最多3次（失败后30天冷却），面试最多2次补考，累计3次重审失败永久禁止

### 1.3 页面清单

| 模块 | 页面路径 | 说明 |
|------|---------|------|
| 入驻 | /pages/partner/{apply,status,training} | 申请、审核状态、培训 |
| 接单服务 | /pages/partner/{workbench,hall,consult} | 工作台、订单大厅、咨询 |
| 管理 | /pages/partner/{service,profile,income,withdraw,reviews} | 服务设置、主页管理、收入、提现、评价 |

---

## 二、API - 接口设计

### 2.1 申请成为顾问

**POST** `/consultants/apply`

**请求（FormData）：** `nickname`, `age`, `height`, `education`, `occupation`, `cityId`, `introVideo` (File), `albums` (File[])

### 2.2 获取申请状态

**GET** `/consultants/application/status`

**响应：**
```json
{
  "status": 0,
  "rejectReason": null,
  "currentStep": "审核中"
}
```

### 2.3 获取培训课程列表

**GET** `/training/courses`

**响应：**
```json
{ "courses": [ ... ] }
```

### 2.4 更新培训进度

**POST** `/training/courses/:id/progress`

**请求：**
```json
{ "progress": 100 }
```

### 2.5 预约面试

**POST** `/consultants/exam/schedule`

**请求：**
```json
{ "scheduledAt": "2026-01-20T10:00:00Z" }
```

### 2.6 获取需求大厅

**GET** `/consultants/demands/hall`

**查询参数：** `cityId` (optional), `categoryId` (optional), `status` (optional) - 0待匹配, `nextPage`, `pageSize`

**响应：**
```json
{
  "demands": [ ... ],
  "pagination": { ... }
}
```

### 2.7 申请接单（需求）

**POST** `/demands/:id/apply`

**请求：**
```json
{
  "price": 200.00,
  "message": "我可以提供..."
}
```

### 2.8 更新服务设置

**PATCH** `/consultants/services/:id`

**请求：**
```json
{
  "price": 120.00,
  "minDuration": 2,
  "maxDuration": 8,
  "serviceRadius": 10,
  "description": "服务描述",
  "isEnabled": true
}
```

### 2.9 设置在线状态

**PATCH** `/consultants/online-status`

**请求：**
```json
{ "status": 1 }
```

### 2.10 获取收入概览

**GET** `/consultants/income/overview`

**响应：**
```json
{
  "today": 200.00,
  "thisWeek": 1500.00,
  "thisMonth": 6000.00,
  "total": 50000.00,
  "pendingSettlement": 800.00,
  "availableBalance": 5000.00
}
```

### 2.11 获取收入明细

**GET** `/consultants/income/transactions`

**查询参数：** `type` (optional) - 1收入/2提现/3结算, `nextPage`, `pageSize`

**响应：**
```json
{
  "transactions": [ ... ],
  "pagination": { ... }
}
```

### 2.12 申请提现

**POST** `/consultants/withdraw`

**请求：**
```json
{ "amount": 1000.00 }
```

**响应：**
```json
{
  "withdrawId": "withdraw_id",
  "amount": 1000.00,
  "fee": 0.00,
  "actualAmount": 1000.00,
  "status": 0,
  "estimatedArrival": "2026-01-16T10:00:00Z"
}
```

### 2.13 获取提现记录

**GET** `/consultants/withdraws`

**查询参数：** `status` (optional) - 0待审核/1已通过/2已拒绝, `nextPage`, `pageSize`

**响应：**
```json
{
  "withdraws": [ ... ],
  "pagination": { ... }
}
```

### 2.14 管理后台 - 培训课程管理

#### 2.14.1 创建培训课程

**POST** `/admin/training/courses`

**请求：**
```json
{
  "title": "情感陪伴服务规范",
  "description": "介绍情感陪伴服务的基本规范和注意事项",
  "videoUrl": "https://example.com/video.mp4",
  "videoDuration": 1800,
  "content": "课程文字内容（可选）",
  "sortOrder": 1,
  "isRequired": true
}
```

**响应：**
```json
{
  "id": "course_id",
  "title": "情感陪伴服务规范",
  "isEnabled": true,
  "createdAt": "2026-01-15T10:00:00Z"
}
```

#### 2.14.2 获取培训课程列表

**GET** `/admin/training/courses`

**查询参数：** `isEnabled` (optional), `isRequired` (optional), `nextPage`, `pageSize`

**响应：**
```json
{
  "courses": [ ... ],
  "pagination": { ... }
}
```

#### 2.14.3 更新培训课程

**PATCH** `/admin/training/courses/:id`

**请求：**
```json
{
  "title": "更新后的标题",
  "description": "更新后的描述",
  "videoUrl": "https://example.com/new-video.mp4",
  "videoDuration": 2000,
  "sortOrder": 2,
  "isRequired": false,
  "isEnabled": true
}
```

#### 2.14.4 删除培训课程

**DELETE** `/admin/training/courses/:id`

**说明：** 删除前需检查是否有顾问正在学习该课程，如有则不允许删除

#### 2.14.5 获取顾问培训进度

**GET** `/admin/consultants/:id/training-progress`

**响应：**
```json
{
  "consultantId": "consultant_id",
  "totalProgress": 85.5,
  "requiredProgress": 100.0,
  "canTakeExam": false,
  "courses": [ ... ]
}
```

### 2.15 管理后台 - 面试结果处理

#### 2.15.1 录入面试结果

**POST** `/admin/consultants/exams/:id/result`

**请求：**
```json
{
  "score": 85,
  "result": 1,
  "comment": "表现良好，沟通能力强，建议通过",
  "videoUrl": "https://storage.example.com/exams/exam_id.mp4"
}
```

**参数说明：** `score`评分（1-100，可选）、`result`结果（1通过/2不通过）、`comment`考官评语（必填）、`videoUrl`面试录像URL（可选）

**响应：**
```json
{
  "examId": "exam_id",
  "consultantId": "consultant_id",
  "score": 85,
  "result": 1,
  "comment": "表现良好，沟通能力强，建议通过",
  "examinedAt": "2026-01-15T10:00:00Z"
}
```

**业务逻辑：** 录入结果后自动更新 `consultant_exams` 表，如果结果为"通过"（result=1）自动更新顾问状态为 `active`（正式上线），如果结果为"不通过"（result=2）顾问状态保持 `exam`，可预约补考

#### 2.15.2 获取面试记录列表

**GET** `/admin/consultants/exams`

**查询参数：** `consultantId` (optional), `result` (optional) - 0待评/1通过/2不通过, `examinerId` (optional), `nextPage`, `pageSize`

**响应：**
```json
{
  "exams": [ ... ],
  "pagination": { ... }
}
```

#### 2.15.3 获取面试录像

**GET** `/admin/consultants/exams/:id/video`

**说明：** 返回面试录像的访问URL（带签名，有时效性）

**响应：**
```json
{
  "videoUrl": "https://storage.example.com/exams/exam_id.mp4?signature=xxx&expires=xxx",
  "expiresAt": "2026-01-15T11:00:00Z"
}
```

**访问权限：** 仅管理员可访问面试录像，录像URL带签名有效期1小时，访问记录记录到 `privacy_access_logs` 表（target_type='exam_video'）

---

## 三、Database - 数据库设计

### 3.1 consultants - 情感顾问表

> **设计说明**：consultants 与 users 是 **1:1 共享主键** 关系
> - `consultants.id` 直接等于 `users.id`，无需单独的 `user_id` 字段
> - 这是"扩展表"模式：users 存储基础信息，consultants 存储顾问特有信息
> - 查询时通过 `JOIN users ON users.id = consultants.id` 获取完整信息
>
> **位置说明**：顾问的精确位置存储在 `user_locations` 表中
> - 顾问需在 user_locations 设置位置并标记 `is_current=true`
> - 需求匹配时根据 user_locations 中的坐标计算距离

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK, FK → users.id | - | 主键（= users.id，共享主键） |
| intro_video | VARCHAR(500) | NOT NULL | - | 自我介绍视频URL |
| intro_text | TEXT | - | - | 自我介绍文字（从视频提取） |
| age | SMALLINT | - | - | 年龄 |
| height | SMALLINT | - | - | 身高(cm) |
| education | VARCHAR(50) | - | - | 学历 |
| occupation | VARCHAR(50) | - | - | 职业 |
| city_id | UUID | FK → cities.id | - | 服务城市 |
| avg_rating | DECIMAL(2,1) | NOT NULL | 5.0 | 平均评分 |
| total_orders | INTEGER | NOT NULL | 0 | 总订单数 |
| total_reviews | INTEGER | NOT NULL | 0 | 总评价数 |
| completion_rate | DECIMAL(5,2) | NOT NULL | 100.00 | 完成率(%) |
| credit_score | INTEGER | NOT NULL | 100 | 信用分 |
| online_status | SMALLINT | NOT NULL | 0 | 在线状态：0离线/1在线/2忙碌 |
| status | SMALLINT | NOT NULL | 0 | 状态：0待审核/1正常/2审核拒绝/3已封禁 |
| reject_reason | VARCHAR(200) | - | - | 审核拒绝原因 |
| fee_rate | DECIMAL(4,2) | - | NULL | 个人抽佣比例（NULL则使用系统默认） |
| approved_at | TIMESTAMP | - | - | 审核通过时间 |

**索引：** `city_id`, `status`, `online_status`, `avg_rating` (DESC), `total_orders` (DESC)

### 3.2 user_albums - 用户相册表（通用）

> 用户和情感顾问都可以使用此表存储照片/视频

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| user_id | UUID | FK → users.id | - | 用户ID |
| media_type | SMALLINT | NOT NULL | 1 | 媒体类型：1图片/2视频 |
| media_url | VARCHAR(500) | NOT NULL | - | 媒体URL |
| thumbnail_url | VARCHAR(500) | - | - | 缩略图URL |
| sort_order | INTEGER | NOT NULL | 0 | 排序顺序 |
| status | SMALLINT | NOT NULL | 1 | 状态：0待审核/1正常/2审核拒绝 |

**索引：** `user_id`

### 3.3 consultant_services - 顾问服务项目表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| consultant_id | UUID | FK → consultants.id | - | 顾问ID |
| category_id | UUID | FK → categories.id | - | 服务类目ID |
| service_mode | SMALLINT | NOT NULL | 1 | 服务模式：1线下/2线上视频/3线上语音 |
| price | DECIMAL(10,2) | NOT NULL | - | 单价（元/小时） |
| min_duration | INTEGER | NOT NULL | 1 | 最小时长（小时） |
| max_duration | INTEGER | NOT NULL | 8 | 最大时长（小时） |
| service_radius | INTEGER | - | - | 服务半径(km)，线上服务可为空 |
| description | VARCHAR(500) | - | - | 服务描述 |
| is_enabled | BOOLEAN | NOT NULL | true | 是否启用 |

**索引：** `consultant_id`, `category_id`, `(consultant_id, category_id, service_mode)` (UNIQUE)

### 3.4 consultant_schedules - 顾问排班表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| consultant_id | UUID | FK → consultants.id | - | 顾问ID |
| day_of_week | SMALLINT | NOT NULL | - | 星期几：1-7 |
| start_time | TIME | NOT NULL | - | 开始时间 |
| end_time | TIME | NOT NULL | - | 结束时间 |
| is_enabled | BOOLEAN | NOT NULL | true | 是否启用 |

**索引：** `consultant_id`

**档期冲突检测实现说明：** 仅检查排班表是不够的，预约时系统必须同时检查：1. 通用排班（该时段是否在顾问的工作时间内），2. 现有订单（该时段是否已被其他订单占用）

**高并发防护：** 当多人同时预约同一顾问同一时段时，需要使用数据库悲观锁（`SELECT ... FOR UPDATE NOWAIT`）或Redis分布式锁（Key: `consultant:schedule:{consultant_id}:{date}:{hour}`）防止超卖

### 3.5 training_courses - 培训课程表

> **功能说明**：管理后台创建和管理培训课程，顾问需完成所有课程的学习才能参加面试

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| title | VARCHAR(200) | NOT NULL | - | 课程标题 |
| description | TEXT | - | - | 课程描述 |
| video_url | VARCHAR(500) | NOT NULL | - | 课程视频URL |
| video_duration | INTEGER | NOT NULL | - | 视频时长（秒） |
| content | TEXT | - | - | 课程文字内容（可选） |
| sort_order | INTEGER | NOT NULL | 0 | 排序顺序（数字越小越靠前） |
| is_required | BOOLEAN | NOT NULL | true | 是否必修（必修课程必须100%完成） |
| is_enabled | BOOLEAN | NOT NULL | true | 是否启用 |
| created_by | UUID | FK → admins.id | - | 创建人ID |
| updated_by | UUID | FK → admins.id | - | 更新人ID |

**索引：** `is_enabled`, `sort_order`

**培训进度计算逻辑：**
- 完成度计算：单个课程完成度 = `consultant_trainings.progress`（0-100%），总完成度 = `SUM(必修课程完成度) / 必修课程总数 × 100%`，只有必修课程（`is_required=true`）计入总完成度
- 是否可参加考试的条件：所有必修课程（`is_required=true`）的完成度必须达到100%，总完成度 = 100%，顾问状态为 `training`（培训阶段）
- 培训进度更新时机：顾问观看视频时前端定时上报进度（如每10秒上报一次），视频播放完成时自动标记为100%，系统定时检查培训进度，更新总完成度

### 3.6 consultant_trainings - 顾问培训记录表

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| consultant_id | UUID | FK → consultants.id | - | 顾问ID |
| course_id | UUID | FK → training_courses.id | - | 课程ID |
| progress | DECIMAL(5,2) | NOT NULL | 0 | 学习进度(%) |
| completed_at | TIMESTAMP | - | - | 完成时间 |

**索引：** `consultant_id`, `course_id`, `(consultant_id, course_id)` (UNIQUE)

### 3.7 exam_schedules - 面试预约表

> 顾问申请入驻后，需预约视频面试时间

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| consultant_id | UUID | FK → consultants.id | - | 顾问ID（待审核状态） |
| examiner_id | UUID | FK → admins.id | - | 预约考官ID |
| scheduled_at | TIMESTAMP | NOT NULL | - | 预约面试时间 |
| duration | INTEGER | NOT NULL | 30 | 预计时长（分钟） |
| meeting_url | VARCHAR(500) | - | - | 面试房间URL/链接 |
| status | SMALLINT | NOT NULL | 0 | 状态：0待确认/1已确认/2已取消/3已完成 |
| cancel_reason | VARCHAR(200) | - | - | 取消原因 |
| reminder_sent | BOOLEAN | NOT NULL | false | 是否已发送提醒 |

**索引：** `consultant_id`, `examiner_id`, `scheduled_at`, `status`

### 3.8 consultant_exams - 顾问考试记录表

> 面试完成后的考核结果记录

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| consultant_id | UUID | FK → consultants.id | - | 顾问ID |
| schedule_id | UUID | FK → exam_schedules.id | - | 关联预约ID |
| examiner_id | UUID | FK → admins.id | - | 考官ID |
| video_url | VARCHAR(500) | - | - | 面试录像URL（存储位置见下方说明） |
| video_storage_type | VARCHAR(50) | - | - | 存储类型：local/oss/cos/第三方视频会议服务 |
| score | INTEGER | - | - | 评分（1-100） |
| result | SMALLINT | NOT NULL | 0 | 结果：0待评/1通过/2不通过 |
| comment | TEXT | - | - | 考官评语 |
| exam_at | TIMESTAMP | NOT NULL | - | 考试时间 |

**索引：** `consultant_id`, `schedule_id`, `examiner_id`, `result`

**面试录像存储设计：**
- 存储位置：方案1（推荐）使用第三方视频会议服务（如腾讯会议、Zoom）的自动录制功能，面试房间创建时启用自动录制，面试结束后服务自动生成录像URL，将录像URL存储到 `video_url` 字段；方案2使用对象存储服务（OSS/COS），面试时客户端录制视频并上传到OSS/COS，存储路径：`exams/{exam_id}/{timestamp}.mp4`
- 访问权限：仅管理员可访问面试录像，访问时生成带签名的临时URL（有效期1小时），访问记录记录到 `privacy_access_logs` 表（target_type='exam_video'），录像保留期限：永久保存（用于审计和申诉）
- 录像URL生成：如果使用第三方视频会议服务直接使用服务提供的录像URL，如果使用OSS/COS访问时生成带签名的临时URL

### 3.9 credit_score_logs - 信用分变更日志表

> **功能说明**：记录顾问信用分的所有变更，用于运营审计和申诉追溯
> - 扣分原因：订单取消、投诉成立、违规行为等
> - 加分原因：好评、服务完成、申诉成功等

**顾问信用分规则说明：**

**初始信用分：** 100分

**扣分规则：** 订单取消扣分（顾问取消订单服务未开始：距服务开始24小时以上扣5分，12-24小时扣10分，12小时内扣20分；服务进行中扣30分）、投诉成立扣分（轻微违规扣10分，严重违规扣20-50分，严重违规如骚扰/欺诈扣50-100分）、违规行为扣分（根据违规严重程度扣10-100分）

**加分规则：** 订单完成（每完成10单+1分，累计完成订单数达到10的倍数时加分）、好评奖励（5星好评+2分，每个5星好评）、申诉成功（恢复被扣分数，申诉成功后撤销之前的扣分记录）

**信用分限制：** 扣减上限最低0分（信用分不会低于0分），加分上限最高100分（信用分不会超过100分）

**信用分影响：** 信用分<60限制接单（无法接收新订单），信用分<40暂停服务（暂时封禁，需申诉恢复），信用分=0永久封禁（无法恢复）

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| consultant_id | UUID | FK → consultants.id, NOT NULL | - | 顾问ID |
| delta | INTEGER | NOT NULL | - | 变更分数（正数加分，负数扣分） |
| score_before | INTEGER | NOT NULL | - | 变更前分数 |
| score_after | INTEGER | NOT NULL | - | 变更后分数 |
| reason | VARCHAR(200) | NOT NULL | - | 变更原因 |
| reason_type | SMALLINT | NOT NULL | - | 原因类型：1订单取消/2投诉成立/3违规行为/4好评/5申诉成功/6其他 |
| related_order_id | UUID | FK → orders.id | - | 关联订单ID（如有） |
| related_complaint_id | UUID | FK → complaints.id | - | 关联投诉ID（如有） |
| operator_id | UUID | FK → admins.id | - | 操作人ID（系统自动扣分则为空） |
| remark | VARCHAR(500) | - | - | 备注 |

**索引：** `consultant_id`, `related_order_id` WHERE related_order_id IS NOT NULL, `reason_type`, `created_at` (DESC)
