---
name: 素材查询与申用
description: |
  这是灵机系统中用于查询和申用IP商业化素材的技能包。
  该技能支持在IP维度展示素材及IP信息数据，覆盖电视剧、动漫、综艺三个品类。
  当用户需要查询IP素材、筛选素材、申用素材、查看申用记录时，应使用此技能。
  适用场景：查找特定IP的素材、按条件筛选素材、批量申用素材、管理素材申用流程。
---

# 素材查询与申用 Skill

## 概述

本技能用于灵机系统中IP商业化素材的查询与申用功能。支持用户在IP维度浏览、搜索、筛选和申用各类素材资源。

## 适用场景

- 查询特定IP（如电视剧、动漫、综艺）的素材库
- 按条件筛选素材（类型、格式、五要素标签等）
- 使用AI智能搜索描述需求匹配素材
- 批量选择和申用素材
- 查看和管理素材申用记录

## 模块结构

```
modules/material-query/
├── index.html          # 主页面HTML结构
├── style.css           # 样式文件
├── main.js             # 核心JavaScript逻辑
├── config.json         # 模块配置
├── data.json           # IP列表数据
├── material-detail-data.json  # 素材详情数据
├── application-form.html      # 申用表单页面
├── application-form.css       # 申用表单样式
├── application-records.html   # 申用记录页面
└── application-records.css    # 申用记录样式
```

## 核心功能

### 1. IP列表页（一级页面）

#### 品类切换
支持三个品类Tab切换：
- **电视剧** (`tvSeries`)
- **动漫** (`animation`)
- **综艺** (`variety`)

#### IP筛选
- **IP状态**: 全部、已立项、开发中、已过审、上映中、已完播
- **IP等级**: 全部、S+、S、A、B
- **关键词搜索**: 按IP名称搜索

#### IP卡片展示
每个IP卡片显示：
- 海报图片（3:4比例）
- IP等级标签（S+金色、S紫色、A蓝色、B灰蓝色）
- IP名称和状态
- 主演/导演信息
- 数据统计（已入库素材、待入库素材、关联项目）

### 2. 素材详情页（二级页面）

#### 搜索功能
- **普通搜索**: 按素材名称/ID模糊匹配
- **AI搜索**: 自然语言描述需求，智能匹配素材

#### 素材筛选器
- **素材类型**: 全部、视频、音频、图片、文字、3D模型
- **五要素标签**: 全部、故事、品牌、音乐、模式、人物
- **素材格式**: 全部、mp4、mp3、jpg、png、psd、ai、fbx
- **工程文件**: 全部、有工程文件、无工程文件
- **制作用途**: 全部、宣传、发布、二创授权

#### 素材卡片
每个素材卡片显示：
- 预览缩略图
- 素材名称和类型标签
- 格式和尺寸
- 申用次数
- 工程文件状态
- 区块链存证哈希
- 上传者和上传时间

#### 批量操作
- **全选按钮**: 一键全选当前筛选结果
- **申用按钮**: 将选中素材加入申用流程

### 3. 申用流程

#### 申用表单
填写申用信息：
- 申用项目
- 使用场景
- 使用期限
- 申用说明

#### 申用记录
查看历史申用记录：
- 申用状态（待审核、已通过、已拒绝）
- 素材信息
- 申用时间
- 审批进度

## 数据结构

### IP数据结构
```json
{
  "id": "tv-001",
  "name": "长相思",
  "level": "S+",
  "poster": "",
  "actors": "杨紫、张晚意、邓为",
  "director": "秦振宇",
  "category": "电视剧",
  "status": "已完播",
  "collectedMaterials": 1250,
  "pendingMaterials": 80,
  "relatedProjects": 15
}
```

### 素材数据结构
```json
{
  "id": "SC20260119MX01",
  "name": "概念海报",
  "type": "image",
  "elementTag": "brand",
  "format": "jpg",
  "size": "3000x4500px",
  "applyCount": 15,
  "projectFile": "yes",
  "purpose": "promotion",
  "uploader": "heidilulu",
  "uploadTime": "2026-01-15 14:23:17",
  "blockchainHash": "sha256:a3f8d9e2b1c7f4a5e8d6c3b9f2a1d8e7c4b6a3f9e2d1c8b7a4f6e3d9c2b8a5f1",
  "previewUrl": ""
}
```

## 关键JavaScript函数

### 模块初始化
```javascript
initMaterialQueryModule()  // 初始化模块
loadModuleData()           // 加载IP数据
loadMaterialsData()        // 加载素材数据
```

### IP列表操作
```javascript
renderIPCards()            // 渲染IP卡片列表
switchCategory(category)   // 切换品类
applyFilters()             // 应用筛选条件
```

### 素材详情操作
```javascript
showMaterialDetail(ipName) // 显示素材详情页
renderMaterialCards()      // 渲染素材卡片
filterMaterials()          // 筛选素材
```

### 搜索功能
```javascript
performNormalSearch(keyword)  // 普通搜索
performAISearch(keyword)      // AI智能搜索
```

### 选择与申用
```javascript
toggleMaterialSelection(id)   // 切换素材选中状态
selectAllMaterials()          // 全选素材
applyForMaterials()           // 提交申用
```

### 导航
```javascript
backToMaterialQuery()         // 返回一级页面
showApplicationRecords()      // 显示申用记录
showApplicationForm()         // 显示申用表单
```

## 设计规范

遵循灵机系统设计规范：
- 主色调：腾讯蓝 `#006eff`
- IP等级色系：S+金色、S紫色、A蓝色、B灰蓝色
- 卡片圆角：8px
- 标准阴影：`0 2px 8px rgba(0,0,0,0.04)`
- 字体：系统默认字体栈

## 使用指南

### 修改IP数据
编辑 `data.json` 文件，按品类添加或修改IP信息。

### 修改素材数据
编辑 `material-detail-data.json` 文件，以IP名称为key添加素材列表。

### 添加新筛选条件
1. 在HTML中添加筛选器select元素
2. 在CSS中添加对应样式
3. 在JS的筛选逻辑中增加条件判断

### 自定义AI搜索逻辑
修改 `performAISearch()` 函数，对接实际的AI分析服务接口。

## 参考资源

- `references/api_reference.md` - API接口文档
- `references/design_spec.md` - 设计规范详情
