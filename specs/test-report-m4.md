# M4 Tab A 授权片单 测试报告

> **测试时间**：2026-04-23
> **测试范围**：M4 Tab A 授权片单模块
> **测试文件**：`modules/auth-management/main.js` + `modules/auth-management/data.json`
> **参照规格**：`specs/drafts/M4-tab-a-auth-sheet.md` v1.0

---

## 测试结论：有条件通过

发现 1 个 P0 阻塞问题、2 个 P1 功能缺陷、3 个 P2 建议优化。P0 必须修复后方可上线。

---

## P0 阻塞问题（必须修复）

### P0-1: PLAY_CATEGORY_MAP 品类映射表错误，导致多条数据品类显示错误

**位置**：`main.js:2425-2431`

**现状**：
```js
const PLAY_CATEGORY_MAP = {
  '1': '电视剧', '3': '电视剧',   // ← '3' 应为 '综艺'
  '2': '电影',   '4': '电影',     // ← '4' 应为 '动漫'
  '5': '综艺',   '6': '纪录片',   // ← '5' 应为 '纪录片'，'6' 应为 '少儿'
  '7': '动漫',   '8': '少儿',     // ← '7' 应为 '微短剧'
  '9': '微短剧', '10': '音乐'
};
```

**影响**：以下数据品类显示全部错误：

| 作品 | play_category | 当前显示 | 应该显示 |
|------|:---:|------|------|
| 斗罗大陆3 | 4 | 电影 | 动漫 |
| 创造营2026 | 3 | 电视剧 | 综艺 |
| 蓝色星球中国篇 | 5 | 综艺 | 纪录片 |
| 超级小熊猫 | 6 | 纪录片 | 少儿 |

**正确映射应为**：
```js
const PLAY_CATEGORY_MAP = {
  '1': '电视剧', '2': '电影', '3': '综艺',
  '4': '动漫', '5': '纪录片', '6': '少儿',
  '7': '微短剧', '8': '音乐'
};
```

---

## P1 功能缺陷（应修复）

### P1-1: 缺少 CID 筛选器（spec B3 序号2）

**位置**：`main.js:860-934`（renderTabAContent 筛选区）

**现状**：`tabAFilters` 对象包含 `cid` 键（`main.js:839`），但筛选区 UI 中无 CID 输入框，`filterTabAItems()` 也未实现 CID 过滤逻辑。

**Spec 要求**：B3 序号2 明确定义 CID 为文本输入筛选器。

**修复建议**：
1. 在筛选区增加 CID 文本输入框
2. 在 `filterTabAItems()` 中增加 CID 字段匹配逻辑
3. 在 `bindTabAFilterEvents()` 中绑定 CID 输入事件
4. data.json 中 authSheet 数据需补充 `cid` 字段（当前无此字段）

### P1-2: 已授权作品行缺少「发起回收」按钮

**位置**：`main.js:987`

**现状**：操作列仅在 `recovery_status === 'recovered'` 时显示「发起重新授权」按钮，已授权（非回收）作品行操作列为空。

```js
<td>${isRecovered ? `<button ...>发起重新授权</button>` : ''}</td>
```

**Spec 要求**：
- D.4: 已授权作品行 → 操作列显示「发起回收」按钮
- D.5: 已回收作品行 → 操作列显示「发起重新授权」按钮

**修复建议**：
```js
<td>
  ${isRecovered
    ? `<button class="rr-btn-view" onclick="openReauthFromTabA('${item.copyright_id}')">发起重新授权</button>`
    : `<button class="rr-btn-view" onclick="openRecoveryFromTabA('${item.copyright_id}')">发起回收</button>`
  }
</td>
```

---

## P2 建议优化（可选）

### P2-1: 筛选器标签"IP等级"与 Spec 定义"新热-授权口径"不一致

**位置**：`main.js:908`

**现状**：筛选器 label 为"IP等级"，spec B3 序号7 定义为"新热-授权口径"。
表头列名"IP等级"对应 spec B1 序号13 的"热度"。

