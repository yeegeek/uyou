# 微信小程序页面路由文档

> 微信小程序页面路由配置和跳转关系说明

> 版本：v1.0 | 更新日期：2026-01-15

---

## 一、路由配置说明

### 1.1 app.json 配置

小程序页面路由在 `app.json` 中配置，包含：
- `pages`：页面路径列表（第一个为首页）
- `tabBar`：底部Tab配置
- `window`：窗口配置

### 1.2 页面路径规范

- 页面路径：`pages/{模块}/{页面名}/index`
- 组件路径：`components/{组件名}/index`
- 服务路径：`services/{模块名}.ts`
- 工具路径：`utils/{工具名}.ts`

---

## 二、用户端页面路由

### 2.1 Tab配置（5个Tab）

```json
{
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#FF6B35",
    "backgroundColor": "#FFFFFF",
    "list": [
      {
        "pagePath": "pages/discovery/index",
        "text": "发现",
        "iconPath": "assets/icons/discovery.png",
        "selectedIconPath": "assets/icons/discovery-active.png"
      },
      {
        "pagePath": "pages/demand/list",
        "text": "需求",
        "iconPath": "assets/icons/demand.png",
        "selectedIconPath": "assets/icons/demand-active.png"
      },
      {
        "pagePath": "pages/order/list",
        "text": "订单",
        "iconPath": "assets/icons/order.png",
        "selectedIconPath": "assets/icons/order-active.png"
      },
      {
        "pagePath": "pages/message/list",
        "text": "消息",
        "iconPath": "assets/icons/message.png",
        "selectedIconPath": "assets/icons/message-active.png"
      },
      {
        "pagePath": "pages/profile/index",
        "text": "我的",
        "iconPath": "assets/icons/profile.png",
        "selectedIconPath": "assets/icons/profile-active.png"
      }
    ]
  }
}
```

### 2.2 页面路径列表

#### 发现模块
- `pages/discovery/index` - 发现首页（Tab首页）
- `pages/discovery/search` - 搜索页
- `pages/consultant/detail` - 顾问详情

#### 需求模块
- `pages/demand/list` - 我的需求（Tab）
- `pages/demand/create` - 发布需求
- `pages/demand/detail` - 需求详情

#### 订单模块
- `pages/order/list` - 订单列表（Tab）
- `pages/order/create` - 预约顾问
- `pages/order/confirm` - 订单确认
- `pages/order/detail` - 订单详情
- `pages/order/review` - 评价页

#### 支付模块
- `pages/payment/index` - 支付页

#### 通讯模块
- `pages/message/list` - 消息列表（Tab）
- `pages/message/chat` - 聊天页

#### 个人中心模块
- `pages/profile/index` - 个人中心（Tab）
- `pages/profile/edit` - 编辑资料
- `pages/profile/verification` - 实名认证
- `pages/profile/emergency` - 紧急联系人
- `pages/profile/favorites` - 我的收藏

#### 安全模块
- `pages/security/help` - 紧急求助
- `pages/security/report` - 投诉举报

#### 其他模块
- `pages/review/list` - 评价列表
- `pages/notification/list` - 通知列表

#### 认证模块
- `pages/auth/login` - 登录页

#### 通用页面
- `pages/common/error` - 错误页
- `pages/common/loading` - 加载页
- `pages/common/webview` - H5页面

### 2.3 页面跳转关系

```
启动页
  ↓
登录页（未登录）
  ↓
发现首页（已登录）
  ├─→ 搜索页
  └─→ 顾问详情
      ├─→ 咨询（跳转聊天页）
      └─→ 立即预约（跳转预约页）

需求Tab
  ├─→ 发布需求
  ├─→ 我的需求
  │   └─→ 需求详情
  │       └─→ 选择顾问（生成订单）
  └─→ 需求详情

订单Tab
  ├─→ 订单列表
  │   └─→ 订单详情
  │       ├─→ 支付页
  │       ├─→ 评价页
  │       └─→ 聊天页
  ├─→ 预约顾问（从顾问详情）
  └─→ 订单确认（从预约页）

消息Tab
  ├─→ 消息列表
  └─→ 聊天页

我的Tab
  ├─→ 编辑资料
  ├─→ 实名认证
  ├─→ 紧急联系人
  ├─→ 我的收藏
  ├─→ 紧急求助
  └─→ 投诉举报
```

