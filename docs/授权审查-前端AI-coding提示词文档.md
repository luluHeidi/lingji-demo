# 视频作品授权 - 授权审查 前端AI Coding提示词文档

> **目标**: 分步引导AI生成完整的授权审查两个页面的前端代码  
> **前提**: 项目已有框架（顶栏+侧边栏+内容区动态加载机制）  

---

## 步骤一：创建模块基础结构和数据加载

### 提示词

```
创建授权审查模块的基础结构。要求：

1. 创建 modules/auth-review/ 目录，包含 index.html、style.css、main.js、data.json、config.json
2. config.json 包含模块元信息（id、name、version、entry）
3. data.json 结构：
   - rightsReviewData.categories: 数组，包含两个分类
     - type:"ugc", label:"二创权益", items数组（先放5条mock数据）
     - type:"distribution", label:"分销权益", items数组（放2条mock数据）
   - 每条item包含字段: id, taskId(格式SQ+6位数+2字母), taskInitTime, bqid, cid, rightsId, contractNo, workName, alias, category, director, starring, productionYear, productionRegion, episodeCount, listType, isTalkShow, isGala, infoNetStatus, externalAuthRights(可用/不可用/权利瑕疵), systemDenyReason, reviewStatus(权益初审待审/权益复审待审/运营授权评估待审/已确权)
4. index.html 包含基础页面骨架：面包屑、分类Tab栏（我的项目/授权审查）、授权审查内容容器
5. main.js 实现：
   - fetch加载data.json到全局变量authData
   - initAuthReviewModule()入口函数
   - Tab切换逻辑（显隐对应内容区）
6. style.css 遵循设计规范：主色#006eff，背景#f8f9fa，卡片圆角8px，字体-apple-system系列

确保模块可被主框架动态加载。
```

---

## 步骤二：实现授权审查首页列表（筛选+表格+分页）

### 提示词

```
在授权审查模块中实现首页列表功能。要求：

1. 渲染函数 renderRightsReview()：
   - 遍历 categories 数组，每个分类渲染一个区块
   - 每个区块包含：区块头部（标题+添加审查IP按钮仅ugc显示）、筛选栏、表格容器、分页容器

2. 筛选栏（水平一行布局）：
   - 4个下拉筛选器：审核进度(待初审/待复审/待终审/已确权)、任务类型(风险审查/新热确权/增补确权)、品类(动态收集)、法务复审结论(可用/不可用/权利瑕疵)
   - 1个搜索框：placeholder"搜索作品名称/任务ID..."，300ms防抖
   - 筛选状态对象rrFilters: {progress, taskType, category, extAuth, searchText}

3. 任务类型派生逻辑getTaskType(item)：
   - externalAuthRights为"权利瑕疵"或"不可用" → "风险审查"
   - listType为"新热" → "新热确权"  
   - 其他 → "增补确权"

4. 过滤逻辑filterRRItems(items)：5个条件取AND交集
   - 审核进度：将reviewStatus映射为显示文本后比较(权益初审待审→待初审, 权益复审待审→待复审, 运营授权评估待审→待终审, 已确权→已确权)
   - 搜索：模糊匹配workName、alias、taskId

5. 排序：风险审查类型优先展示(sortByTaskType)

6. 表格10列：审核任务ID(等宽)、作品名称、别名、品类、版权ID(等宽)、任务发起时间、任务类型(彩色Tag)、法务复审结论(彩色标签)、审核进度(彩色Tag)、操作(去审核/查看详情按钮)
   - 风险审查行加红色左边框
   - 已确权行灰色淡化

7. 分页：每页10条，含上一页/下一页/页码按钮/总条数

8. 事件绑定：下拉change→更新rrFilters→重置页码→refreshRRWithFilters()
```

---

## 步骤三：实现「添加审查IP」弹窗

### 提示词