**建议**：将筛选器 label 改为"新热-授权口径"或"热度"以贴合 spec。

### P2-2: 表头列名轻微缩写差异

部分列名与 spec B1 原始定义有缩写差异（不影响功能理解）：

| Spec 原名 | 代码表头 | 说明 |
|-----------|---------|------|
| 作品别名 | 别名 | 缩写 |
| 授权开始日期 | 授权开始 | 缩写 |
| 授权结束日期 | 授权结束 | 缩写 |
| 正片在线状态 | 正片在线 | 缩写 |
| 首正片上架时间 | 首正片上架 | 缩写 |
| OTT是否可用 | OTT | 缩写 |
| 热度 | IP等级 | 名称不同 |
| 授权回收原因 | 回收原因 | 缩写 |
| 最新操作时间 | 最新操作 | 缩写 |

**建议**：可保持现状（表格宽度有限，缩写合理），但"热度→IP等级"建议统一为"热度"。

### P2-3: 「中国奇妙物语」copyright_status 为 reviewed（已复核），不属于已授权状态

**位置**：`data.json` authSheet 第7条

**现状**：spec F 要求 authSheet 中包含 authorized/authorized_new_hot/authorized_need_supplement/recovered 四种组合。`reviewed` 属于"未授权储备"分层（spec B2），出现在已授权片单中不太合理。

**建议**：将该条目的 copyright_status 改为 `authorized` 或其他已授权状态，或添加注释说明这是预留的异常数据测试场景。

---

## 详细检查结果

### 字段验证（逐列对照 Spec B1）

| 序号 | Spec 列名 | 代码表头 | 数据字段 | 渲染 | 结果 |
|:---:|---------|---------|---------|------|:---:|
| 1 | 作品名称 | 作品名称 | play_name | `item.play_name` | PASS |
| 2 | 作品别名 | 别名 | play_name_alias | `item.play_name_alias \|\| '-'` | PASS |
| 3 | 版权ID | 版权ID | copyright_id | `item.copyright_id`（等宽字体 rr-td-mono） | PASS |
| 4 | 快手授权ID | 快手授权ID | ks_auth_id | `item.ks_auth_id \|\| '-'`（等宽字体 rr-td-mono） | PASS |
| 5 | 品类 | 品类 | play_category | `getPlayCategoryLabel(item.play_category)` | FAIL(P0-1) |
| 6 | 授权开始日期 | 授权开始 | auth_start_date | `item.auth_start_date \|\| '-'` | PASS |
| 7 | 授权结束日期 | 授权结束 | auth_end_date | `item.auth_end_date \|\| '-'` | PASS |
| 8 | 信网权状态 | 信网权状态 | xwq_status | `item.xwq_status \|\| '-'` | PASS |
| 9 | 版权状态 | 版权状态 | copyright_status | `COPYRIGHT_STATUS_MAP[item.copyright_status]` | PASS |
| 10 | 正片在线状态 | 正片在线 | online_status | `item.online_status \|\| '-'` | PASS |
| 11 | 首正片上架时间 | 首正片上架 | first_online_date | `item.first_online_date \|\| '-'` | PASS |
| 12 | OTT是否可用 | OTT | ott_available | `item.ott_available \|\| '-'` | PASS |
| 13 | 热度 | IP等级 | hot_level | `item.hot_level \|\| '-'`（彩色标签） | PASS(P2) |
| 14 | 回收状态 | 回收状态 | recovery_status | `isRecovered ? '已回收' : '-'` | PASS |
| 15 | 授权回收原因 | 回收原因 | recovery_reason | `item.recovery_reason \|\| '-'` | PASS |
| 16 | 最新操作时间 | 最新操作 | updated_at | `item.updated_at \|\| '-'` | PASS |

**列数验证**：16 列数据 + 1 列操作 = 17 列 thead `<th>`，符合 spec（16 列数据 + 操作列）。无自创列。

### 版权状态映射验证（Spec B2）