---

## 三、顾问端页面路由

### 3.1 Tab配置（5个Tab）

```json
{
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#6BC5FF",
    "backgroundColor": "#FFFFFF",
    "list": [
      {
        "pagePath": "pages/partner/workbench",
        "text": "工作台",
        "iconPath": "assets/icons/workbench.png",
        "selectedIconPath": "assets/icons/workbench-active.png"
      },
      {
        "pagePath": "pages/partner/hall",
        "text": "需求大厅",
        "iconPath": "assets/icons/hall.png",
        "selectedIconPath": "assets/icons/hall-active.png"
      },
      {
        "pagePath": "pages/partner/orders",
        "text": "订单",
        "iconPath": "assets/icons/order.png",
        "selectedIconPath": "assets/icons/order-active.png"
      },
      {
        "pagePath": "pages/partner/income",
        "text": "收入",
        "iconPath": "assets/icons/income.png",
        "selectedIconPath": "assets/icons/income-active.png"
      },
      {
        "pagePath": "pages/partner/profile",
        "text": "我的",
        "iconPath": "assets/icons/profile.png",
        "selectedIconPath": "assets/icons/profile-active.png"
      }
    ]
  }
}
```

### 3.2 页面路径列表

#### 入驻模块
- `pages/partner/apply` - 申请入驻
- `pages/partner/status` - 审核状态
- `pages/partner/training` - 培训考核

#### 工作台模块
- `pages/partner/workbench` - 工作台（Tab首页）
- `pages/partner/consult` - 咨询管理

#### 需求大厅模块
- `pages/partner/hall` - 需求大厅（Tab）

#### 订单管理模块
- `pages/partner/orders` - 订单列表（Tab）
- `pages/partner/order-detail` - 订单详情

#### 收入管理模块
- `pages/partner/income` - 收入概览（Tab）
- `pages/partner/withdraw` - 提现管理

#### 管理模块
- `pages/partner/profile` - 主页管理（Tab）
- `pages/partner/service` - 服务设置
- `pages/partner/reviews` - 评价管理

### 3.3 页面跳转关系

```
登录页（未登录）
  ↓
申请入驻（未成为顾问）
  ↓
审核状态
  ↓
培训考核（审核通过）
  ↓
工作台（正式上线）
  ├─→ 咨询管理
  ├─→ 需求大厅
  │   └─→ 申请接单（生成订单）
  ├─→ 订单列表
  │   └─→ 订单详情
  ├─→ 收入概览
  │   └─→ 提现管理
  └─→ 主页管理
      ├─→ 服务设置
      └─→ 评价管理
```

---

## 四、用户类型切换

### 4.1 切换逻辑

- **普通用户**：显示用户端Tab（5个Tab）
- **情感顾问**：显示顾问端Tab（5个Tab）
- **未认证顾问**：显示用户端Tab，但可以申请入驻

### 4.2 切换入口

- 用户端：个人中心 → "成为情感顾问" → 申请入驻
- 顾问端：我的 → "切换为用户端" → 切换回用户端

---

## 五、页面跳转方法

### 5.1 使用 wx.navigateTo（保留当前页面）

```typescript
// 跳转到新页面
wx.navigateTo({
  url: '/pages/consultant/detail?id=123'
})
```

### 5.2 使用 wx.redirectTo（关闭当前页面）

```typescript
// 重定向到新页面
wx.redirectTo({
  url: '/pages/auth/login'
})
```

### 5.3 使用 wx.switchTab（切换到Tab页面）