```
实现「添加审查IP」弹窗功能。要求：

1. 弹窗HTML模板（模态框，含遮罩层）：
   - 标题"添加审查IP"
   - 黄色提示条：人工添加审查IP将直接进入审核队列
   - 字段：版权ID(BQID)*输入框、作品名称自动填充区、待审查合同号输入框、初审瑕疵原因*多行文本(500字限制+字数统计)

2. 作品库数据workLibrary（24条mock数据，每条含workName、bqid、cid、category）

3. 版权ID输入交互：
   - input事件实时从workLibrary匹配bqid
   - 匹配成功→显示"作品名+品类标签"(filled态)
   - 匹配失败→显示"未找到匹配作品"(not-found态)
   - blur事件也触发匹配

4. 初审瑕疵原因预填充：打开弹窗时从已有数据中找最近的systemDenyReason

5. 校验逻辑validateAddAuthIPForm()：
   - 版权ID必填+作品库存在性校验
   - 初审瑕疵原因必填
   - 合同号前缀需与版权ID匹配
   - 校验失败：字段标红+下方显示错误提示

6. 确认添加confirmAddAuthIP()：
   - 生成taskId: "SQ"+6位随机数+2位随机小写字母
   - 生成taskInitTime: 当前时间YYYY-MM-DD HH:mm:ss
   - externalAuthRights固定为"权利瑕疵"
   - reviewStatus固定为"权益初审待审"
   - unshift到ugc分类items最前
   - 关闭弹窗+刷新列表+Toast提示

7. 关闭方式：×按钮、取消按钮、点击遮罩层
```

---

## 步骤四：实现审查详情页 - 页面框架和基础信息卡片

### 提示词

```
实现审查详情页的框架和作品基础信息卡片。要求：

1. 页面切换逻辑：
   - openRightsReviewDetail(itemId): 隐藏首页所有元素，显示详情页
   - closeRightsReviewDetail(): 隐藏详情页，恢复首页
   - 从categories中查找item数据

2. 详情页HTML结构（在index.html中）：
   - 返回按钮+页面标题"{作品名}-授权详情"
   - 基础信息卡片容器(id=rrdInfoCard)
   - 审核节点容器(id=rrdReviewNodes)
   - 权利列表容器(id=rrdRightsList)

3. 基础信息卡片renderRRDetailInfo(item)：
   - 标题行：作品名(H2) + 右侧"授权历史"按钮
   - 标签行：别名Tag + 品类Tag + 任务类型Tag(同首页计算规则)
   - 信息网格(3列grid)，共13个字段：
     审查任务ID(等宽)、任务发起时间、版权ID(等宽)、CID(等宽)、权益ID(等宽)、合同号(等宽)、导演、主演、出品年份、制片地区、集数/期数、脱口秀品类(是/否)、信网权状态(生效中绿色/已过期灰色)

4. 授权历史抽屉（右侧滑出面板）：
   - openAuthHistoryDrawer(item)：收集同workName的所有历史记录
   - 统计信息：总记录数、已确权数、审核中数
   - 卡片列表展示每条历史记录
   - 当前记录有"当前"标签标识
   - 可点击"查看详情"跳转

5. 样式：卡片白色背景+8px圆角+轻阴影，响应式grid布局
```

---

## 步骤五：实现三级审核节点 - 左右分栏布局

### 提示词

```
实现三级审核节点的左右分栏布局。要求：

1. 整体布局renderRRReviewNodes()：
   - 左侧固定240px：标题"审核流程"+时间轴
   - 右侧自适应：标题动态显示当前节点名+节点面板
   - 中间border-left分隔，背景色差异(灰/白)区分

2. data.json中添加reviewNodes数组(3个节点)：
   - node-1: name"权益初审", role"版权审核", status, conclusionOptions["可用","权利瑕疵"], defectTypeOptions[5个]
   - node-2: name"权益复审", role"版权审核", conclusionOptions, defectTypeOptions, disposalOptions[3个]
   - node-3: name"运营授权评估", role"运营审核", authJudgeOptions["可授权","不授权"], defectDisposalConclusionOptions[3个], denyReasonOptions[3个], authPlatformOptions["快手","抖音"]

3. 左侧时间轴renderTimelineNode(node, idx)：
   - 竖线+圆形节点
   - 未到达: 灰色空心圆+序号
   - 已审核: 浅蓝圆+✓
   - 当前活跃: 深蓝实心圆+外发光+序号
   - 已审核时显示审核时间和结果标签
   - 节点间用竖线连接(已审核蓝色/未到达灰色)

4. 活跃节点判定findActiveNodeIndex(nodes)：第一个pending节点

5. 左侧节点可点击：
   - 已审核/当前活跃节点可点击切换右侧面板
   - 未到达节点禁用
   - 点击更新左侧高亮+右侧面板显隐+右侧标题

6. 响应式：≤900px时上下堆叠
```