```js
const COPYRIGHT_STATUS_MAP = {
  'authorized': '已授权',                        // ✓
  'authorized_new_hot': '已授权-新热',            // ✓
  'authorized_need_supplement': '已授权-需补确认函', // ✓
  'reviewed': '已复核',                           // ✓
  'need_supplement': '需补确认函',                 // ✓
  'available': '可用',                            // ✓
  'defect': '权利瑕疵'                            // ✓
};
```

7 种枚举全部映射正确，与 spec B2 一致。**PASS**

### 筛选器验证（Spec B3）

| 序号 | Spec 筛选项 | Spec 类型 | 代码实现 | UI 元素 | 过滤逻辑 | 结果 |
|:---:|-----------|---------|---------|---------|---------|:---:|
| 1 | 快手ID | 文本输入 | tabAFilterKsId | input text | includes 模糊匹配 | PASS |
| 2 | CID | 文本输入 | **无** | **无** | **无** | **FAIL(P1-1)** |
| 3 | 版权ID | 文本输入 | tabAFilterBqid | input text | includes 模糊匹配 | PASS |
| 4 | 作品名称 | 文本输入 | tabAFilterName | input text | 匹配 play_name + play_name_alias | PASS |
| 5 | 作品类型 | 下拉 | tabAFilterCategory | select | 全部/电视剧/电影/综艺/纪录片/动漫/少儿/微短剧(7项) | PASS(注1) |
| 6 | 授权起止 | 日期范围 | tabAFilterStart + tabAFilterEnd | 2个 date input | 字符串比较 YYYY-MM-DD | PASS |
| 7 | 新热-授权口径 | 下拉 | tabAFilterHot | select 全部/S/A/B/C | 精确匹配 hot_level | PASS(P2-1) |
| 8 | 二创信网权状态 | 下拉 | tabAFilterXwq | select 全部/生效中/已失效/未知 | 精确匹配 xwq_status | PASS |
| 9 | 关键字 | 文本输入 | tabAFilterKeyword | input text | 匹配4字段(play_name/alias/copyright_id/ks_auth_id) | PASS |

注1：Spec B3.5 选项值含"全部/电视剧/电影/综艺/动漫/纪录片/少儿/微短剧"（8项含全部），代码 CATEGORY_FILTER_OPTIONS 为 7 项（不含全部，全部由空值 `<option value="">全部</option>` 实现）。功能等价，PASS。

**筛选器总计**：8/9 通过，缺少 CID 筛选器。

### 交互验证

| 序号 | Spec 交互 | 代码实现 | 结果 |
|:---:|---------|---------|:---:|
| C.1 | 点击「导出」弹出模板选择弹窗 | `openTabAExportModal()` 创建模态弹窗，含2个 radio 选项 | PASS |
| C.2 | 选择模板后确认 → toast | 确认后 `showSystemModal('导出成功', ...)` | PASS |
| C.3 | 已回收作品 → 「发起重新授权」 | `openReauthFromTabA(copyrightId)` → showSystemModal | PASS |
| C.3+ | 已授权作品 → 「发起回收」 | **未实现** | FAIL(P1-2) |
| C.5 | 9个筛选器变更 → 列表实时过滤 | `bindTabAFilterEvents()` 绑定 input/change → 重新渲染 | PASS(8/9) |

**导出弹窗模板验证**（Spec B4）：

| 模板 | Spec 定义 | 弹窗中显示 | 结果 |
|------|---------|---------|:---:|
| 二创对账明细 | 18字段，对外对账 | "二创对账明细 - 18个字段，用于对外对账" | PASS |
| 引入类权益导出 | 37+字段，内部核查 | "引入类权益导出 - 37+字段，用于内部核查" | PASS |

### 数据验证（Spec F Mock 数据需求）

| Spec 要求作品 | copyright_status | recovery_status | 数据中对应 | 结果 |
|-------------|-----------------|-----------------|---------|:---:|
| 庆余年第三季 | authorized | - | authSheet[0] | PASS |
| 斗罗大陆3 | authorized_new_hot | - | authSheet[1] | PASS |
| 创造营2026 | authorized_need_supplement | - | authSheet[2] | PASS |
| 蓝色星球中国篇 | authorized + recovered | - | authSheet[3] | PASS |
| 仙剑奇侠传四 | authorized | - | authSheet[4] | PASS |

