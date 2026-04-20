/**
 * 授权审查模块 - 独立逻辑文件
 * 对齐线上一期代码：txvideo_inspire/copyright_auth + txvideo_inspiry/inspiry-platform
 * 不依赖 main.js 中的授权审查函数，完全独立运行
 */

// ============================================================
// 常量定义（对齐线上 entity/consts/consts.go）
// ============================================================

const PLAY_CATEGORY_MAP = {
  '1': '电视剧', '3': '电视剧',
  '2': '电影', '4': '电影',
  '5': '综艺', '6': '纪录片',
  '7': '动漫', '8': '少儿',
  '9': '微短剧', '10': '音乐'
};

const AUDIT_PROGRESS_MAP = {
  'rights_first_review': '待初审',
  'rights_second_review': '待复审',
  'rights_third_review': '待终审',
  'confirmed_rights': '已完成',
  'obsoleted': '已废弃'
};

const AUDIT_PROGRESS_ORDER = {
  'rights_first_review': 0,
  'rights_second_review': 1,
  'rights_third_review': 2,
  'confirmed_rights': 3,
  'obsoleted': 4
};

const TASK_TYPE_MAP = {
  'risk_review': '风险审查',
  'auth_review': '授权审查'
};

const REVIEW_RESULT_MAP = {
  'rights_available': '权利可用',
  'rights_defect': '权利瑕疵'
};

const THIRD_REVIEW_RESULT_MAP = {
  'can_authorized': '可授权',
  'not_authorized': '不授权'
};

// 瑕疵类型（编码→中文）
const DEFECT_TYPE_MAP = {
  '123128944': '转授或剪辑权需书面确认',
  '123128946': '联合转授',
  '123128949': '收益共享',
  '123128957': '无剪辑权',
  '123129913': '剪辑权收益共享',
  '123130098': '非独可转授',
  'cn_distributed': '含中国大陆已分销',
  'distributed_secondary_creation': '已分销二创',
  'distributed_ott': '已分销OTT',
  'other': '其他'
};

// 可授权平台（枚举值→中文）
const AUTHORIZED_PLATFORM_MAP = {
  'unlimited': '不限',
  'douyin': '抖音',
  'kuaishou': '快手',
  'xiaohongshu': '小红书',
  'weibo': '微博',
  'wechat_channel': '微信视频号',
  'other': '其他',
  'unspecified': '未约定'
};

// 排除平台
const EXCLUDED_PLATFORM_MAP = {
  'douyin': '抖音',
  'kuaishou': '快手',
  'xiaohongshu': '小红书',
  'weibo': '微博',
  'wechat_channel': '微信视频号',
  'other': '其他',
  'unspecified': '未约定'
};

// 瑕疵处置方式
const DEFECT_DISPOSAL_METHOD_MAP = {
  'need_edit_confirmation_letter': '需补剪辑确认函',
  'need_right_recovery_letter': '需补权利回收函',
  'need_doc_pending_communication': '需补其他文件，待沟通'
};

// 瑕疵处置结果
const DEFECT_DISPOSAL_RESULT_MAP = {
  'can_supplement_confirmation': '可补确认函',
  'cannot_supplement_confirmation': '无法补确认函',
  'no_supplement_required': '不补函'
};

const FLOW_STEPS = [
  { key: 'rights_first_review', label: '初审', reviewByField: 'rights_first_review_by', reviewAtField: 'rights_first_review_at' },
  { key: 'rights_second_review', label: '复审', reviewByField: 'rights_second_review_by', reviewAtField: 'rights_second_review_at' },
  { key: 'rights_third_review', label: '运营授权评估', reviewByField: 'rights_third_review_by', reviewAtField: 'rights_third_review_at' },
  { key: 'confirmed_rights', label: '权益确认', reviewByField: '', reviewAtField: '' }
];

// 品类筛选选项（合并后）
const CATEGORY_FILTER_OPTIONS = ['电视剧', '电影', '综艺', '纪录片', '动漫', '少儿', '微短剧'];

// ============================================================
// 工具函数
// ============================================================

function getPlayCategoryLabel(code) {
  return PLAY_CATEGORY_MAP[code] || code || '-';
}
function getAuditProgressLabel(p) {
  return AUDIT_PROGRESS_MAP[p] || p || '-';
}
function getTaskTypeLabel(t) {
  return TASK_TYPE_MAP[t] || t || '-';
}
function getReviewResultLabel(r) {
  return REVIEW_RESULT_MAP[r] || r || '';
}
function getThirdReviewResultLabel(r) {
  return THIRD_REVIEW_RESULT_MAP[r] || r || '';
}
function getDefectTypeLabel(code) {
  return DEFECT_TYPE_MAP[code] || code || '';
}
function getDefectTypeLabels(codes) {
  if (!codes || codes.length === 0) return '-';
  return codes.map(c => getDefectTypeLabel(c)).join('、');
}
function getPlatformLabel(code) {
  return AUTHORIZED_PLATFORM_MAP[code] || EXCLUDED_PLATFORM_MAP[code] || code || '';
}
function getPlatformLabels(codes) {
  if (!codes || codes.length === 0) return '-';
  return codes.map(c => getPlatformLabel(c)).join('、');
}
function getDisposalMethodLabel(v) {
  return DEFECT_DISPOSAL_METHOD_MAP[v] || v || '';
}
function getDisposalResultLabel(v) {
  return DEFECT_DISPOSAL_RESULT_MAP[v] || v || '';
}