---

## 步骤六：实现三级审核节点 - 各节点编辑面板和交互

### 提示词

```
实现三个审核节点的编辑面板和交互逻辑。要求：

1. renderNodePanel(node, idx, nodes)：根据node.status渲染已审核只读或待审核可编辑面板

2. Node-1面板(权益初审)：
   - 人审结论: radio(可用/权利瑕疵)
   - 选择"权利瑕疵"→展开: 瑕疵类型radio(5选项) + 备注textarea(1000字)
   - 选择"可用"→收起并清除瑕疵字段

3. Node-2面板(权益复审)：
   - 人审结论: radio(默认继承node-1的conclusion，自动checked)
   - 授权依据的引入权利: radio(选项=当前IP下所有权益rightsId，通过getPendingRightsIds()获取；若只有1个自动选中)
   - 选择"权利瑕疵"→展开: 瑕疵类型radio(默认继承node-1) + 处置方式radio(3选项) + 备注textarea

4. Node-3面板(运营授权评估)：
   - 授权判断: radio(可授权/不授权)
   - 瑕疵处置结论: radio(3选项)，仅当node-2=权利瑕疵且有disposal时显示
   - 选择"不授权"→展开不授权原因radio(若node-2=可用则排除"无法补确认函")
   - 选择"可授权"→展开可授权平台checkbox(快手/抖音) + 动态日期行
   - 每勾选一个平台→下方出现该平台的授权起止时间行(两个date input)
   - 日期默认值: 开始=max(今天, 权利authStartDate最大值)，min=今天
   - 取消勾选→对应日期行消失

5. bindNodeInteractions(container)：统一绑定所有联动事件

6. 提交校验逻辑（按节点分别校验，失败Toast提示）

7. 提交成功：node.status='reviewed'，记录reviewer和reviewTime，重新渲染，自动切换到下一节点

8. 已审核面板renderReviewedPanel()：
   - 只读展示审核人+时间+结论+详情
   - canModifyReviewedNode：下一节点仍pending时显示"修改"按钮
   - 修改→回退status为pending→重新渲染
```

---

## 步骤七：实现待审权利列表（枚举圆点样式+分组展示）

### 提示词

```
实现待审权利信息列表。要求：

1. data.json添加sampleRightsDetail对象：键=item.id, 值=权益数组
   - 每条权益含50+字段(详见数据字段文档)，按6个分组组织

2. renderRRRightsList(item)：
   - 从sampleRightsDetail[item.id]获取权益数组
   - 按版权类型排序: 引入版权(0)→引入定制(1)→引入置换(2)→引入自制(3)
   - 每条权益渲染为可折叠卡片(第一张默认展开)

3. 卡片头部: 展开/收起chevron + "权益ID: {rightsId}" + 版权类型Tag

4. 枚举值展示FIELD_ENUMS映射表(17个字段有预设枚举)

5. rfEnum(label, value, fieldKey)渲染函数：
   - 展示所有枚举值，每个值前有圆点指示器
   - 未选中: 灰色空心圆(6px)+灰色文字
   - 选中(当前值): 蓝色实心圆+蓝色粗体+淡蓝外发光
   - 值不在枚举中: 额外展示自定义标签(虚线边框)
   - 间距: 行间2px, 列间10px

6. rfText(label, value)渲染函数：自由文本字段，值以选中态展示

7. 6个字段分组(各有图标标题)：
   - 基本信息(file-text): 3字段
   - 授权基础权利(key): 14字段
   - 二创权利(video): 7字段
   - 二创创作成果(scissors): 4字段(条件显示：ugcRightsExist=有)
   - 二创传播限制(radio): 6字段(条件显示：ugcRightsExist=有)
   - 分销相关(send): 3字段

8. 使用grid布局(3列)，部分字段占整行(rrd-rf-full)
```