**品类覆盖**：电视剧(1)、电影(2)、综艺(3)、动漫(4)、纪录片(5)、少儿(6) — 6 种品类均有覆盖。**PASS**

**额外数据**：共 10 条数据，超出 spec 最低 5 条要求，增加了测试覆盖度。含 2 条已回收数据（蓝色星球中国篇 + 人世间）。

### 边界条件验证（Spec D）

| 序号 | Spec 条件 | 代码实现 | 结果 |
|:---:|---------|---------|:---:|
| D.1 | 0条授权数据 → "暂无授权记录" | `currentAuthDetails.length === 0 ? '暂无授权记录'` | PASS |
| D.2 | 筛选无结果 → "暂无匹配数据" | `': '暂无匹配数据'` | PASS |
| D.3 | 别名为空 → 显示"-" | `item.play_name_alias \|\| '-'` | PASS |
| D.4 | 已授权作品行 → 「发起回收」按钮 | **未实现，操作列为空** | FAIL(P1-2) |
| D.5 | 已回收作品行 → 「发起重新授权」按钮 | `isRecovered ? '<button>发起重新授权</button>'` | PASS |
| D.6 | 回收状态/原因为空 → 显示"-" | `isRecovered ? '已回收' : '-'` / `item.recovery_reason \|\| '-'` | PASS |

### 反向检查

| 检查项 | 结果 | 说明 |
|-------|:---:|------|
| 无自创列 | PASS | 16列+操作列，无多余列 |
| 无自创筛选项 | PASS(注) | 无多余筛选器（但少了1个CID） |
| 无自创按钮/交互 | PASS | 无规格外的按钮 |
| 手动回收按钮已删除 | PASS | 全文搜索无"手动回收"字样 |

### 分页功能（规格外但已实现）

- 每页 10 条，超出时显示分页器
- 翻页按钮 + 页码按钮 + "共 N 条"提示
- 筛选后重置到第 1 页

**功能正常，属于合理增强。**

---

## 验收检查表汇总

### 字段验证
- [x] 16 列字段逐个对照 B1 表格，不多不少
- [x] 版权状态按 B2 七种枚举映射
- [ ] 筛选器 9 个，按 B3 定义 → **缺少 CID (P1-1)**
- [x] 导出按钮弹出模板选择（2个模板）

### 交互验证
- [x] 导出弹窗 → 选模板 → toast 确认
- [ ] 已授权行 → 「发起回收」按钮可点击 → **未实现 (P1-2)**
- [x] 已回收行 → 「发起重新授权」按钮可点击
- [ ] 9 个筛选器各自生效+组合生效 → **8/9，缺 CID (P1-1)**

### 边界验证
- [x] 0 条数据 → 空态
- [x] 筛选无结果 → 空态
- [x] 别名为空 → "-"
- [x] 回收状态为空 → "-"

### 反向检查
- [x] 代码中无规格未定义的自创列
- [x] 代码中无规格未定义的自创筛选项
- [x] 代码中无规格未定义的自创按钮/交互

---

## 修复优先级建议

| 优先级 | 编号 | 问题 | 修复复杂度 |
|:---:|------|------|:---:|
| P0 | P0-1 | PLAY_CATEGORY_MAP 映射错误 | 低（改映射表即可） |
| P1 | P1-1 | 缺少 CID 筛选器 | 中（需加 UI + 逻辑 + 数据字段） |
| P1 | P1-2 | 已授权行缺少「发起回收」按钮 | 低（加按钮 + handler） |
| P2 | P2-1 | 筛选器标签命名不一致 | 低 |
| P2 | P2-2 | 表头列名缩写差异 | 低（可选） |
| P2 | P2-3 | reviewed 状态数据不合理 | 低 |