function getProgressBadgeClass(p) {
  switch (p) {
    case 'rights_first_review': return 'rr-badge-first';
    case 'rights_second_review': return 'rr-badge-second';
    case 'rights_third_review': return 'rr-badge-third';
    case 'confirmed_rights': return 'rr-badge-confirmed';
    case 'obsoleted': return 'rr-badge-obsoleted';
    default: return '';
  }
}

function getTaskTypeBadgeClass(t) {
  switch (t) {
    case 'auth_review': return 'rr-badge-auth';
    case 'risk_review': return 'rr-badge-risk';
    case 'rights_change': return 'rr-badge-change';
    default: return '';
  }
}

function getAuthJudgment(item) {
  if (item.rights_third_review_result) {
    return getThirdReviewResultLabel(item.rights_third_review_result);
  }
  return '-';
}

function formatDate(d) {
  if (!d || d === '0000-00-00 00:00:00') return '-';
  return d.length > 10 ? d.substring(0, 10) : d;
}

function formatDateTime(d) {
  if (!d || d === '0000-00-00 00:00:00') return '-';
  return d.length > 16 ? d.substring(0, 16) : d;
}

// SVG 图标
const SVG = {
  search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  chevronLeft: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
  chevronRight: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  alert: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  history: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  eye: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
};

// ============================================================
// 状态管理
// ============================================================

let rrItems = [];          // 授权审查数据
let rrCurrentPage = 1;
const RR_PAGE_SIZE = 10;
let rrCurrentDetailItem = null;  // 当前查看的详情

const rrFilters = {
  audit_progress: '',
  task_type: '',
  play_category: '',
  rights_second_review_result: '',
  keyword: ''
};

// ============================================================
// 列表页：筛选
// ============================================================

function filterRRItems() {
  return rrItems.filter(item => {
    // 不显示废弃记录（除非筛选了废弃）
    if (item.audit_progress === 'obsoleted' && rrFilters.audit_progress !== 'obsoleted') return false;

    if (rrFilters.audit_progress && item.audit_progress !== rrFilters.audit_progress) return false;
    if (rrFilters.task_type && item.task_type !== rrFilters.task_type) return false;
    if (rrFilters.play_category) {
      const label = getPlayCategoryLabel(item.play_category);
      if (label !== rrFilters.play_category) return false;
    }
    if (rrFilters.rights_second_review_result && item.rights_second_review_result !== rrFilters.rights_second_review_result) return false;
    if (rrFilters.keyword) {
      const kw = rrFilters.keyword.toLowerCase();
      const name = (item.play_name || '').toLowerCase();
      const alias = (item.play_name_alias || '').toLowerCase();
      const aid = (item.audit_id || '').toLowerCase();
      if (!name.includes(kw) && !alias.includes(kw) && !aid.includes(kw)) return false;
    }
    return true;
  });
}

// ============================================================
// 列表页：渲染
// ============================================================

