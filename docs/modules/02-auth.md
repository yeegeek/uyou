# UYOU 无忧陪伴 - 认证模块

> 认证模块完整文档 | 包含PRD、API、数据库设计

---

## 一、PRD - 产品需求

### 1.1 功能清单

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 微信一键登录 | 微信授权登录，获取头像昵称 | P0 |
| 手机号绑定 | 微信获取手机号，用于安全验证 | P0 |

### 1.2 业务流程

**登录流程：** 用户打开小程序 → 微信授权登录 → 获取OpenID/UnionID → 创建/更新用户记录 → 返回JWT Token

---

## 二、API - 接口设计

### 2.1 微信登录

**POST** `/auth/wechat/login`

**请求：**
```json
{
  "code": "微信授权code",
  "userInfo": { "nickName": "用户昵称", "avatarUrl": "头像URL" }
}
```

**响应：**
```json
{
  "token": "jwt_token",
  "refreshToken": "refresh_token",
  "user": { "id": "user_id", "nickname": "用户昵称", "avatar": "头像URL", "isConsultant": false }
}
```

### 2.2 绑定手机号

**POST** `/auth/wechat/bind-phone`

**请求：**
```json
{
  "code": "微信获取手机号code",
  "encryptedData": "加密数据",
  "iv": "初始向量"
}
```

**响应：**
```json
{ "phone": "138****8888" }
```

### 2.3 刷新Token

**POST** `/auth/refresh`

**请求：**
```json
{ "refreshToken": "refresh_token" }
```

**响应：**
```json
{
  "token": "new_jwt_token",
  "refreshToken": "new_refresh_token"
}
```

### 2.4 退出登录

**POST** `/auth/logout`

**响应：** HTTP 204 No Content

---

## 三、Database - 数据库设计

### 3.1 users - 用户表（认证相关字段）

> 认证相关字段，完整表结构见 [用户模块](./01-users.md)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| wx_openid | VARCHAR(100) | UNIQUE | 微信OpenID |
| wx_unionid | VARCHAR(100) | UNIQUE | 微信UnionID |
| phone | VARCHAR(20) | UNIQUE, NOT NULL | 手机号（加密存储） |
| login_at | TIMESTAMP | - | 最后登录时间 |
| last_active_ip | VARCHAR(50) | - | 最后活跃IP（风控用） |

**索引：** `wx_openid` (UNIQUE), `wx_unionid` (UNIQUE), `phone` (UNIQUE)