---

## 步骤八：实现合同对照工具（分屏+搜索高亮）

### 提示词

```
实现合同对照工具。要求：

1. data.json添加sampleContractTexts对象：键=rightsId, 值含contractTitle、contractNo、contractType、contractText(完整合同原文)

2. Toggle按钮：
   - 位置: 权益卡片展开后左侧字段区右边缘的竖向悬浮按钮
   - absolute定位，right:0, top:50%, translateY(-50%)
   - 竖排文字(writing-mode:vertical-rl)
   - 默认态: 左箭头+"合同对照"+脉冲动画条
   - 激活态: 右箭头+"收起"+蓝色背景
   - 圆角: 左10px右2px(贴边)

3. 分屏布局：
   - 点击Toggle→添加rrd-split-active class
   - 左50%字段区缩为2列grid + 右50%合同面板
   - 等高对齐: rAF中测量左侧scrollHeight，设为容器固定高度
   - 左右通过flex stretch等高

4. 合同面板renderContractInline()：
   - Header: 合同图标+"合同原文"+搜索框
   - 正文: 按\n分段，标题居中加蓝底线，第X条加蓝色左竖线，签章行灰色

5. 关键词搜索：
   - 200ms防抖，TreeWalker遍历文本节点
   - 匹配项黄色高亮(.contract-search-highlight)
   - 显示匹配计数(X个匹配/无匹配)
   - 自动滚到第一个匹配
   - Escape清除搜索，×按钮清除

6. 关闭分屏（3种方式）：
   - Toggle按钮再次点击
   - 收起权益卡片
   - 均清除高度限制+清空合同面板

7. 响应式: <1024px时分屏改为上下堆叠
```

---

## 步骤九：整体联调和样式精修

### 提示词

```
完成授权审查模块的整体联调和样式精修。要求：

1. 数据联调：
   - 扩充data.json到20条ugc数据+2条distribution数据
   - 确保各reviewStatus状态都有数据覆盖
   - 为至少2个item生成sampleRightsDetail(各3条权益)
   - 为所有权益生成sampleContractTexts

2. 交互完整性检查：
   - 首页→详情→返回的页面切换无残留
   - 筛选+搜索+分页联动正确
   - 三级审核节点的全流程(提交→下一节点→修改→重新提交)
   - 合同对照Toggle正确开关
   - 添加审查IP弹窗完整流程

3. 样式精修（遵循设计规范）：
   - 主色#006eff，成功#00b578，警告#ff8f1f，错误#ee3f4d
   - 卡片8px圆角+轻阴影(0 2px 8px rgba(0,0,0,0.04))
   - hover加深阴影+translateY(-2px)
   - 过渡all 0.3s ease
   - 表格斑马纹#f8f9fa
   - 枚举圆点间距紧凑(2px 10px)
   - 等宽字体用monospace系列

4. 图标：使用Lucide Icons (20px, stroke-width:2)

5. Toast提示组件：顶部居中，2秒自动消失，success/warning类型

6. 空状态处理：无数据时显示空状态图标+文字
```

---

## 执行顺序建议

1. **步骤一** → 模块骨架可运行
2. **步骤二** → 首页列表完整可用
3. **步骤三** → 添加审查IP功能完整
4. **步骤四** → 详情页框架和信息卡片
5. **步骤五+六** → 审核节点完整交互（建议一起做）
6. **步骤七** → 权利列表展示
7. **步骤八** → 合同对照工具
8. **步骤九** → 联调精修，确保全流程畅通
