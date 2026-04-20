# 视频作品授权 - 授权审查 后端AI Coding提示词文档

> **目标**: 分步引导AI生成支撑授权审查前端的完整后端代码  

---

## 步骤一：项目初始化和数据模型

### 提示词
```
创建授权审查后端服务。数据模型包括：
1. RightsReviewItem: id, taskId(SQ+6位数+2字母), taskInitTime, bqid, cid, rightsId, contractNo, workName, alias, category, director, starring, productionYear, productionRegion, episodeCount, listType, isTalkShow, isGala, infoNetStatus, externalAuthRights(可用/不可用/权利瑕疵), systemDenyReason, reviewStatus(权益初审待审/权益复审待审/运营授权评估待审/已确权), manualAdded
2. ReviewNode: id(node-1/2/3), name, role, status(pending/reviewed), conclusion, defectType, remark, authBasisRightsId, disposal, defectReason, authJudge, defectDisposalConclusion, denyReason, authPlatform, platformDates(对象{平台:{start,end,display}}), reviewer, reviewTime
3. RightsDetailItem: 50+字段覆盖基本信息/授权基础权利/二创权利/二创创作成果/二创传播限制/分销相关
4. WorkLibrary: workName, bqid, cid, category (24条)
5. ContractText: contractTitle, contractNo, contractType, contractText

生成Mock数据：20条ugc+2条distribution条目，覆盖全部reviewStatus状态。
```

---

## 步骤二：列表查询和筛选接口

### 提示词
```
实现 GET /api/auth-review/list 接口。
Query参数: categoryType, progress, taskType, category, extAuth, keyword, page(默认1), pageSize(默认10)

核心逻辑：
1. 任务类型派生: externalAuthRights∈{权利瑕疵,不可用}→风险审查; listType=新热→新热确权; 其他→增补确权
2. 审核进度映射: 权益初审待审→待初审, 权益复审待审→待复审, 运营授权评估待审→待终审, 已确权→已确权
3. 筛选条件取AND交集
4. keyword模糊匹配workName、alias、taskId
5. 排序：风险审查类型优先(typeOrder: 风险审查0, 新热确权1, 增补确权2)
6. 分页返回：items数组 + pagination{page,pageSize,total,totalPages}
```

---

## 步骤三：审查详情接口

### 提示词
```
实现 GET /api/auth-review/detail/{itemId} 接口。
返回数据包含4部分：
1. item: 完整的RightsReviewItem
2. reviewNodes: 3个ReviewNode数组(node-1权益初审/node-2权益复审/node-3运营授权评估)，包含各节点的选项配置(conclusionOptions/defectTypeOptions/disposalOptions/authJudgeOptions等)
3. rightsDetails: 该item关联的RightsDetailItem数组(按版权类型排序：引入版权→引入定制→引入置换→引入自制)
4. contractTexts: 以rightsId为键的合同原文对象
```

---

## 步骤四：提交审核结论接口

### 提示词
```
实现 POST /api/auth-review/submit-conclusion 接口。
请求体: {itemId, nodeId, data}

按nodeId分别校验：
- node-1: conclusion必填; conclusion=权利瑕疵时defectType必填
- node-2: conclusion必填; authBasisRightsId必填
- node-3: authJudge必填; 条件必填defectDisposalConclusion(仅node-2=权利瑕疵且有disposal); authJudge=不授权→denyReason必填; authJudge=可授权→authPlatform必填+每平台日期必填且end>start

提交成功后：
1. 更新node状态为reviewed，记录reviewer和reviewTime
2. 推进reviewStatus: node-1→权益复审待审, node-2→运营授权评估待审, node-3→已确权
3. 校验前序节点必须全部reviewed（防止跳节点）
4. 返回新状态信息
```

---

## 步骤五：修改已审核结论接口

### 提示词
```
实现 PUT /api/auth-review/modify-conclusion 接口。
请求体: {itemId, nodeId, data}

校验逻辑：
1. 该节点必须为reviewed状态
2. 下一个节点必须仍为pending（否则不允许修改，返回错误码2004）
3. 将节点status回退为pending
4. 用新data覆盖节点数据
5. 重新设置为reviewed
6. 回退reviewStatus到当前节点对应的状态值

核心函数 canModifyNode(nodes, nodeIndex):
  nodes[nodeIndex].status == 'reviewed' && nodes[nodeIndex+1].status == 'pending'
```

