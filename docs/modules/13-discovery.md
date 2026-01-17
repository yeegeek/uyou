# UYOU 无忧陪伴 - 发现模块

> 发现模块完整文档 | 包含PRD、API、数据库设计

---

## 一、PRD - 产品需求

### 1.1 功能清单

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 城市切换 | 选择服务城市（上海/成都） | P0 |
| 服务分类入口 | 娱乐陪伴、运动陪伴、情绪疏导 | P0 |
| 推荐情感顾问列表 | 根据评分、距离、活跃度推荐 | P0 |
| 情感顾问搜索 | 按性别、年龄、服务类型、价格筛选 | P1 |
| 情感顾问主页 | 查看详情、照片、视频介绍、评价 | P0 |

---

## 二、API - 接口设计

### 2.1 获取城市列表

**GET** `/cities`

**响应：**
```json
{
  "cities": [
    {
      "id": "city_id",
      "name": "上海",
      "code": "SH",
      "isEnabled": true
    }
  ]
}
```

### 2.2 获取服务类目

**GET** `/categories`

**响应：**
```json
{
  "categories": [
    {
      "id": "category_id",
      "name": "娱乐陪伴",
      "icon": "icon_url",
      "description": "看电影、逛街、唱K等"
    }
  ]
}
```

### 2.3 获取推荐顾问列表

**GET** `/consultants/recommended`

**查询参数：**
- `cityId` (required) - 城市ID
- `categoryId` (optional) - 服务类目ID
- `page` (default: 1)
- `pageSize` (default: 20)

**响应：**
```json
{
  "consultants": [
    {
      "id": "consultant_id",
      "nickname": "顾问昵称",
      "avatar": "头像URL",
      "introText": "自我介绍",
      "avgRating": 4.8,
      "totalOrders": 128,
      "distance": 2.5,
      "services": [
        {
          "categoryName": "运动陪伴",
          "price": 100.00,
          "serviceMode": 1
        }
      ]
    }
  ],
  "pagination": {
    "nextPage": 2,
    "pageSize": 20,
    "hasMore": true
  }
}
```

**推荐算法说明：**
> **推荐算法复用需求匹配算法**，使用相同的评分公式和筛选条件，详见 `06-demands.md` 1.2 智能匹配算法说明。
> 
> **匹配评分公式：**
> ```
> 总分 = 距离分×40% + 评分分×30% + 偏好分×20% + 活跃分×10%
> ```
> 
> **推荐流程：**
> 1. 筛选：城市相同 + 服务类目启用 + 在服务半径内 + 状态正常
> 2. 排除：黑名单关系 + 信用分<60 + 当前时段已有订单
> 3. 评分：按公式计算总分
> 4. 排序：按总分降序排列
> 5. 返回：分页返回推荐结果
> 
> **说明：**
> - 推荐算法与需求匹配算法使用相同的评分公式，确保推荐结果的一致性
> - 推荐算法不涉及需求偏好匹配（如性别、年龄偏好），仅基于顾问的评分、距离、活跃度进行推荐
> - 如需查看完整的算法定义和偏好分计算方式，请参考 `06-demands.md` 1.2

**推荐结果缓存策略：**

1. **缓存Key**：`consultant:recommended:{cityId}:{categoryId}:{page}:{pageSize}`
   - 示例：`consultant:recommended:city_123:category_456:1:20`

2. **缓存过期时间**：5分钟
   - 推荐结果变化频率较低，5分钟缓存可有效减少数据库查询压力
   - 过期后自动重新计算

3. **缓存更新策略**：
   - **失效更新**：当顾问信息变更时（如：评分变化、状态变更、服务设置变更），删除相关缓存
   - **主动更新**：定时任务（每5分钟）清理过期缓存，触发重新计算
   - **预热缓存**：系统启动时，预加载热门城市的推荐结果

4. **缓存更新频率**：
   - **实时计算**：首次请求时实时计算并缓存
   - **定时更新**：定时任务每5分钟更新一次热门城市的推荐结果
   - **事件触发**：顾问信息变更时，立即失效相关缓存

5. **缓存范围**：
   - 仅缓存前3页的推荐结果（page <= 3）
   - 第4页及以后的结果不缓存，实时计算（减少缓存空间占用）

### 2.4 搜索顾问

**GET** `/consultants/search`

**查询参数：**
- `cityId` (required)
- `categoryId` (optional)
- `gender` (optional) - 1男/2女
- `ageMin` (optional)
- `ageMax` (optional)
- `priceMin` (optional)
- `priceMax` (optional)
- `sortBy` (optional) - rating/distance/orders
- `nextPage`, `pageSize`

**响应格式：** 同 2.3 推荐顾问列表

### 2.5 获取顾问详情

**GET** `/consultants/:id`

**响应：**
```json
{
  "id": "consultant_id",
  "nickname": "顾问昵称",
  "avatar": "头像URL",
  "introVideo": "视频URL",
  "introText": "自我介绍",
  "age": 25,
  "height": 165,
  "education": "本科",
  "occupation": "自由职业",
  "avgRating": 4.8,
  "totalOrders": 128,
  "totalReviews": 95,
  "completionRate": 98.5,
  "creditScore": 95,
  "onlineStatus": 1,
  "services": [ ... ],
  "albums": [ ... ],
  "reviews": [ ... ],
  "isFavorited": false,
  "isBlocked": false,
}
```

> **说明**：收藏和屏蔽功能的API统一在用户模块定义，详见 `01-users.md`：
> - 收藏：`POST /users/favorites`、`DELETE /users/favorites/:id`、`GET /users/favorites`
> - 屏蔽：`POST /users/blocks`、`DELETE /users/blocks/:id`、`GET /users/blocks`
> 
> 顾问详情接口（`GET /consultants/:id`）返回的 `isFavorited` 和 `isBlocked` 字段为只读状态，用于前端展示。

---

## 三、Database - 数据库设计

> **说明**：
> - `cities`（城市表）和`categories`（服务类目表）为共享表，定义见 `00-shared.md`，此处不再重复定义。
> - `user_favorites`（用户收藏表）和`user_blocks`（用户屏蔽表）为共享表，定义见 `01-users.md` 3.4 和 3.5，此处不再重复定义。

---

> **文档更新记录**
> - v1.3 (2026-01-15)：补充推荐算法缓存策略（缓存Key、过期时间、更新频率）
> - v1.2 (2026-01-15)：移除user_favorites和user_blocks表定义，统一引用01-users.md；删除收藏和屏蔽API定义，统一到用户模块；明确推荐算法复用需求匹配算法
> - v1.1 (2026-01-15)：移除cities和categories表定义，统一引用00-shared.md中的共享表定义
> - v1.0 (2026-01-07)：初稿，完成发现模块PRD/API/DB整合