```typescript
// 切换到Tab页面
wx.switchTab({
  url: '/pages/discovery/index'
})
```

### 5.3 使用 wx.navigateBack（返回上一页）

```typescript
// 返回上一页
wx.navigateBack({
  delta: 1  // 返回层数
})
```

---

## 六、路由参数传递

### 6.1 传递参数

```typescript
// 跳转时传递参数
wx.navigateTo({
  url: '/pages/order/detail?id=123&type=normal'
})
```

### 6.2 接收参数

```typescript
// 在页面 onLoad 中接收参数
onLoad(options: { id: string; type: string }) {
  const { id, type } = options
  // 使用参数
}
```

---

## 七、页面生命周期

### 7.1 页面生命周期顺序

```
onLoad（页面加载）
  ↓
onShow（页面显示）
  ↓
onReady（页面初次渲染完成）
  ↓
onHide（页面隐藏）
  ↓
onUnload（页面卸载）
```

### 7.2 生命周期使用场景

- **onLoad**：接收路由参数，初始化数据
- **onShow**：刷新数据（如订单列表、消息列表）
- **onReady**：页面渲染完成后操作（如设置页面标题）
- **onHide**：保存页面状态
- **onUnload**：清理资源（如取消订阅、关闭连接）

---

## 八、页面配置

### 8.1 页面级配置（页面.json）

```json
{
  "navigationBarTitleText": "页面标题",
  "navigationBarBackgroundColor": "#FFFFFF",
  "navigationBarTextStyle": "black",
  "enablePullDownRefresh": true,
  "onReachBottomDistance": 50
}
```

### 8.2 全局配置（app.json）

```json
{
  "window": {
    "navigationBarTitleText": "UYOU 无忧陪伴",
    "navigationBarBackgroundColor": "#FFFFFF",
    "navigationBarTextStyle": "black",
    "backgroundColor": "#F5F5F5"
  }
}
```

---

## 九、注意事项

1. **Tab页面限制**：最多5个Tab，Tab页面不能使用 `wx.navigateTo`，必须使用 `wx.switchTab`
2. **页面层级限制**：最多10层页面栈，超过需要先关闭部分页面
3. **路由参数**：URL参数有长度限制，复杂数据建议使用全局状态或缓存
4. **页面跳转**：Tab页面跳转使用 `wx.switchTab`，非Tab页面使用 `wx.navigateTo`
5. **返回按钮**：Tab页面不显示返回按钮，非Tab页面自动显示返回按钮

---

## 十、页面清单汇总

### 用户端页面（23个）

| 模块 | 页面数 | 页面列表 |
|------|--------|---------|
| 发现模块 | 3 | 发现首页、搜索页、顾问详情 |
| 需求模块 | 3 | 发布需求、我的需求、需求详情 |
| 订单模块 | 5 | 预约顾问、订单确认、订单列表、订单详情、评价页 |
| 支付模块 | 1 | 支付页 |
| 通讯模块 | 2 | 消息列表、聊天页 |
| 个人中心 | 5 | 个人中心、编辑资料、实名认证、紧急联系人、我的收藏 |
| 安全模块 | 2 | 紧急求助、投诉举报 |
| 其他模块 | 2 | 评价列表、通知列表 |

### 顾问端页面（12个）

| 模块 | 页面数 | 页面列表 |
|------|--------|---------|
| 入驻模块 | 3 | 申请入驻、审核状态、培训考核 |
| 工作台 | 2 | 工作台、咨询管理 |
| 需求大厅 | 1 | 需求大厅 |
| 订单管理 | 2 | 订单列表、订单详情 |
| 收入管理 | 2 | 收入概览、提现管理 |
| 管理模块 | 3 | 主页管理、服务设置、评价管理 |

### 通用页面（4个）

- 登录页、H5页面、错误页、加载页

**总计：39个页面**

---

## 版本历史

| 版本 | 日期 | 更新内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2026-01-15 | 初稿，完成用户端和顾问端页面路由文档 | - |