---

## 步骤六：添加审查IP接口

### 提示词
```
实现 POST /api/auth-review/add-item 接口。
请求体: {bqid, contractNos(数组), defectReason}

校验逻辑：
1. bqid必填
2. bqid存在性：从WorkLibrary匹配，不存在返回错误3001
3. defectReason必填
4. contractNos前缀校验：每个合同号必须以bqid开头，不匹配返回错误3002

创建新条目：
- id: "RR-UGC-MANUAL-"+timestamp
- taskId: "SQ"+6位随机数+2位随机小写字母
- taskInitTime: 当前时间
- workName/category/cid: 从WorkLibrary获取
- externalAuthRights: "权利瑕疵"
- reviewStatus: "权益初审待审"
- manualAdded: true
- systemDenyReason: defectReason

插入到ugc分类items最前面，更新totalPending
```

---

## 步骤七：授权历史查询接口

### 提示词
```
实现 GET /api/auth-review/history 接口。
Query参数: workName

逻辑：
1. 从全部categories中收集同workName的所有审查记录
2. 从项目授权数据中收集同workName的授权记录(fromProject标记)
3. 按时间倒序排列(taskInitTime或applyTime)
4. 标记当前记录(isCurrent)
5. 统计: total, confirmed(已确权), pending(审核中)
```

---

## 步骤八：业务规则工具函数模块

### 提示词
```
创建 /utils/business-rules.js 工具模块，封装所有核心业务判断逻辑：

1. getTaskType(item): 任务类型派生
   externalAuthRights∈{权利瑕疵,不可用}→风险审查; listType=新热→新热确权; 其他→增补确权

2. getReviewProgressDisplay(reviewStatus): 审核进度映射

3. advanceReviewStatus(nodeId): 返回提交后的新reviewStatus

4. canModifyNode(nodes, nodeIndex): 已审核节点可修改性判断

5. findActiveNodeIndex(nodes): 找到第一个pending节点索引

6. getNode2Defaults(nodes): Node-2继承Node-1结论的默认值

7. getNode3Conditions(nodes): Node-3条件字段显示规则（瑕疵处置结论是否显示、不授权原因选项过滤）

8. getDefaultAuthStartDate(rightsItems): 授权开始日期默认值=max(今天, 所有authStartDate最大值)

9. getPendingRightsIds(itemId, rightsDetailData): 获取待审权益ID列表

10. validateSubmission(nodeId, data, context): 统一校验入口

11. sortByTaskType(items): 风险审查优先排序

12. generateTaskId(): 生成SQ+6位数+2字母格式ID

每个函数需有完整的JSDoc注释和单元测试。
```

---

## 步骤九：错误处理和权限校验

### 提示词
```
实现统一错误处理和权限校验中间件。

1. 错误码体系：
   0=成功, 1001=参数缺失, 1002=格式错误, 2001=条目不存在, 2002=节点状态不允许, 2003=前序节点未完成, 2004=节点不可修改, 3001=BQID不存在, 3002=合同号不匹配, 4001=必填缺失, 4002=日期无效

2. 权限角色：
   - 版权审核: 可操作node-1/node-2, 可添加审查IP
   - 运营审核: 可操作node-3, 可添加审查IP
   - 查看: 所有角色可查看列表和详情

3. 操作日志记录：
   - 审核提交/修改操作记录: 操作人、时间、类型、操作前后数据快照
   - 添加审查IP记录

4. 输入校验中间件: 统一参数类型检查、XSS防护、长度限制
```

---

## 执行顺序

1. **步骤一** → 数据模型和Mock数据就绪
2. **步骤二** → 列表API可调用
3. **步骤三** → 详情API可调用
4. **步骤四** → 审核提交核心流程
5. **步骤五** → 修改结论补充流程
6. **步骤六** → 添加审查IP功能
7. **步骤七** → 授权历史查询
8. **步骤八** → 业务规则抽离为工具函数（可与步骤2-7并行）
9. **步骤九** → 安全和运维保障
