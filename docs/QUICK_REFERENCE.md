# 快速参考表

> 常用枚举值、接口、字段映射速查表

---

## 一、枚举值速查

### 订单状态

| 值 | 状态码 | 说明 |
|----|--------|------|
| 0 | pending_accept | 待接单 |
| 1 | pending_payment | 待支付 |
| 2 | paid | 已支付，待服务 |
| 3 | in_progress | 服务中 |
| 4 | pending_confirm | 待确认完成 |
| 5 | completed | 已完成 |
| 6 | cancelled | 已取消 |
| 7 | refunded | 已退款 |
| 8 | expired | 已过期 |

### 支付状态

| 值 | 状态码 | 说明 |
|----|--------|------|
| 0 | pending | 待支付 |
| 1 | paid | 已支付 |
| 2 | closed | 已关闭 |

### 需求状态

| 值 | 状态码 | 说明 |
|----|--------|------|
| 0 | pending | 待匹配 |
| 1 | matching | 系统匹配中 |
| 2 | matched | 已匹配 |
| 3 | accepted | 顾问已接单 |
| 4 | confirmed | 已确认 |
| 5 | expired | 已过期 |
| 6 | cancelled | 已取消 |

### 顾问状态

| 值 | 状态码 | 说明 |
|----|--------|------|
| 0 | pending | 待审核 |
| 1 | active | 正常 |
| 2 | rejected | 审核拒绝 |
| 3 | banned | 已封禁 |

### 顾问在线状态

| 值 | 状态码 | 说明 |
|----|--------|------|
| 0 | offline | 离线 |
| 1 | online | 在线 |
| 2 | busy | 忙碌 |

### 服务模式

| 值 | 状态码 | 说明 |
|----|--------|------|
| 1 | offline | 线下 |
| 2 | online_video | 线上视频 |
| 3 | online_voice | 线上语音 |

---

## 二、常用接口速查

### 用户相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `/users/me` | GET/PATCH | 获取/更新用户信息 |
| `/users/verification` | POST/GET | 提交/查询实名认证 |

### 订单相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `/orders` | GET | 获取订单列表 |
| `/orders/:id` | GET | 获取订单详情 |
| `/orders/:id/accept` | POST | 顾问接单 |
| `/orders/:id/cancel` | POST | 取消订单 |
| `/orders/:id/complete` | POST | 确认完成 |

### 支付相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `/payments` | POST | 创建支付 |
| `/payments/:id/status` | GET | 查询支付状态 |
| `/consultants/wallet` | GET | 获取钱包信息（顾问） |
| `/consultants/withdraw` | POST | 申请提现（顾问） |

### 需求相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `/demands` | POST/GET | 发布需求/获取需求列表 |
| `/demands/:id` | GET | 获取需求详情 |
| `/demands/:id/apply` | POST | 申请接单 |
| `/demands/:id/select-consultant` | POST | 选择顾问 |

### 认证相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `/auth/wechat/login` | POST | 微信登录 |
| `/auth/wechat/bind-phone` | POST | 绑定手机号 |
| `/auth/refresh` | POST | 刷新Token |

---

## 三、字段映射速查

### API ↔ Database 字段映射

| API字段（驼峰） | 数据库字段（下划线） | 类型 |
|----------------|-------------------|------|
| `orderId` | `order_id` | UUID |
| `userId` | `user_id` | UUID |
| `consultantId` | `consultant_id` | UUID |
| `createdAt` | `created_at` | TIMESTAMP |
| `updatedAt` | `updated_at` | TIMESTAMP |
| `orderNo` | `order_no` | VARCHAR(32) |
| `serviceMode` | `service_mode` | SMALLINT |
| `serviceAddress` | `service_address` | VARCHAR(200) |

**通用字段：** 所有表包含 `id` (UUID)、`created_at`、`updated_at`、`deleted_at` (可选)

---

## 四、数据类型速查

- **金额**：API `number`，数据库 `DECIMAL(10,2)`，单位元（人民币），精度2位小数
- **时间**：API `string` (ISO 8601)，数据库 `TIMESTAMP`，时区UTC
- **UUID**：API `string`，数据库 `UUID`
- **地理位置**：API `{lat: number, lng: number}`，数据库 `GEOGRAPHY(Point, 4326)` (PostGIS)，格式WGS84

---

## 五、错误码速查

| 错误码 | HTTP | 说明 |
|--------|------|------|
| `AUTH_INVALID_TOKEN` | 401 | Token无效 |
| `AUTH_TOKEN_EXPIRED` | 401 | Token已过期 |
| `USER_NOT_FOUND` | 404 | 用户不存在 |
| `ORDER_NOT_FOUND` | 404 | 订单不存在 |
| `ORDER_STATUS_ERROR` | 422 | 订单状态错误 |
| `INVALID_PARAM` | 400 | 参数格式错误 |

**完整错误码列表：** `docs/modules/00-shared.md`

---

## 六、分页参数

**请求参数：** `nextPage`（页码或id，首次请求不传或传null）、`pageSize`（默认20，最大100）

**响应格式：**
```json
{
  "资源名复数": [ ... ],
  "pagination": {
    "nextPage": 2,
    "pageSize": 20,
    "hasMore": true
  }
}
```

---

## 七、认证方式

**请求头：** `Authorization: Bearer {jwt_token}`

**Token类型：** Access Token（有效期2小时）、Refresh Token（有效期7天）

---

> 最后更新：2026-01-16 | 详细文档见 `docs/modules/`