function renderRightsReviewV2() {
  const container = document.getElementById('rightsReviewContainer');
  if (!container) return;

  if (!rrItems || rrItems.length === 0) {
    container.innerHTML = '<div class="rr-empty"><p>暂无授权审查任务</p></div>';
    return;
  }

  const filtered = filterRRItems();
  const totalPages = Math.ceil(filtered.length / RR_PAGE_SIZE);
  if (rrCurrentPage > totalPages) rrCurrentPage = totalPages || 1;
  const start = (rrCurrentPage - 1) * RR_PAGE_SIZE;
  const pageData = filtered.slice(start, start + RR_PAGE_SIZE);

  container.innerHTML = `
    <div class="rr-list-header">
      <h3 class="rr-list-title">授权审查任务表</h3>
      <button class="btn-add-auth-ip" onclick="openAddAuthIPModal()">
        ${SVG.plus} <span>添加审查IP</span>
      </button>
    </div>
    <div class="rr-filter-bar-v2">
      <div class="rr-filter-row-v2">
        <div class="rr-filter-group-v2">
          <label>品类</label>
          <select class="rr-filter-sel" id="rrFilterCategory">
            <option value="">全部品类</option>
            ${CATEGORY_FILTER_OPTIONS.map(c => `<option value="${c}" ${rrFilters.play_category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="rr-filter-group-v2">
          <label>任务类型</label>
          <select class="rr-filter-sel" id="rrFilterTaskType">
            <option value="">全部类型</option>
            ${Object.entries(TASK_TYPE_MAP).map(([k,v]) => `<option value="${k}" ${rrFilters.task_type === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="rr-filter-group-v2">
          <label>审核进度</label>
          <select class="rr-filter-sel" id="rrFilterProgress">
            <option value="">全部进度</option>
            ${Object.entries(AUDIT_PROGRESS_MAP).map(([k,v]) => `<option value="${k}" ${rrFilters.audit_progress === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="rr-filter-group-v2">
          <label>复审结论</label>
          <select class="rr-filter-sel" id="rrFilterResult">
            <option value="">全部结论</option>
            ${Object.entries(REVIEW_RESULT_MAP).map(([k,v]) => `<option value="${k}" ${rrFilters.rights_second_review_result === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="rr-filter-group-v2 rr-filter-search-v2">
          <label>关键字</label>
          <div class="rr-search-wrap-v2">
            <input type="text" class="rr-search-input-v2" id="rrFilterKeyword" placeholder="搜索作品名/审核ID..." value="${rrFilters.keyword}">
            <span class="rr-search-icon-v2">${SVG.search}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="rr-table-wrap">
      <table class="rr-table">
        <thead>
          <tr>
            <th>审核ID</th>
            <th>作品名</th>
            <th>品类</th>
            <th>版权ID</th>
            <th>任务时间</th>
            <th>任务类型</th>
            <th>初审结论</th>
            <th>审核进度</th>
            <th>授权判定</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${pageData.length === 0 ? `<tr><td colspan="10" class="rr-table-empty">暂无匹配数据</td></tr>` :
            pageData.map(item => `
              <tr class="rr-table-row" data-audit-id="${item.audit_id}">
                <td class="rr-td-mono">${item.audit_id}</td>
                <td>
                  <div class="rr-td-name">${item.play_name}</div>
                  ${item.play_name_alias ? `<div class="rr-td-alias">${item.play_name_alias}</div>` : ''}
                </td>
                <td>${getPlayCategoryLabel(item.play_category)}</td>
                <td class="rr-td-mono">${item.copyright_id}</td>
                <td>${formatDate(item.task_time)}</td>
                <td><span class="rr-badge ${getTaskTypeBadgeClass(item.task_type)}">${getTaskTypeLabel(item.task_type)}</span></td>
                <td>${getReviewResultLabel(item.rights_first_review_result) || '-'}</td>
                <td><span class="rr-badge ${getProgressBadgeClass(item.audit_progress)}">${getAuditProgressLabel(item.audit_progress)}</span></td>
                <td>${getAuthJudgment(item)}</td>
                <td><button class="rr-btn-view" onclick="openRRDetailV2('${item.audit_id}')">${SVG.eye} 查看</button></td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>
    ${totalPages > 1 ? renderRRPagination(filtered.length, totalPages) : `<div class="rr-pagination-info">共 ${filtered.length} 条</div>`}
  `;

  // 绑定筛选事件
  bindRRFiltersV2();
}

function renderRRPagination(total, totalPages) {
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(`<button class="rr-page-btn ${i === rrCurrentPage ? 'active' : ''}" data-rrpage="${i}">${i}</button>`);
  }
  return `
    <div class="rr-pagination-v2">
      <button class="rr-page-btn" ${rrCurrentPage <= 1 ? 'disabled' : ''} data-rrpage="${rrCurrentPage - 1}">${SVG.chevronLeft}</button>
      ${pages.join('')}
      <button class="rr-page-btn" ${rrCurrentPage >= totalPages ? 'disabled' : ''} data-rrpage="${rrCurrentPage + 1}">${SVG.chevronRight}</button>
      <span class="rr-page-info-v2">共 ${total} 条</span>
    </div>
  `;
}

function bindRRFiltersV2() {
  const selCat = document.getElementById('rrFilterCategory');
  const selType = document.getElementById('rrFilterTaskType');
  const selProg = document.getElementById('rrFilterProgress');
  const selRes = document.getElementById('rrFilterResult');
  const inputKw = document.getElementById('rrFilterKeyword');

  if (selCat) selCat.onchange = function() { rrFilters.play_category = this.value; rrCurrentPage = 1; renderRightsReviewV2(); };
  if (selType) selType.onchange = function() { rrFilters.task_type = this.value; rrCurrentPage = 1; renderRightsReviewV2(); };
  if (selProg) selProg.onchange = function() { rrFilters.audit_progress = this.value; rrCurrentPage = 1; renderRightsReviewV2(); };
  if (selRes) selRes.onchange = function() { rrFilters.rights_second_review_result = this.value; rrCurrentPage = 1; renderRightsReviewV2(); };
  if (inputKw) {
    let debounce;
    inputKw.oninput = function() {
      clearTimeout(debounce);
      debounce = setTimeout(() => { rrFilters.keyword = this.value; rrCurrentPage = 1; renderRightsReviewV2(); }, 300);
    };
  }

  // 分页按钮
  document.querySelectorAll('.rr-page-btn[data-rrpage]').forEach(btn => {
    btn.onclick = function() {
      const p = parseInt(this.dataset.rrpage);
      if (p >= 1) { rrCurrentPage = p; renderRightsReviewV2(); }
    };
  });
}

// ============================================================
// 详情页：入口
// ============================================================

function openRRDetailV2(auditId) {
  const item = rrItems.find(i => i.audit_id === auditId);
  if (!item) return;
  rrCurrentDetailItem = item;

  // 隐藏列表，显示详情
  const listTab = document.getElementById('tabRightsReview');
  const detailPage = document.getElementById('rightsReviewDetailPage');
  const catTabs = document.getElementById('authCategoryTabs');
  if (listTab) listTab.style.display = 'none';
  if (detailPage) detailPage.style.display = 'block';
  if (catTabs) catTabs.style.display = 'none';

  renderRRDetailV2(item);
}

function closeRRDetailV2() {
  rrCurrentDetailItem = null;
  const listTab = document.getElementById('tabRightsReview');
  const detailPage = document.getElementById('rightsReviewDetailPage');
  const catTabs = document.getElementById('authCategoryTabs');
  if (listTab) listTab.style.display = 'block';
  if (detailPage) detailPage.style.display = 'none';
  if (catTabs) catTabs.style.display = 'flex';
  renderRightsReviewV2();
}

// ============================================================
// 详情页：渲染
// ============================================================

function renderRRDetailV2(item) {
  // 面包屑
  const titleEl = document.getElementById('rrDetailPageTitle');
  if (titleEl) titleEl.textContent = `${item.play_name}-授权详情`;
  const backBtn = document.getElementById('btnBackToRightsReview');
  if (backBtn) backBtn.onclick = closeRRDetailV2;

  // 作品基础信息
  renderWorkInfoCard(item);
  // 流程进度条
  renderFlowSteps(item);
  // 权益审核区
  renderReviewSection(item);
}

function renderWorkInfoCard(item) {
  const card = document.getElementById('rrdInfoCard');
  if (!card) return;

  const pic = item.cid_info?.new_pic_vt || 'https://picsum.photos/seed/default/180/240';

  card.innerHTML = `
    <div class="rrd-info-layout">
      <div class="rrd-cover">
        <img src="${pic}" alt="${item.play_name}" onerror="this.src='https://picsum.photos/seed/fallback/180/240'">
      </div>
      <div class="rrd-info-body">
        <div class="rrd-info-title-row">
          <h2 class="rrd-info-title">${item.play_name}</h2>
          ${item.play_name_alias ? `<span class="rrd-info-alias">${item.play_name_alias}</span>` : ''}
          <span class="rr-badge ${getTaskTypeBadgeClass(item.task_type)}">${getTaskTypeLabel(item.task_type)}</span>
          <span class="rr-badge ${getProgressBadgeClass(item.audit_progress)}">${getAuditProgressLabel(item.audit_progress)}</span>
        </div>
        <div class="rrd-info-fields">
          <div class="rrd-info-field"><span class="rrd-info-label">品类</span><span class="rrd-info-value">${getPlayCategoryLabel(item.play_category)}</span></div>
          <div class="rrd-info-field"><span class="rrd-info-label">版权ID</span><span class="rrd-info-value rrd-mono">${item.copyright_id}</span></div>
          <div class="rrd-info-field"><span class="rrd-info-label">审核ID</span><span class="rrd-info-value rrd-mono">${item.audit_id}</span></div>
          <div class="rrd-info-field"><span class="rrd-info-label">主CID</span><span class="rrd-info-value rrd-mono">${item.main_cid || '-'}</span></div>
          <div class="rrd-info-field"><span class="rrd-info-label">任务时间</span><span class="rrd-info-value">${formatDateTime(item.task_time)}</span></div>
          <div class="rrd-info-field"><span class="rrd-info-label">热度</span><span class="rrd-info-value">${item.cid_info?.hot_level || '-'}</span></div>
        </div>
        <div class="rrd-info-actions">
          <button class="rrd-btn-history" onclick="openAuthHistoryV2('${item.copyright_id}')">${SVG.history} 审核历史</button>
        </div>
      </div>
    </div>
  `;
}

function renderFlowSteps(item) {
  const container = document.getElementById('rrdReviewNodes');
  if (!container) return;

  const currentIdx = AUDIT_PROGRESS_ORDER[item.audit_progress] ?? -1;
  const isObsoleted = item.audit_progress === 'obsoleted';

  container.innerHTML = `
    <div class="rr-flow-steps">
      ${FLOW_STEPS.map((step, idx) => {
        let status = 'pending';
        let operator = '';
        let time = '';
        if (isObsoleted) {
          status = 'obsoleted';
        } else if (idx < currentIdx) {
          status = 'completed';
          operator = item[step.reviewByField] || '';
          time = formatDateTime(item[step.reviewAtField]);
        } else if (idx === currentIdx && item.audit_progress !== 'confirmed_rights') {
          status = 'active';
        } else if (item.audit_progress === 'confirmed_rights') {
          status = idx <= 3 ? 'completed' : 'pending';
          if (idx < 3) {
            operator = item[step.reviewByField] || '';
            time = formatDateTime(item[step.reviewAtField]);
          }
        }

        return `
          <div class="rr-flow-step ${status}">
            <div class="rr-flow-step-dot">
              ${status === 'completed' ? SVG.check : (status === 'active' ? '<span class="rr-flow-dot-active"></span>' : '<span class="rr-flow-dot-pending"></span>')}
            </div>
            <div class="rr-flow-step-label">${step.label}</div>
            ${operator ? `<div class="rr-flow-step-info">${operator} · ${time}</div>` : ''}
            ${idx < FLOW_STEPS.length - 1 ? '<div class="rr-flow-step-line"></div>' : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderReviewSection(item) {
  const container = document.getElementById('rrdRightsList');
  if (!container) return;

  const currentIdx = AUDIT_PROGRESS_ORDER[item.audit_progress] ?? -1;

  container.innerHTML = `
    <div class="rr-review-panels">
      ${renderFirstReviewPanel(item, currentIdx)}
      ${renderSecondReviewPanel(item, currentIdx)}
      ${renderThirdReviewPanel(item, currentIdx)}
    </div>
  `;
}

// ============================================================
// 审核表单面板
// ============================================================

function renderFirstReviewPanel(item, currentIdx) {
  const isEditable = item.audit_progress === 'rights_first_review';
  const isCompleted = currentIdx > 0;
  const statusClass = isEditable ? 'rr-panel-active' : (isCompleted ? 'rr-panel-done' : 'rr-panel-pending');

  return `
    <div class="rr-review-panel ${statusClass}">
      <div class="rr-panel-header">
        <h4>初审</h4>
        <span class="rr-panel-status">${isEditable ? '当前阶段' : (isCompleted ? '已完成' : '待处理')}</span>
      </div>
      <div class="rr-panel-body">
          ${isCompleted || isEditable ? `
          <div class="rr-form-row">
            <span class="rr-form-label">初审结论</span>
            <span class="rr-form-value">${isEditable ? `
              <select class="rr-form-select" id="rrFirstResult">
                <option value="">请选择</option>
                <option value="rights_available">权利可用</option>
                <option value="rights_defect">权利瑕疵</option>
              </select>
            ` : `<span class="rr-badge ${item.rights_first_review_result === 'rights_available' ? 'rr-badge-confirmed' : 'rr-badge-risk'}">${getReviewResultLabel(item.rights_first_review_result)}</span>`}</span>
          </div>
          ${(isCompleted && item.rights_first_review_defect_type?.length > 0) || isEditable ? `
            <div class="rr-form-row" id="rrFirstDefectRow" ${isEditable ? 'style="display:none"' : ''}>
              <span class="rr-form-label">瑕疵类型</span>
              <span class="rr-form-value">${isCompleted ? getDefectTypeLabels(item.rights_first_review_defect_type) : `
                <div class="rr-checkbox-group">
                  ${Object.entries(DEFECT_TYPE_MAP).map(([k,v]) => `<label class="rr-checkbox-label"><input type="checkbox" value="${k}" class="rrFirstDefect"> ${v}</label>`).join('')}
                </div>
              `}</span>
            </div>
          ` : ''}
          <div class="rr-form-row">
            <span class="rr-form-label">可授权平台</span>
            <span class="rr-form-value">${isEditable ? `
              <div class="rr-checkbox-group">
                ${Object.entries(AUTHORIZED_PLATFORM_MAP).map(([k,v]) => `<label class="rr-checkbox-label"><input type="checkbox" value="${k}" class="rrFirstPlatform"> ${v}</label>`).join('')}
              </div>
            ` : getPlatformLabels(item.rights_first_review_authorized_platforms)}</span>
          </div>
          <div class="rr-form-row">
            <span class="rr-form-label">备注</span>
            <span class="rr-form-value">${isEditable ? `<textarea class="rr-form-textarea" id="rrFirstRemark" placeholder="选填"></textarea>` : (item.rights_first_review_remark || '-')}</span>
          </div>
          ${isCompleted ? `
            <div class="rr-form-row rr-form-meta">
              <span class="rr-form-label">操作人</span>
              <span class="rr-form-value">${item.rights_first_review_by || '-'} · ${formatDateTime(item.rights_first_review_at)}</span>
            </div>
          ` : ''}
          ${isEditable ? `
            <div class="rr-form-actions">
              <button class="rr-btn-submit" onclick="submitFirstReviewV2()">提交初审</button>
            </div>
          ` : ''}
        ` : '<div class="rr-panel-placeholder">等待上一阶段完成</div>'}
      </div>
    </div>
  `;
}

function renderSecondReviewPanel(item, currentIdx) {
  const isEditable = item.audit_progress === 'rights_second_review';
  const isCompleted = currentIdx > 1;
  const statusClass = isEditable ? 'rr-panel-active' : (isCompleted ? 'rr-panel-done' : 'rr-panel-pending');

  return `
    <div class="rr-review-panel ${statusClass}">
      <div class="rr-panel-header">
        <h4>复审</h4>
        <span class="rr-panel-status">${isEditable ? '当前阶段' : (isCompleted ? '已完成' : '待处理')}</span>
      </div>
      <div class="rr-panel-body">
        ${isCompleted || isEditable ? `
          <div class="rr-form-row">
            <span class="rr-form-label">复审结论</span>
            <span class="rr-form-value">${isEditable ? `
              <select class="rr-form-select" id="rrSecondResult">
                <option value="">请选择</option>
                <option value="rights_available">权利可用</option>
                <option value="rights_defect">权利瑕疵</option>
              </select>
            ` : `<span class="rr-badge ${item.rights_second_review_result === 'rights_available' ? 'rr-badge-confirmed' : 'rr-badge-risk'}">${getReviewResultLabel(item.rights_second_review_result)}</span>`}</span>
          </div>
          <div class="rr-form-row">
            <span class="rr-form-label">授权平台</span>
            <span class="rr-form-value">${isEditable ? `
              <div class="rr-checkbox-group">
                ${Object.entries(AUTHORIZED_PLATFORM_MAP).map(([k,v]) => `<label class="rr-checkbox-label"><input type="checkbox" value="${k}" class="rrSecondPlatform"> ${v}</label>`).join('')}
              </div>
            ` : getPlatformLabels(item.rights_second_review_authorized_platforms)}</span>
          </div>
          ${isEditable ? `
            <div class="rr-form-row">
              <span class="rr-form-label">瑕疵处置方式</span>
              <span class="rr-form-value">
                <select class="rr-form-select" id="rrSecondDisposal">
                  <option value="">请选择</option>
                  ${Object.entries(DEFECT_DISPOSAL_METHOD_MAP).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
                </select>
              </span>
            </div>
            <div class="rr-form-row">
              <span class="rr-form-label">授权依据</span>
              <span class="rr-form-value">
                <select class="rr-form-select" id="rrSecondImportRightsId">
                  ${(item.import_copr_rights_ids || []).length === 0 ? '<option value="">无可选权益</option>' :
                    (item.import_copr_rights_ids.length === 1 ?
                      `<option value="${item.import_copr_rights_ids[0]}" selected>${item.import_copr_rights_ids[0]}</option>` :
                      `<option value="">请选择引入权益</option>${item.import_copr_rights_ids.map(id => `<option value="${id}">${id}</option>`).join('')}`
                    )
                  }
                </select>
              </span>
            </div>
            <div class="rr-form-row">
              <span class="rr-form-label">备注</span>
              <span class="rr-form-value"><textarea class="rr-form-textarea" id="rrSecondRemark" placeholder="选填"></textarea></span>
            </div>
            <div class="rr-form-actions">
              <button class="rr-btn-submit" onclick="submitSecondReviewV2()">提交复审</button>
            </div>
          ` : `
            ${item.rights_second_review_defect_disposal_method ? `<div class="rr-form-row"><span class="rr-form-label">瑕疵处置</span><span class="rr-form-value">${getDisposalMethodLabel(item.rights_second_review_defect_disposal_method)}</span></div>` : ''}
            ${item.import_copr_rights_id ? `<div class="rr-form-row"><span class="rr-form-label">授权依据</span><span class="rr-form-value rrd-mono">${item.import_copr_rights_id}</span></div>` : ''}
            <div class="rr-form-row rr-form-meta">
              <span class="rr-form-label">操作人</span>
              <span class="rr-form-value">${item.rights_second_review_by || '-'} · ${formatDateTime(item.rights_second_review_at)}</span>
            </div>
          `}
        ` : '<div class="rr-panel-placeholder">等待上一阶段完成</div>'}
      </div>
    </div>
  `;
}

function renderThirdReviewPanel(item, currentIdx) {
  const isEditable = item.audit_progress === 'rights_third_review';
  const isCompleted = currentIdx > 2;
  const statusClass = isEditable ? 'rr-panel-active' : (isCompleted ? 'rr-panel-done' : 'rr-panel-pending');

  // 风险标记
  const riskFlags = [];
  if (item.is_risk_vertical_short_drama) riskFlags.push({ icon: SVG.alert, text: '竖屏微短剧风险提示', type: 'warning' });
  if (item.is_restricted_kuaishou) riskFlags.push({ icon: SVG.alert, text: '快手平台受限（竖屏微短剧+竖屏品类）', type: 'danger' });
  if (item.is_risk_edit_duration) riskFlags.push({ icon: SVG.alert, text: '剪辑时长风险（1-3分钟）', type: 'warning' });

  return `
    <div class="rr-review-panel ${statusClass}">
      <div class="rr-panel-header">
        <h4>运营授权评估</h4>
        <span class="rr-panel-status">${isEditable ? '当前阶段' : (isCompleted ? '已完成' : '待处理')}</span>
      </div>
      <div class="rr-panel-body">
        ${riskFlags.length > 0 ? `
          <div class="rr-risk-flags">
            ${riskFlags.map(f => `<div class="rr-risk-flag ${f.type}">${f.icon} ${f.text}</div>`).join('')}
          </div>
        ` : ''}
        ${isCompleted || isEditable ? `
          <div class="rr-form-row">
            <span class="rr-form-label">授权结论</span>
            <span class="rr-form-value">${isEditable ? `
              <select class="rr-form-select" id="rrThirdResult">
                <option value="">请选择</option>
                <option value="can_authorized">可授权</option>
                <option value="not_authorized">不可授权</option>
              </select>
            ` : `<span class="rr-badge ${item.rights_third_review_result === 'can_authorized' ? 'rr-badge-confirmed' : 'rr-badge-risk'}">${getThirdReviewResultLabel(item.rights_third_review_result)}</span>`}</span>
          </div>
          <div class="rr-platform-auth-section" id="rrThirdPlatformSection" ${isEditable ? 'style="display:none"' : ''}>
            <div class="rr-form-row">
              <span class="rr-form-label">快手授权</span>
              <span class="rr-form-value">${isEditable ? `
                <label class="rr-checkbox-label"><input type="checkbox" id="rrThirdKs" ${item.is_restricted_kuaishou ? 'disabled' : ''}> 授权快手</label>
                ${item.is_restricted_kuaishou ? '<span class="rr-restricted-hint">（受限不可勾选）</span>' : ''}
                <div class="rr-date-range" id="rrThirdKsDates" style="display:none">
                  <input type="date" class="rr-form-date" id="rrThirdKsStart"> — <input type="date" class="rr-form-date" id="rrThirdKsEnd">
                  <span class="rr-proxy-hint">代理发行截止：${item.proxy_time_end_kuaishou}</span>
                </div>
              ` : `${item.rights_third_review_authorized_platform_kuaishou === 'Y' ? `<span class="rr-badge rr-badge-confirmed">已授权</span> ${formatDate(item.rights_third_review_authorized_platform_kuaishou_start_date)} — ${formatDate(item.rights_third_review_authorized_platform_kuaishou_end_date)}` : '<span class="rr-text-dim">未授权</span>'}`}</span>
            </div>
            <div class="rr-form-row">
              <span class="rr-form-label">抖音授权</span>
              <span class="rr-form-value">${isEditable ? `
                <label class="rr-checkbox-label"><input type="checkbox" id="rrThirdDy"> 授权抖音</label>
                <div class="rr-date-range" id="rrThirdDyDates" style="display:none">
                  <input type="date" class="rr-form-date" id="rrThirdDyStart"> — <input type="date" class="rr-form-date" id="rrThirdDyEnd">
                  <span class="rr-proxy-hint">代理发行截止：${item.proxy_time_end_douyin}</span>
                </div>
              ` : `${item.rights_third_review_authorized_platform_douyin === 'Y' ? `<span class="rr-badge rr-badge-confirmed">已授权</span> ${formatDate(item.rights_third_review_authorized_platform_douyin_start_date)} — ${formatDate(item.rights_third_review_authorized_platform_douyin_end_date)}` : '<span class="rr-text-dim">未授权</span>'}`}</span>
            </div>
            ${isCompleted && item.kuaishou_is_ott_available ? `
              <div class="rr-form-row">
                <span class="rr-form-label">快手OTT</span>
                <span class="rr-form-value">${item.kuaishou_is_ott_available === '1' ? '<span class="rr-badge rr-badge-confirmed">可用</span>' : '<span class="rr-badge rr-badge-risk">不可用</span>'}</span>
              </div>
            ` : ''}
          </div>
          ${isEditable ? `
            <div class="rr-form-actions">
              <button class="rr-btn-submit" onclick="submitThirdReviewV2()">提交三审</button>
            </div>
          ` : `
            <div class="rr-form-row rr-form-meta">
              <span class="rr-form-label">操作人</span>
              <span class="rr-form-value">${item.rights_third_review_by || '-'} · ${formatDateTime(item.rights_third_review_at)}</span>
            </div>
          `}
        ` : '<div class="rr-panel-placeholder">等待上一阶段完成</div>'}
      </div>
    </div>
  `;
}

// ============================================================
// 提交审核（Mock）
// ============================================================

function submitFirstReviewV2() {
  if (!rrCurrentDetailItem) return;
  const result = document.getElementById('rrFirstResult')?.value;
  if (!result) { alert('请选择初审结论'); return; }

  const platforms = Array.from(document.querySelectorAll('.rrFirstPlatform:checked')).map(c => c.value);
  const remark = document.getElementById('rrFirstRemark')?.value || '';
  const defectTypes = Array.from(document.querySelectorAll('.rrFirstDefect:checked')).map(c => c.value);

  // Mock 更新
  rrCurrentDetailItem.rights_first_review_result = result;
  rrCurrentDetailItem.rights_first_review_authorized_platforms = platforms;
  rrCurrentDetailItem.rights_first_review_remark = remark;
  rrCurrentDetailItem.rights_first_review_by = 'demo_user';
  rrCurrentDetailItem.rights_first_review_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
  if (result === 'rights_defect' && defectTypes.length > 0) {
    rrCurrentDetailItem.rights_first_review_defect_type = defectTypes;
  }
  rrCurrentDetailItem.audit_progress = 'rights_second_review';
  rrCurrentDetailItem.updated_at = rrCurrentDetailItem.rights_first_review_at;

  alert('初审提交成功，已流转至复审');
  renderRRDetailV2(rrCurrentDetailItem);
}

function submitSecondReviewV2() {
  if (!rrCurrentDetailItem) return;
  const result = document.getElementById('rrSecondResult')?.value;
  if (!result) { alert('请选择复审结论'); return; }

  const platforms = Array.from(document.querySelectorAll('.rrSecondPlatform:checked')).map(c => c.value);
  const disposal = document.getElementById('rrSecondDisposal')?.value || '';
  const remark = document.getElementById('rrSecondRemark')?.value || '';
  const importRightsId = document.getElementById('rrSecondImportRightsId')?.value || '';

  rrCurrentDetailItem.rights_second_review_result = result;
  rrCurrentDetailItem.rights_second_review_authorized_platforms = platforms;
  rrCurrentDetailItem.rights_second_review_defect_disposal_method = disposal;
  rrCurrentDetailItem.rights_second_review_remark = remark;
  rrCurrentDetailItem.import_copr_rights_id = importRightsId;
  rrCurrentDetailItem.rights_second_review_by = 'demo_user';
  rrCurrentDetailItem.rights_second_review_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
  rrCurrentDetailItem.audit_progress = 'rights_third_review';
  rrCurrentDetailItem.updated_at = rrCurrentDetailItem.rights_second_review_at;

  alert('复审提交成功，已流转至运营授权评估');
  renderRRDetailV2(rrCurrentDetailItem);
}

function submitThirdReviewV2() {
  if (!rrCurrentDetailItem) return;
  const result = document.getElementById('rrThirdResult')?.value;
  if (!result) { alert('请选择授权结论'); return; }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  if (result === 'can_authorized') {
    const ks = document.getElementById('rrThirdKs')?.checked;
    const dy = document.getElementById('rrThirdDy')?.checked;
    if (!ks && !dy) { alert('授权时至少选择一个平台'); return; }

    if (ks) {
      const start = document.getElementById('rrThirdKsStart')?.value;
      const end = document.getElementById('rrThirdKsEnd')?.value;
      if (!start || !end) { alert('请填写快手授权日期'); return; }
      rrCurrentDetailItem.rights_third_review_authorized_platform_kuaishou = 'Y';
      rrCurrentDetailItem.rights_third_review_authorized_platform_kuaishou_start_date = start;
      rrCurrentDetailItem.rights_third_review_authorized_platform_kuaishou_end_date = end;
      rrCurrentDetailItem.export_copr_rights_id_kuaishou = rrCurrentDetailItem.copyright_id + '-exp-ks-' + Date.now();
    }
    if (dy) {
      const start = document.getElementById('rrThirdDyStart')?.value;
      const end = document.getElementById('rrThirdDyEnd')?.value;
      if (!start || !end) { alert('请填写抖音授权日期'); return; }
      rrCurrentDetailItem.rights_third_review_authorized_platform_douyin = 'Y';
      rrCurrentDetailItem.rights_third_review_authorized_platform_douyin_start_date = start;
      rrCurrentDetailItem.rights_third_review_authorized_platform_douyin_end_date = end;
      rrCurrentDetailItem.export_copr_rights_id_douyin = rrCurrentDetailItem.copyright_id + '-exp-dy-' + Date.now();
    }
  }

  rrCurrentDetailItem.rights_third_review_result = result;
  rrCurrentDetailItem.rights_third_review_by = 'demo_user';
  rrCurrentDetailItem.rights_third_review_at = now;
  rrCurrentDetailItem.audit_progress = 'confirmed_rights';
  rrCurrentDetailItem.updated_at = now;

  alert(result === 'can_authorized' ? '三审提交成功，权益已确认授权' : '三审提交成功，判定为不可授权');
  renderRRDetailV2(rrCurrentDetailItem);
}

// ============================================================
// 三审表单动态交互
// ============================================================

document.addEventListener('change', function(e) {
  // 初审：根据结论显示/隐藏瑕疵类型
  if (e.target.id === 'rrFirstResult') {
    const row = document.getElementById('rrFirstDefectRow');
    if (row) row.style.display = e.target.value === 'rights_defect' ? '' : 'none';
  }
  // 三审：根据结论显示/隐藏平台选择
  if (e.target.id === 'rrThirdResult') {
    const section = document.getElementById('rrThirdPlatformSection');
    if (section) section.style.display = e.target.value === 'can_authorized' ? '' : 'none';
  }
  // 三审：快手勾选显示日期
  if (e.target.id === 'rrThirdKs') {
    const dates = document.getElementById('rrThirdKsDates');
    if (dates) dates.style.display = e.target.checked ? '' : 'none';
  }
  // 三审：抖音勾选显示日期
  if (e.target.id === 'rrThirdDy') {
    const dates = document.getElementById('rrThirdDyDates');
    if (dates) dates.style.display = e.target.checked ? '' : 'none';
  }
});

// ============================================================
// 审核历史抽屉
// ============================================================

function openAuthHistoryV2(copyrightId) {
  const records = rrItems.filter(i => i.copyright_id === copyrightId);
  const drawer = document.getElementById('rrHistoryDrawer') || createHistoryDrawer();
  const body = drawer.querySelector('.rr-drawer-body');

  if (records.length === 0) {
    body.innerHTML = '<div class="rr-empty">暂无审核历史</div>';
  } else {
    body.innerHTML = `
      <table class="rr-table rr-history-table">
        <thead><tr><th>审核ID</th><th>任务类型</th><th>审核进度</th><th>授权判定</th><th>任务时间</th></tr></thead>
        <tbody>
          ${records.map(r => `
            <tr>
              <td class="rr-td-mono">${r.audit_id}</td>
              <td><span class="rr-badge ${getTaskTypeBadgeClass(r.task_type)}">${getTaskTypeLabel(r.task_type)}</span></td>
              <td><span class="rr-badge ${getProgressBadgeClass(r.audit_progress)}">${getAuditProgressLabel(r.audit_progress)}</span></td>
              <td>${getAuthJudgment(r)}</td>
              <td>${formatDate(r.task_time)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  drawer.style.display = 'flex';
}

function createHistoryDrawer() {
  const drawer = document.createElement('div');
  drawer.id = 'rrHistoryDrawer';
  drawer.className = 'rr-drawer-mask';
  drawer.innerHTML = `
    <div class="rr-drawer-panel">
      <div class="rr-drawer-header">
        <h3>审核历史</h3>
        <button class="rr-drawer-close" onclick="closeHistoryDrawer()">${SVG.x}</button>
      </div>
      <div class="rr-drawer-body"></div>
    </div>
  `;
  drawer.addEventListener('click', function(e) { if (e.target === drawer) closeHistoryDrawer(); });
  document.body.appendChild(drawer);
  return drawer;
}

function closeHistoryDrawer() {
  const drawer = document.getElementById('rrHistoryDrawer');
  if (drawer) drawer.style.display = 'none';
}

// ============================================================
// 初始化入口（被 main.js 调用）
// ============================================================

function initRightsReviewV2(data) {
  rrItems = data?.rightsReviewData?.items || [];
  rrCurrentPage = 1;
  renderRightsReviewV2();
}
