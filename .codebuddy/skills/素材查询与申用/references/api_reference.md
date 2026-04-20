# 素材查询与申用 API 参考文档

## 数据加载接口

### 加载IP列表数据
```javascript
// 请求
GET /modules/material-query/data.json

// 响应
{
  "tvSeries": [...],    // 电视剧IP列表
  "animation": [...],   // 动漫IP列表
  "variety": [...]      // 综艺IP列表
}
```

### 加载素材详情数据
```javascript
// 请求
GET /modules/material-query/material-detail-data.json

// 响应
{
  "IP名称1": [...素材列表],
  "IP名称2": [...素材列表]
}
```

## 数据结构定义

### IP对象
| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | IP唯一标识 |
| name | string | IP名称 |
| level | string | IP等级 (S+/S/A/B) |
| poster | string | 海报图片URL |
| actors | string | 主演列表 |
| director | string | 导演 |
| category | string | 品类 |
| status | string | 状态 |
| collectedMaterials | number | 已入库素材数 |
| pendingMaterials | number | 待入库素材数 |
| relatedProjects | number | 关联项目数 |

### 素材对象
| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 素材唯一标识 |
| name | string | 素材名称 |
| type | string | 素材类型 (video/audio/image/text/3d) |
| elementTag | string | 五要素标签 (story/brand/music/model/character) |
| format | string | 文件格式 |
| size | string | 文件尺寸/大小 |
| applyCount | number | 申用次数 |
| projectFile | string | 工程文件 (yes/no) |
| purpose | string | 制作用途 (promotion/launch/recreation) |
| uploader | string | 上传者 |
| uploadTime | string | 上传时间 |
| blockchainHash | string | 区块链存证哈希 |
| previewUrl | string | 预览图URL |

## 筛选参数

### IP筛选
| 参数 | 类型 | 可选值 |
|------|------|--------|
| status | string | all, 已立项, 开发中, 已过审, 上映中, 已完播 |
| level | string | all, S+, S, A, B |
| searchKeyword | string | 任意字符串 |

### 素材筛选
| 参数 | 类型 | 可选值 |
|------|------|--------|
| materialType | string | all, video, audio, image, text, 3d |
| elementTag | string | all, story, brand, music, model, character |
| format | string | all, mp4, mp3, jpg, png, psd, ai, fbx |
| projectFile | string | all, yes, no |
| purpose | string | all, promotion, launch, recreation |
| searchKeyword | string | 任意字符串 |

## 事件接口

### 品类切换
```javascript
// 触发元素: .category-tab
// 数据属性: data-category="tvSeries|animation|variety"
// 处理函数: switchCategory(category)
```

### 素材选择
```javascript
// 触发元素: .material-card
// 数据属性: data-id="素材ID"
// 处理函数: toggleMaterialSelection(materialId)
```

### 全选操作
```javascript
// 触发元素: #selectAllMaterials
// 处理函数: selectAllMaterials()
```

### 申用提交
```javascript
// 触发元素: #applyBtn
// 处理函数: applyForMaterials()
```

## 状态管理

### 全局状态变量
```javascript
moduleData      // IP数据缓存
materialsData   // 素材数据缓存
currentCategory // 当前品类
currentPage     // 当前页码
itemsPerPage    // 每页条数 (默认20)
filters         // IP筛选条件
currentIPName   // 当前IP名称
currentMaterials // 当前素材列表
selectedMaterials // 已选中素材Set
materialFilters  // 素材筛选条件
```

## 页面导航

### 路由说明
| 页面 | 路径 | 说明 |
|------|------|------|
| 一级页面 | .material-query-page | IP列表页 |
| 二级页面 | .material-detail-page | 素材详情页 |
| 申用表单 | application-form.html | 申用表单弹窗 |
| 申用记录 | application-records.html | 申用记录页 |

### 导航函数
```javascript
showMaterialDetail(ipName)  // 进入二级页面
backToMaterialQuery()       // 返回一级页面
showApplicationRecords()    // 显示申用记录
showApplicationForm()       // 显示申用表单
```
