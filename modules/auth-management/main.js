/**
 * 授权管理模块
 */

let authData = null;
let currentDetailProject = null;

/**
 * 初始化模块
 */
async function initAuthManagementModule() {
    console.log('[授权管理] 模块初始化');

    if (!authData) {
        await loadAuthData();
    }

    renderProjectList();
    bindEvents();
    bindAuthTabs();
}

/**
 * 加载数据
 */
async function loadAuthData() {
    try {
        const response = await fetch('modules/auth-management/data.json');
        authData = await response.json();
        console.log('[授权管理] 数据加载成功', authData);
    } catch (error) {
        console.error('[授权管理] 数据加载失败:', error);
        authData = { tasks: {}, projects: [] };
    }
}

/**
 * 渲染任务指标卡
 */
function renderTaskCards() {
    const container = document.getElementById('taskCardsContainer');
    if (!container || !authData) return;

    const taskTypes = [
        { key: 'approve', className: 'task-approve', icon: 'clipboard-check' },
        { key: 'work', className: 'task-work', icon: 'clapperboard' }
    ];

    container.innerHTML = taskTypes.map(type => {
        const task = authData.tasks[type.key];
        if (!task) return '';

        return `
            <div class="task-card ${type.className}">
                <div class="task-card-header">
                    <div class="task-card-label">
                        <i data-lucide="${type.icon}" class="task-card-title-icon"></i>
                        <span class="task-card-name">${task.label}</span>
                    </div>
                    <button class="task-card-action" data-action="handle-task" data-type="${type.key}">
                        去处理
                        <i data-lucide="chevron-right"></i>
                    </button>
                </div>
                <div class="task-card-body">
                    <span class="task-total-number" data-action="task-total" data-type="${type.key}">${task.total}</span>
                    <span class="task-total-unit">项待处理</span>
                </div>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * 渲染项目列表
 */
// ========== M1: 项目列表（v2 按执行规格重写）==========

const RIGHTS_TYPE_MAP = {
  'secondary_creation': '二创权+剪辑权', 'distribution': '信网权+转授权',
  'broadcast': '信网权+播控权', 'adaptation': '改编权', 'ip_usage': 'IP使用权',
  'comprehensive': '综合权益', 'aigc': 'AIGC权益'
};
const AUDIT_MODE_MAP = { 'rolling': '多轮滚动审核', 'one_time': '单次审批', 'no_audit': '免审核' };
const PROJECT_STATUS_MAP = {
  'configuring': { label: '配置中', cls: 'prj-status-gray' },
  'running': { label: '运行中', cls: 'prj-status-green' },
  'suspended': { label: '已暂停', cls: 'prj-status-orange' },
  'expired': { label: '已到期', cls: 'prj-status-red' },
  'archived': { label: '已归档', cls: 'prj-status-light' }
};

let projectFilters = { rights_type: '', audit_mode: '', status: '' };

function renderProjectList() {
    const container = document.getElementById('projectListContainer');
    if (!container || !authData) return;

    let projects = (authData.projects || []).filter(p => p.status !== 'deleted');

    // 渲染筛选区
    const filterArea = document.getElementById('projectFilterArea');
    if (filterArea) {
        filterArea.innerHTML = `
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:16px">
            <select id="prjFilterRightsType" style="padding:6px 10px;border:1px solid #d0d5dd;border-radius:6px;font-size:12px">
              <option value="">全部权利类型</option>
              ${Object.entries(RIGHTS_TYPE_MAP).map(([k,v]) => `<option value="${k}" ${projectFilters.rights_type===k?'selected':''}>${v}</option>`).join('')}
            </select>
            <select id="prjFilterAuditMode" style="padding:6px 10px;border:1px solid #d0d5dd;border-radius:6px;font-size:12px">
              <option value="">全部审核方式</option>
              ${Object.entries(AUDIT_MODE_MAP).map(([k,v]) => `<option value="${k}" ${projectFilters.audit_mode===k?'selected':''}>${v}</option>`).join('')}
            </select>
            <select id="prjFilterStatus" style="padding:6px 10px;border:1px solid #d0d5dd;border-radius:6px;font-size:12px">
              <option value="">全部状态</option>
              ${Object.entries(PROJECT_STATUS_MAP).map(([k,v]) => `<option value="${k}" ${projectFilters.status===k?'selected':''}>${v.label}</option>`).join('')}
            </select>
          </div>`;
        // 绑定筛选事件
        ['prjFilterRightsType','prjFilterAuditMode','prjFilterStatus'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.onchange = function() {
                if (id.includes('RightsType')) projectFilters.rights_type = this.value;
                if (id.includes('AuditMode')) projectFilters.audit_mode = this.value;
                if (id.includes('Status')) projectFilters.status = this.value;
                renderProjectList();
            };
        });
    }

    // 应用筛选
    if (projectFilters.rights_type) projects = projects.filter(p => p.rights_type === projectFilters.rights_type);
    if (projectFilters.audit_mode) projects = projects.filter(p => p.audit_mode === projectFilters.audit_mode);
    if (projectFilters.status) projects = projects.filter(p => p.status === projectFilters.status);

    if (projects.length === 0) {
        const hasFilters = projectFilters.rights_type || projectFilters.audit_mode || projectFilters.status;
        container.innerHTML = hasFilters
            ? '<div style="text-align:center;padding:60px 0;color:#999;font-size:14px">暂无匹配项目</div>'
            : '<div style="text-align:center;padding:60px 0;color:#999;font-size:14px">暂无项目，点击「创建项目」开始</div>';
        return;
    }

    container.innerHTML = projects.map(p => {
        const st = PROJECT_STATUS_MAP[p.status] || { label: p.status, cls: '' };
        return `
            <div class="project-card" data-project-id="${p.id}" style="cursor:pointer" onclick="openProjectDetail('${p.id}')">
                <div class="project-card-inner">
                    <div class="project-status-bar ${p.status}"></div>
                    <div class="project-card-body">
                        <div class="project-card-top">
                            <div class="project-name-group">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6c5ce7" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                                <span class="project-name">${p.name}</span>
                            </div>
                            <span class="${st.cls}" style="padding:2px 8px;border-radius:10px;font-size:11px;font-weight:500">${st.label}</span>
                        </div>
                        <div style="display:flex;gap:8px;margin:8px 0;flex-wrap:wrap">
                            <span style="background:#eff6ff;color:#1e40af;padding:2px 8px;border-radius:4px;font-size:11px">${RIGHTS_TYPE_MAP[p.rights_type]||p.rights_type}</span>
                            <span style="background:#f0fdf4;color:#166534;padding:2px 8px;border-radius:4px;font-size:11px">${AUDIT_MODE_MAP[p.audit_mode]||p.audit_mode}</span>
                        </div>
                        <div class="project-info-row" style="font-size:12px;color:#666;display:grid;grid-template-columns:1fr 1fr;gap:4px 16px">
                            <div><span style="color:#999">合作方</span> ${p.partner_name || '-'}</div>
                            <div><span style="color:#999">品类</span> ${(p.category_scope||[]).join('、')}</div>
                            <div><span style="color:#999">授权时间</span> ${p.auth_window_start||'-'} ~ ${p.auth_window_end||'-'}</div>
                            <div><span style="color:#999">已授权</span> <strong style="color:#2e7d32">${(p.authorized_count||0).toLocaleString()}</strong> · <span style="color:#999">已回收</span> ${p.recovered_count||0}</div>
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * 绑定事件
 */
function bindEvents() {
    const page = document.querySelector('.auth-management-page');
    if (!page) return;

    page.addEventListener('click', function(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;

        switch (action) {
            case 'handle-task':
                showBlankPage(`${getTaskLabel(target.dataset.type)} - 任务列表`, '该任务列表页面正在开发中，敬请期待');
                break;

            case 'task-total':
                showBlankPage(`${getTaskLabel(target.dataset.type)} - 全部任务`, '该任务详情页面正在开发中，敬请期待');
                break;



            case 'view-detail':
                openProjectDetail(target.dataset.project);
                break;

            case 'terminate-auth':
                openTerminateAuthModal(target.dataset.id, target.dataset.work);
                break;

            case 'reauth':
                openReauthModal(target.dataset.id, target.dataset.work);
                break;

            case 'view-application':
                scrollToApplication(target.dataset.appid);
                break;

            case 'toggle-approval-detail':
                toggleApprovalDetail(target.dataset.id);
                break;

            case 'pass-approval':
                e.stopPropagation();
                passApproval(target.dataset.id);
                break;

            case 'reject-approval':
                e.stopPropagation();
                rejectApproval(target.dataset.id);
                break;

            case 'toggle-application-detail':
                toggleApplicationDetail(target.dataset.id);
                break;

            case 'copy-app-link':
                e.stopPropagation();
                copyApplicationLink(target.dataset.id);
                break;

            case 'urge-app':
                e.stopPropagation();
                urgeApplication(target.dataset.id);
                break;

            case 'withdraw-app':
                e.stopPropagation();
                withdrawApplication(target.dataset.id);
                break;

            case 'go-review':
                openRightsReviewDetail(target.dataset.id);
                break;

            case 'view-rr-info':
                openRightsReviewFromProject(target.dataset.bqid);
                break;

            case 'conflict-revoke':
                showBlankPage('撤回授权', '撤回授权流程页面正在开发中，将创建版权运营/法务/品类运营三个团队的审批流链条');
                break;
        }
    });

    // 创建项目按钮
    const btnCreate = document.getElementById('btnCreateProject');
    if (btnCreate) {
        btnCreate.addEventListener('click', function() {
            openCreateProjectModal();
        });
    }

    // 空白页返回按钮
    const btnBack = document.getElementById('btnBlankBack');
    if (btnBack) {
        btnBack.addEventListener('click', hideBlankPage);
    }

    // 点击遮罩关闭
    const overlay = document.getElementById('blankPageOverlay');
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                hideBlankPage();
            }
        });
    }

    // 批量审批弹窗 - 点击遮罩关闭
    const batchModal = document.getElementById('batchApprovalModal');
    if (batchModal) {
        batchModal.addEventListener('click', function(e) {
            if (e.target === batchModal) {
                closeBatchApprovalModal();
            }
        });
        // 单选按钮切换时启用确认按钮
        batchModal.querySelectorAll('.batch-option-radio').forEach(radio => {
            radio.addEventListener('change', function() {
                const confirmBtn = batchModal.querySelector('.batch-modal-confirm');
                if (confirmBtn) confirmBtn.disabled = false;
            });
        });
    }

    // 返回列表
    const btnBackToList = document.getElementById('btnBackToList');
    if (btnBackToList) {
        btnBackToList.addEventListener('click', closeProjectDetail);
    }

    // 授权审查详情页返回按钮
    const btnBackToRR = document.getElementById('btnBackToRightsReview');
    if (btnBackToRR) {
        btnBackToRR.addEventListener('click', function() {
            if (this._fromProject) {
                this._fromProject = false;
                this.textContent = '授权审查';
                // 返回项目详情页
                const page = document.getElementById('rightsReviewDetailPage');
                if (page) page.style.display = 'none';
                const projectDetailPage = document.getElementById('projectDetailPage');
                if (projectDetailPage) projectDetailPage.style.display = 'block';
            } else {
                closeRightsReviewDetail();
            }
        });
    }

    // 终止授权弹窗事件
    bindTerminateModalEvents();

    // 重新授权弹窗事件
    bindReauthModalEvents();

    // 查看申请弹窗事件
    bindViewApplicationModalEvents();

    // 添加审查IP弹窗（初始化不需要绑定，打开时绑定）

    // 时间筛选器：设置默认日期（过去7天）
    const dateStart = document.getElementById('dateStart');
    const dateEnd = document.getElementById('dateEnd');
    if (dateStart && dateEnd) {
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        dateEnd.value = formatDateForInput(today);
        dateStart.value = formatDateForInput(sevenDaysAgo);
    }

    // 导出按钮
    const btnExport = document.getElementById('btnExportData');
    if (btnExport) {
        btnExport.addEventListener('click', function() {
            showBlankPage('数据导出', '数据导出功能正在开发中，敬请期待');
        });
    }
}

/**
 * 获取任务类型标签
 */
function getTaskLabel(type) {
    const labels = {
        approve: '审批任务',
        work: '作品任务'
    };
    return labels[type] || '任务';
}

// ==================== 首页Tab切换 ====================

/**
 * 绑定首页Tab切换事件
 */
function bindAuthTabs() {
    const tabs = document.querySelectorAll('.auth-management-page .category-tab[data-auth-tab]');
    tabs.forEach(tab => {
        if (tab.dataset.eventBound) return;
        tab.dataset.eventBound = 'true';

        tab.addEventListener('click', function() {
            // 移除所有激活状态
            tabs.forEach(t => t.classList.remove('active'));
            // 激活当前Tab
            this.classList.add('active');
            // 切换内容区
            showAuthTab(this.dataset.authTab);
        });
    });
}

/**
 * 显示指定Tab内容区
 */
function showAuthTab(tabKey) {
    // 隐藏所有tab内容区
    const allContents = document.querySelectorAll('.auth-management-page > .auth-tab-content');
    allContents.forEach(el => el.style.display = 'none');

    // 显示目标tab内容区
    const tabMap = {
        'myProjects': 'tabMyProjects',
        'rightsReview': 'tabRightsReview'
    };
    const targetId = tabMap[tabKey];
    if (targetId) {
        const target = document.getElementById(targetId);
        if (target) {
            target.style.display = '';
            // 重新触发动画
            target.style.animation = 'none';
            target.offsetHeight; // force reflow
            target.style.animation = '';
        }
    }

    // 授权审查tab中渲染数据（使用 rights-review.js V2 模块）
    if (tabKey === 'rightsReview') {
        if (typeof initRightsReviewV2 === 'function') {
            initRightsReviewV2(authData);
        } else {
            console.warn('[授权管理] initRightsReviewV2 未就绪，等待加载...');
            setTimeout(function() {
                if (typeof initRightsReviewV2 === 'function') initRightsReviewV2(authData);
            }, 500);
        }
    }
}

// ==================== 项目详情二级页 ====================

/**
 * 打开项目详情页
 */
function openProjectDetail(projectId) {
    const project = authData.projects.find(p => p.id === projectId);
    if (!project) return;

    currentDetailProject = project;

    // 隐藏首页内容（面包屑、tab栏、tab内容区）
    const listSections = document.querySelectorAll('.auth-management-page > .page-breadcrumb, .auth-management-page > .category-tabs, .auth-management-page > .auth-tab-content');
    listSections.forEach(el => el.style.display = 'none');

    // 显示详情页
    const detailPage = document.getElementById('projectDetailPage');
    if (detailPage) {
        detailPage.style.display = 'block';
    }

    // 设置标题
    document.getElementById('detailPageTitle').textContent = `${project.name}详情`;

    // 渲染各区域
    renderDetailHeader(project);
    renderDetailNavBar(project);
    renderDetailSections(project);

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 滚动到顶部
    detailPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * 关闭详情页，回到列表
 */
function closeProjectDetail() {
    currentDetailProject = null;

    // 隐藏详情页
    const detailPage = document.getElementById('projectDetailPage');
    if (detailPage) detailPage.style.display = 'none';

    // 恢复首页内容（面包屑、tab栏、当前激活的tab内容区）
    const breadcrumb = document.querySelector('.auth-management-page > .page-breadcrumb');
    const tabBar = document.querySelector('.auth-management-page > .category-tabs');
    if (breadcrumb) breadcrumb.style.display = '';
    if (tabBar) tabBar.style.display = '';

    // 恢复当前激活tab的内容区
    const activeTab = document.querySelector('.auth-management-page .category-tab.active');
    if (activeTab) {
        const tabKey = activeTab.dataset.authTab;
        showAuthTab(tabKey);
    } else {
        // 默认显示我的项目
        showAuthTab('myProjects');
    }
}

/**
 * 渲染详情头部
 */
function renderDetailHeader(project) {
    const header = document.getElementById('detailHeader');
    if (!header) return;

    header.innerHTML = `
        <div class="detail-header-top">
            <div class="detail-header-name">
                <i data-lucide="layers" class="project-title-icon"></i>
                <h2>${project.name}</h2>
                <span class="detail-id">ID: ${project.id}</span>
            </div>
            <div class="project-status-tag ${project.status}">
                <span class="status-dot"></span>
                <span>${project.statusLabel}</span>
            </div>
        </div>
        <div class="detail-header-info">
            <div class="detail-info-item">授权时间：<span>${project.authPeriod}</span></div>
            <div class="detail-info-item">项目类型：<span>${project.type}</span></div>
        </div>
    `;
}

/**
 * 判断各区域可见性
 */
function getSectionVisibility(project) {
    const isLongTerm = project.type === '长期授权项目';
    const isSingleTerm = project.type === '单次授权项目';
    const isApplying = project.status === 'applying';
    const isAuthorizing = project.status === 'authorizing';
    const isTerminated = project.status === 'terminated';

    let showProjectData = false;
    let showAuthDetails = false;
    let showApplications = false;
    let showApprovals = false;

    if (isSingleTerm) {
        // 单次授权项目：没有项目数据区域
        showProjectData = false;
        if (isApplying) {
            showApplications = true;
            showApprovals = true;
        } else {
            showAuthDetails = true;
            showApplications = true;
            showApprovals = true;
        }
    } else if (isLongTerm) {
        if (isApplying) {
            // 申请中：只有申请和审批
            showApplications = true;
            showApprovals = true;
        } else if (isAuthorizing || isTerminated) {
            // 授权中 / 已终止：四个区域都有
            showProjectData = true;
            showAuthDetails = true;
            showApplications = true;
            showApprovals = true;
        }
    }

    return { showProjectData, showAuthDetails, showApplications, showApprovals };
}

/**
 * 渲染快速跳转导航条
 */
function renderDetailNavBar(project) {
    const navBar = document.getElementById('detailNavBar');
    if (!navBar) return;

    const vis = getSectionVisibility(project);
    const items = [];

    if (vis.showProjectData) items.push({ id: 'anchorProjectData', label: '项目数据', icon: 'bar-chart-3' });
    if (vis.showAuthDetails) items.push({ id: 'anchorAuthDetails', label: '授权片单管理', icon: 'file-text' });
    if (vis.showApprovals) items.push({ id: 'anchorApprovals', label: '项目审批管理', icon: 'clipboard-check' });

    navBar.innerHTML = items.map((item, idx) => `
        <button class="detail-nav-item ${idx === 0 ? 'active' : ''}" data-target="${item.id}">
            <i data-lucide="${item.icon}"></i>
            ${item.label}
        </button>
    `).join('');

    // 点击跳转
    navBar.querySelectorAll('.detail-nav-item').forEach(btn => {
        btn.addEventListener('click', function() {
            navBar.querySelectorAll('.detail-nav-item').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const anchor = document.getElementById(this.dataset.target);
            if (anchor) {
                anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

/**
 * 渲染详情各区域
 */
function renderDetailSections(project) {
    const vis = getSectionVisibility(project);
    const detail = project.detail || {};

    // 项目数据
    const sectionData = document.getElementById('sectionProjectData');
    if (sectionData) {
        sectionData.style.display = vis.showProjectData ? 'block' : 'none';
        if (vis.showProjectData && detail.projectData) {
            renderProjectDataSection(detail.projectData);
        }
    }

    // 授权明细
    const sectionAuth = document.getElementById('sectionAuthDetails');
    if (sectionAuth) {
        sectionAuth.style.display = vis.showAuthDetails ? 'block' : 'none';
        if (vis.showAuthDetails && detail.authDetails) {
            renderAuthDetailsTable(detail.authDetails);
        }
    }

    // 项目审批管理（含我的审批 + 我的申请）
    const sectionAppr = document.getElementById('sectionApprovals');
    if (sectionAppr) {
        const showSection = vis.showApprovals || vis.showApplications;
        sectionAppr.style.display = showSection ? 'block' : 'none';
        if (showSection) {
            initApprovalTabs();
            renderApprovalManagement(detail);
        }
    }
}

/**
 * 渲染项目数据区域
 */
function renderProjectDataSection(data) {
    renderMetricCards(data);
    renderMonthlyChart(data.monthlyData);
    renderQuarterlyChart(data.quarterlyData);
}

/**
 * 渲染指标卡 - 上方主指标卡行 + 下方分品类小卡网格
 */
function renderMetricCards(data) {
    const container = document.getElementById('dataMetricCards');
    if (!container) return;

    const categoryLabels = {
        tv: '电视剧', anime: '动漫', movie: '电影', variety: '综艺',
        documentary: '纪录片', kids: '少儿', shortDrama: '横屏短剧'
    };

    let smallCards = '';
    Object.keys(categoryLabels).forEach(key => {
        const val = data.categories[key] || 0;
        smallCards += `
            <div class="metric-card-sm">
                <div class="metric-card-sm-label">${categoryLabels[key]}</div>
                <div class="metric-card-sm-value">${val}</div>
            </div>
        `;
    });

    const expiringCount = data.expiringWithin35Days || 0;
    const conflictCount = data.rightsConflictRisk || 0;

    container.innerHTML = `
        <div class="metric-main-row">
            <div class="metric-card-total">
                <div class="metric-total-label">日均授权作品总数</div>
                <div class="metric-total-value">${data.totalDaily}</div>
                <div class="metric-total-unit">部/日</div>
            </div>
            <div class="metric-card-highlight metric-card-warning">
                <div class="metric-highlight-label">授权小于35天作品数</div>
                <div class="metric-highlight-value">${expiringCount}</div>
                <div class="metric-highlight-unit">部</div>
            </div>
            <div class="metric-card-highlight metric-card-danger">
                <div class="metric-highlight-label">风险作品数</div>
                <div class="metric-highlight-value">${conflictCount}</div>
                <div class="metric-highlight-unit">部</div>
            </div>
        </div>
        <div class="metric-category-label">分品类授权数</div>
        <div class="metric-cards-grid">
            ${smallCards}
        </div>
    `;
}

/**
 * 格式化日期为 input[type=date] 的值
 */
function formatDateForInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * 计算剩余授权有效期天数
 * @param {string} endDateStr - 格式 "YYYY.MM.DD"
 * @returns {number|null} 剩余天数，null表示无数据
 */
function calcRemainDays(endDateStr) {
    if (!endDateStr) return null;
    const parts = endDateStr.split('.');
    if (parts.length !== 3) return null;
    const endDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    return Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
}

/**
 * 渲染分月日均柱形图
 */
function renderMonthlyChart(monthlyData) {
    const container = document.getElementById('chartMonthly');
    if (!container || !monthlyData || monthlyData.length === 0) return;

    const maxVal = Math.max(...monthlyData.map(d => d.daily));

    container.innerHTML = `
        <div class="bar-chart">
            ${monthlyData.map(d => {
                const height = Math.max((d.daily / maxVal) * 170, 4);
                const label = d.month.replace('20', '').replace('-', '/');
                return `
                    <div class="bar-group">
                        <span class="bar-value">${d.daily}</span>
                        <div class="bar default" style="height: ${height}px;"></div>
                        <span class="bar-label">${label}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * 渲染分季度日均柱形图
 */
function renderQuarterlyChart(quarterlyData) {
    const container = document.getElementById('chartQuarterly');
    const legendContainer = document.getElementById('chartQuarterlyLegend');
    if (!container || !quarterlyData || quarterlyData.length === 0) return;

    // 图例
    if (legendContainer) {
        legendContainer.innerHTML = `
            <div class="legend-item"><span class="legend-color actual"></span>实际</div>
            <div class="legend-item"><span class="legend-color estimated"></span>预计</div>
            <div class="legend-item"><span class="legend-color forecast"></span>预估</div>
        `;
    }

    const maxVal = Math.max(...quarterlyData.map(d => d.daily));

    container.innerHTML = `
        <div class="bar-chart">
            ${quarterlyData.map(d => {
                const height = Math.max((d.daily / maxVal) * 170, 4);
                return `
                    <div class="bar-group">
                        <span class="bar-value">${d.daily}</span>
                        <div class="bar ${d.type}" style="height: ${height}px;"></div>
                        <span class="bar-label">${d.quarter}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * 授权明细 - 当前筛选状态
 */
let authDetailFilterState = {
    status: '全部',
    category: '全部'
};

/**
 * 全量授权明细数据缓存（当前项目）
 */
let currentAuthDetails = [];

/**
 * 渲染授权明细表格（含筛选器初始化）
 */
// 分页与多选状态
let authDetailCurrentPage = 1;
const AUTH_DETAIL_PAGE_SIZE = 10;
let authDetailSelectedIds = new Set();

function renderAuthDetailsTable(details) {
    currentAuthDetails = details || [];
    authDetailFilterState = { status: '全部', category: '全部' };
    authDetailCurrentPage = 1;
    authDetailSelectedIds = new Set();

    initAuthDetailFilters();
    renderFilteredAuthTable();
}

/**
 * 初始化筛选器交互（下拉选框）
 */
function initAuthDetailFilters() {
    const statusSelect = document.getElementById('filterStatus');
    const categorySelect = document.getElementById('filterCategory');

    if (statusSelect) {
        statusSelect.value = authDetailFilterState.status;
        statusSelect.onchange = () => {
            authDetailFilterState.status = statusSelect.value;
            authDetailCurrentPage = 1;
            authDetailSelectedIds = new Set();
            renderFilteredAuthTable();
        };
    }

    if (categorySelect) {
        categorySelect.value = authDetailFilterState.category;
        categorySelect.onchange = () => {
            authDetailFilterState.category = categorySelect.value;
            authDetailCurrentPage = 1;
            authDetailSelectedIds = new Set();
            renderFilteredAuthTable();
        };
    }
}

/**
 * 根据筛选条件渲染表格（含分页与多选）
 */
function renderFilteredAuthTable() {
    const container = document.getElementById('authDetailTable');
    if (!container) return;

    const statusClassMap = {
        '授权中': 'authorizing',
        '已回收': 'revoked'
    };

    const statusLightMap = {
        '授权中': '●',
        '已回收': '●'
    };

    let filtered = currentAuthDetails;

    if (authDetailFilterState.status && authDetailFilterState.status !== '全部') {
        filtered = filtered.filter(d => d.status === authDetailFilterState.status);
    }
    if (authDetailFilterState.category && authDetailFilterState.category !== '全部') {
        filtered = filtered.filter(d => d.category === authDetailFilterState.category);
    }

    const countEl = document.getElementById('authDetailCount');
    if (countEl) {
        countEl.textContent = `共 ${filtered.length} 条`;
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="auth-detail-empty">
                <i data-lucide="inbox" class="empty-icon"></i>
                <p>暂无符合条件的授权作品</p>
            </div>
        `;
        updateBatchApprovalBar();
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    // 分页计算
    const totalPages = Math.ceil(filtered.length / AUTH_DETAIL_PAGE_SIZE);
    if (authDetailCurrentPage > totalPages) authDetailCurrentPage = totalPages;
    if (authDetailCurrentPage < 1) authDetailCurrentPage = 1;
    const startIdx = (authDetailCurrentPage - 1) * AUTH_DETAIL_PAGE_SIZE;
    const pageData = filtered.slice(startIdx, startIdx + AUTH_DETAIL_PAGE_SIZE);

    // 当前页是否全选
    const allPageSelected = pageData.length > 0 && pageData.every(d => authDetailSelectedIds.has(d.id));

    container.innerHTML = `
        <div class="auth-detail-table-scroll-wrap">
        <table class="detail-table auth-detail-table">
            <thead>
                <tr>
                    <th class="th-checkbox">
                        <label class="auth-checkbox-wrap">
                            <input type="checkbox" class="auth-checkbox-all" ${allPageSelected ? 'checked' : ''}>
                            <span class="auth-checkbox-custom"></span>
                        </label>
                    </th>
                    <th>作品名</th>
                    <th>品类</th>
                    <th>上映时间</th>
                    <th>BQID</th>
                    <th>主CID</th>
                    <th>权益ID</th>
                    <th>合同号</th>
                    <th>授权开始时间</th>
                    <th>授权结束时间</th>
                    <th>剩余有效期</th>
                    <th>授权状态</th>
                    <th>确权信息</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
                ${pageData.map(d => {
                    const cls = statusClassMap[d.status] || '';
                    const checked = authDetailSelectedIds.has(d.id) ? 'checked' : '';
                    const remainDays = calcRemainDays(d.authEndDate);
                    const remainText = d.status === '已回收' ? '-' : (remainDays !== null ? (remainDays <= 0 ? '已到期' : remainDays + '天') : '-');
                    const remainClass = d.status === '已回收' ? '' : (remainDays !== null && remainDays <= 7 ? 'remain-urgent' : (remainDays !== null && remainDays <= 15 ? 'remain-warning' : ''));
                    return `
                    <tr class="${checked ? 'row-selected' : ''}">
                        <td class="td-checkbox">
                            <label class="auth-checkbox-wrap">
                                <input type="checkbox" class="auth-checkbox-item" data-id="${d.id}" ${checked}>
                                <span class="auth-checkbox-custom"></span>
                            </label>
                        </td>
                        <td class="td-work-name">${d.workName}</td>
                        <td>${d.category}</td>
                        <td>${d.releaseDate || '-'}</td>
                        <td class="td-mono">${d.bqid || '-'}</td>
                        <td class="td-mono">${d.mainCid || '-'}</td>
                        <td class="td-mono">${d.rightsId || '-'}</td>
                        <td class="td-mono">${d.contractNo || '-'}</td>
                        <td>${d.authStartDate || '-'}</td>
                        <td>${d.authEndDate || '-'}</td>
                        <td><span class="remain-days ${remainClass}">${remainText}</span></td>
                        <td>
                            <span class="table-status-light ${cls}">
                                <span class="status-indicator"></span>
                                ${d.status}
                            </span>
                        </td>
                        <td>
                            <button class="btn-rr-info-link" data-action="view-rr-info" data-bqid="${d.bqid || ''}">
                                查看确权
                            </button>
                        </td>
                        <td>
                            ${d.pendingAction ? `
                            <button class="btn-view-application" data-action="view-application" data-id="${d.id}" data-work="${d.workName}" data-pending="${d.pendingAction}" data-time="${d.pendingTime || ''}" data-appid="${d.pendingAppId || ''}">
                                查看申请
                            </button>
                            ` : d.status === '已回收' ? `
                            <button class="btn-reauth" data-action="reauth" data-id="${d.id}" data-work="${d.workName}">
                                重新授权
                            </button>
                            ` : `
                            <button class="btn-terminate-auth" data-action="terminate-auth" data-id="${d.id}" data-work="${d.workName}">
                                终止授权
                            </button>
                            `}
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
        </div>
        ${totalPages > 1 ? renderAuthPagination(filtered.length, totalPages) : ''}
    `;

    // 绑定多选事件
    bindAuthCheckboxEvents(pageData);
    updateBatchApprovalBar();

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * 渲染分页控件
 */
function renderAuthPagination(total, totalPages) {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
        pages.push(`<button class="page-btn ${i === authDetailCurrentPage ? 'active' : ''}" data-page="${i}">${i}</button>`);
    }
    return `
        <div class="auth-pagination">
            <button class="page-btn page-prev" ${authDetailCurrentPage <= 1 ? 'disabled' : ''} data-page="${authDetailCurrentPage - 1}">
                <i data-lucide="chevron-left" style="width:14px;height:14px;"></i>
            </button>
            ${pages.join('')}
            <button class="page-btn page-next" ${authDetailCurrentPage >= totalPages ? 'disabled' : ''} data-page="${authDetailCurrentPage + 1}">
                <i data-lucide="chevron-right" style="width:14px;height:14px;"></i>
            </button>
            <span class="page-info">共 ${total} 条</span>
        </div>
    `;
}

/**
 * 绑定多选复选框事件
 */
function bindAuthCheckboxEvents(pageData) {
    const container = document.getElementById('authDetailTable');
    if (!container) return;

    // 全选/取消全选
    const checkAll = container.querySelector('.auth-checkbox-all');
    if (checkAll) {
        checkAll.addEventListener('change', function() {
            pageData.forEach(d => {
                if (this.checked) {
                    authDetailSelectedIds.add(d.id);
                } else {
                    authDetailSelectedIds.delete(d.id);
                }
            });
            renderFilteredAuthTable();
        });
    }

    // 单个复选框
    container.querySelectorAll('.auth-checkbox-item').forEach(cb => {
        cb.addEventListener('change', function() {
            const id = this.dataset.id;
            if (this.checked) {
                authDetailSelectedIds.add(id);
            } else {
                authDetailSelectedIds.delete(id);
            }
            renderFilteredAuthTable();
        });
    });

    // 分页按钮事件
    container.querySelectorAll('.page-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = parseInt(this.dataset.page);
            if (page >= 1 && !this.disabled) {
                authDetailCurrentPage = page;
                renderFilteredAuthTable();
            }
        });
    });
}

/**
 * 更新批量审批操作栏
 */
function updateBatchApprovalBar() {
    const bar = document.getElementById('batchApprovalBar');
    if (!bar) return;

    const count = authDetailSelectedIds.size;
    if (count > 0) {
        bar.style.display = 'flex';
        bar.querySelector('.batch-count').textContent = `已选中 ${count} 条`;
    } else {
        bar.style.display = 'none';
    }
}

/**
 * 打开批量审批弹窗
 */
function openBatchApprovalModal() {
    const modal = document.getElementById('batchApprovalModal');
    if (!modal) return;

    const count = authDetailSelectedIds.size;
    modal.querySelector('.batch-modal-desc').textContent = `已选中${count}条作品，请选择审批结论`;
    modal.style.display = 'flex';

    // 重置选项
    modal.querySelectorAll('.batch-option-radio').forEach(r => r.checked = false);
    modal.querySelector('.batch-modal-confirm').disabled = true;
}

/**
 * 关闭批量审批弹窗
 */
function closeBatchApprovalModal() {
    const modal = document.getElementById('batchApprovalModal');
    if (modal) modal.style.display = 'none';
}

/**
 * 确认批量审批
 */
function confirmBatchApproval() {
    const modal = document.getElementById('batchApprovalModal');
    if (!modal) return;

    const selected = modal.querySelector('.batch-option-radio:checked');
    if (!selected) return;

    const result = selected.value;
    const statusMap = { '可授权': '系统判定可授权', '不可授权': '待复核' };
    const newStatus = statusMap[result];

    // 更新所有选中作品的状态
    authDetailSelectedIds.forEach(id => {
        if (currentDetailProject && currentDetailProject.authDetails) {
            const work = currentDetailProject.authDetails.find(w => w.id === id);
            if (work) {
                work.status = newStatus;
            }
        }
    });

    // 清理选择并关闭弹窗
    authDetailSelectedIds = new Set();
    closeBatchApprovalModal();
    renderFilteredAuthTable();
}

/**
 * 渲染项目申请列表（我的申请Tab）
 */
function renderApplicationList(applications) {
    const container = document.getElementById('applicationList');
    if (!container) return;

    const statusMap = {
        '审批中': 'reviewing',
        '已通过': 'passed',
        '已驳回': 'rejected',
        '待提交': 'pending-submit',
        '已撤回': 'withdrawn'
    };

    if (!applications || applications.length === 0) {
        container.innerHTML = `
            <div class="approval-empty-state">
                <i data-lucide="inbox" style="width:32px;height:32px;color:var(--text-placeholder,#999);"></i>
                <p>暂无申请记录</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    container.innerHTML = applications.map(app => {
        const statusClass = statusMap[app.status] || '';
        const typeIcon = getApplicationTypeIcon(app.type || '');
        const progressHtml = renderApprovalProgressBar(app.approvalSteps || []);
        const isExpanded = app._expanded || false;
        const canOperate = app.status === '审批中';

        return `
            <div class="application-card ${isExpanded ? 'expanded' : ''}" data-app-id="${app.id}">
                <div class="application-card-header" data-action="toggle-application-detail" data-id="${app.id}">
                    <div class="application-card-left">
                        <span class="application-type-icon ${typeIcon.cls}">${typeIcon.text}</span>
                        <div class="application-card-info">
                            <span class="application-card-title">${app.title}</span>
                            <span class="application-card-id">${app.id}</span>
                        </div>
                    </div>
                    <div class="application-card-right">
                        <span class="list-card-status ${statusClass}">${app.status}</span>
                        <i data-lucide="chevron-down" class="application-expand-icon" style="width:16px;height:16px;"></i>
                    </div>
                </div>
                <div class="application-card-body" style="display:${isExpanded ? 'block' : 'none'};">
                    <div class="application-card-meta">
                        <div class="application-meta-item">
                            <i data-lucide="user" style="width:12px;height:12px;"></i>
                            <span>申请人：${app.applicant}</span>
                        </div>
                        <div class="application-meta-item">
                            <i data-lucide="clock" style="width:12px;height:12px;"></i>
                            <span>申请时间：${app.time}</span>
                        </div>
                        ${app.workName ? `
                        <div class="application-meta-item">
                            <i data-lucide="film" style="width:12px;height:12px;"></i>
                            <span>关联作品：${app.workName}</span>
                        </div>
                        ` : ''}
                    </div>
                    ${progressHtml ? `<div class="application-card-progress">${progressHtml}</div>` : ''}
                    <div class="application-action-bar">
                        <button class="btn-app-action btn-app-copy" data-action="copy-app-link" data-id="${app.id}">
                            <i data-lucide="link" style="width:13px;height:13px;"></i>
                            复制链接
                        </button>
                        ${canOperate ? `
                        <button class="btn-app-action btn-app-urge" data-action="urge-app" data-id="${app.id}">
                            <i data-lucide="bell-ring" style="width:13px;height:13px;"></i>
                            催办
                        </button>
                        <button class="btn-app-action btn-app-withdraw" data-action="withdraw-app" data-id="${app.id}">
                            <i data-lucide="undo-2" style="width:13px;height:13px;"></i>
                            撤回
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // 直接绑定申请卡片 header 的点击事件
    container.querySelectorAll('.application-card-header').forEach(header => {
        header.addEventListener('click', function(e) {
            // 如果点击的是操作按钮，不处理展开
            if (e.target.closest('.btn-app-action')) return;
            const id = this.dataset.id;
            if (id) toggleApplicationDetail(id);
        });
    });
}

/**
 * 渲染项目审批列表（我的审批Tab）
 */
function renderApprovalList(approvals) {
    const container = document.getElementById('approvalList');
    if (!container) return;

    const statusMap = {
        '待审批': 'pending-approval',
        '已通过': 'passed',
        '已驳回': 'rejected',
        '待提交': 'pending-submit',
        '已撤回': 'withdrawn'
    };

    if (!approvals || approvals.length === 0) {
        container.innerHTML = `
            <div class="approval-empty-state">
                <i data-lucide="inbox" style="width:32px;height:32px;color:var(--text-placeholder,#999);"></i>
                <p>暂无审批任务</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    container.innerHTML = approvals.map(apr => {
        const statusClass = statusMap[apr.status] || '';
        const typeIcon = getApplicationTypeIcon(apr.type || '');
        const canApprove = apr.status === '待审批';
        const isExpanded = apr._expanded || false;

        return `
            <div class="approval-card ${isExpanded ? 'expanded' : ''}" data-approval-id="${apr.id}">
                <div class="approval-card-header" data-action="toggle-approval-detail" data-id="${apr.id}">
                    <div class="approval-card-left">
                        <span class="application-type-icon ${typeIcon.cls}">${typeIcon.text}</span>
                        <div class="approval-card-info">
                            <span class="approval-card-title">${apr.title}</span>
                            <span class="approval-card-id">${apr.id}</span>
                        </div>
                    </div>
                    <div class="approval-card-right">
                        <span class="list-card-status ${statusClass}">${apr.status}</span>
                        <i data-lucide="chevron-down" class="approval-expand-icon" style="width:16px;height:16px;"></i>
                    </div>
                </div>
                <div class="approval-card-detail" style="display:${isExpanded ? 'block' : 'none'};">
                    <div class="approval-detail-section">
                        <div class="approval-detail-row">
                            <span class="approval-detail-label">申请人</span>
                            <span class="approval-detail-value">${apr.applicant}</span>
                        </div>
                        <div class="approval-detail-row">
                            <span class="approval-detail-label">申请时间</span>
                            <span class="approval-detail-value">${apr.time}</span>
                        </div>
                        <div class="approval-detail-row">
                            <span class="approval-detail-label">当前节点</span>
                            <span class="approval-detail-value">${apr.node || '-'}</span>
                        </div>
                        ${apr.workName ? `
                        <div class="approval-detail-row">
                            <span class="approval-detail-label">关联作品</span>
                            <span class="approval-detail-value">${apr.workName}</span>
                        </div>
                        ` : ''}
                        ${apr.type ? `
                        <div class="approval-detail-row">
                            <span class="approval-detail-label">申请类型</span>
                            <span class="approval-detail-value">${apr.type}</span>
                        </div>
                        ` : ''}
                    </div>
                    ${renderApprovalProgressBar(apr.approvalSteps || [])}
                    ${canApprove ? `
                    <div class="approval-action-bar">
                        <button class="btn-approve-reject" data-action="reject-approval" data-id="${apr.id}">
                            <i data-lucide="x-circle" style="width:14px;height:14px;"></i>
                            驳回
                        </button>
                        <button class="btn-approve-pass" data-action="pass-approval" data-id="${apr.id}">
                            <i data-lucide="check-circle" style="width:14px;height:14px;"></i>
                            通过
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // 直接绑定审批卡片 header 的点击事件
    container.querySelectorAll('.approval-card-header').forEach(header => {
        header.addEventListener('click', function(e) {
            // 如果点击的是操作按钮（通过/驳回），不处理展开
            if (e.target.closest('.btn-approve-pass, .btn-approve-reject')) return;
            const id = this.dataset.id;
            if (id) toggleApprovalDetail(id);
        });
    });
}

/**
 * 获取申请类型图标
 */
function getApplicationTypeIcon(type) {
    switch (type) {
        case '终止授权': return { text: '终', cls: 'type-terminate' };
        case '重新授权': return { text: '续', cls: 'type-reauth' };
        default: return { text: '申', cls: 'type-default' };
    }
}

/**
 * 渲染审批进度条
 */
function renderApprovalProgressBar(steps) {
    if (!steps || steps.length === 0) return '';

    const stepsHtml = steps.map((step, idx) => {
        const statusCls = step.status === 'completed' ? 'step-done' :
                          step.status === 'in_progress' ? 'step-active' : 'step-pending';
        const icon = step.status === 'completed' ? 'check-circle' :
                     step.status === 'in_progress' ? 'loader' : 'circle';
        return `
            <div class="progress-step ${statusCls}">
                <div class="progress-step-dot">
                    <i data-lucide="${icon}" style="width:14px;height:14px;"></i>
                </div>
                <div class="progress-step-info">
                    <span class="progress-step-name">${step.name}</span>
                    ${step.operator ? `<span class="progress-step-operator">${step.operator}</span>` : ''}
                    ${step.time ? `<span class="progress-step-time">${step.time}</span>` : ''}
                    ${step.result ? `<span class="progress-step-result">${step.result}</span>` : ''}
                </div>
                ${idx < steps.length - 1 ? '<div class="progress-step-line"></div>' : ''}
            </div>
        `;
    }).join('');

    return `<div class="approval-progress">${stepsHtml}</div>`;
}

// ==================== 审批管理Tab切换 ====================

/**
 * 初始化审批管理Tab切换
 */
function initApprovalTabs() {
    const tabsContainer = document.getElementById('approvalTabs');
    if (!tabsContainer) return;

    tabsContainer.querySelectorAll('.approval-tab').forEach(tab => {
        tab.onclick = function() {
            tabsContainer.querySelectorAll('.approval-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const tabKey = this.dataset.approvalTab;
            showApprovalTab(tabKey);
        };
    });
}

/**
 * 显示指定审批Tab
 */
function showApprovalTab(tabKey) {
    const tabApproval = document.getElementById('tabMyApproval');
    const tabApplication = document.getElementById('tabMyApplication');

    if (tabApproval) tabApproval.style.display = tabKey === 'myApproval' ? 'block' : 'none';
    if (tabApplication) tabApplication.style.display = tabKey === 'myApplication' ? 'block' : 'none';
}

/**
 * 渲染审批管理区域（含两个Tab内容）
 */
function renderApprovalManagement(detail) {
    const approvals = detail.approvals || [];
    const applications = detail.applications || [];

    // 更新Badge数量 - 仅审批有Badge（待审批数），申请不显示Badge
    const approvalBadge = document.getElementById('myApprovalBadge');
    const pendingCount = approvals.filter(a => a.status === '待审批').length;
    if (approvalBadge) {
        approvalBadge.textContent = pendingCount;
        approvalBadge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
    }

    renderApprovalList(approvals);
    renderApplicationList(applications);
}

/**
 * 切换审批详情展开/收起
 */
function toggleApprovalDetail(approvalId) {
    if (!currentDetailProject || !currentDetailProject.detail) return;
    const approvals = currentDetailProject.detail.approvals || [];
    const approval = approvals.find(a => a.id === approvalId);
    if (approval) {
        approval._expanded = !approval._expanded;
        renderApprovalList(approvals);
    }
}

/**
 * 切换申请详情展开/收起
 */
function toggleApplicationDetail(appId) {
    if (!currentDetailProject || !currentDetailProject.detail) return;
    const applications = currentDetailProject.detail.applications || [];
    const app = applications.find(a => a.id === appId);
    if (app) {
        app._expanded = !app._expanded;
        renderApplicationList(applications);
    }
}

/**
 * 复制申请链接
 */
function copyApplicationLink(appId) {
    const link = window.location.origin + window.location.pathname + '?app=' + appId;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(() => {
            showToast('链接已复制到剪贴板');
        }).catch(() => {
            showToast('复制失败，请手动复制');
        });
    } else {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = link;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('链接已复制到剪贴板');
        } catch (e) {
            showToast('复制失败，请手动复制');
        }
        document.body.removeChild(textarea);
    }
}

/**
 * 催办申请
 */
function urgeApplication(appId) {
    showToast('催办通知已发送');
}

/**
 * 撤回申请
 */
function withdrawApplication(appId) {
    if (!currentDetailProject || !currentDetailProject.detail) return;

    const detail = currentDetailProject.detail;
    const applications = detail.applications || [];
    const approvals = detail.approvals || [];

    const app = applications.find(a => a.id === appId);
    if (!app) return;

    // 更新申请状态
    app.status = '已撤回';

    // 同步撤回对应审批单
    const relatedApproval = approvals.find(a => a.relatedAppId === appId);
    if (relatedApproval) {
        relatedApproval.status = '已撤回';
        relatedApproval.node = '已撤回';
    }

    // 清除作品的pendingAction
    if (app.relatedAuthId && detail.authDetails) {
        const work = detail.authDetails.find(d => d.id === app.relatedAuthId);
        if (work) {
            delete work.pendingAction;
            delete work.pendingTime;
            delete work.pendingAppId;
            renderFilteredAuthTable();
        }
    }

    renderApprovalManagement(detail);
    showToast('申请已撤回');
}

/**
 * 显示轻提示
 */
function showToast(message, type) {
    // 移除已有的toast
    const existing = document.querySelector('.app-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'app-toast' + (type ? ' app-toast-' + type : '');
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

/**
 * 审批通过
 */
function passApproval(approvalId) {
    if (!currentDetailProject || !currentDetailProject.detail) return;
    const approvals = currentDetailProject.detail.approvals || [];
    const approval = approvals.find(a => a.id === approvalId);
    if (approval) {
        approval.status = '已通过';
        approval.node = '已完成';

        // 同步更新对应的申请单状态
        const applications = currentDetailProject.detail.applications || [];
        const app = applications.find(a => a.id === approval.relatedAppId || a.title === approval.title);
        if (app) {
            app.status = '已通过';
            // 如果是终止/重新授权申请，更新作品状态
            updateWorkStatusByApplication(app);
        }

        renderApprovalManagement(currentDetailProject.detail);
    }
}

/**
 * 审批驳回
 */
function rejectApproval(approvalId) {
    if (!currentDetailProject || !currentDetailProject.detail) return;
    const approvals = currentDetailProject.detail.approvals || [];
    const approval = approvals.find(a => a.id === approvalId);
    if (approval) {
        approval.status = '已驳回';
        approval.node = '已终止';

        // 同步更新对应的申请单状态并清除pendingAction
        const applications = currentDetailProject.detail.applications || [];
        const app = applications.find(a => a.id === approval.relatedAppId || a.title === approval.title);
        if (app) {
            app.status = '已驳回';
            // 驳回时清除作品的pendingAction
            clearWorkPendingAction(app);
        }

        renderApprovalManagement(currentDetailProject.detail);
    }
}

/**
 * 审批通过后更新作品状态
 */
function updateWorkStatusByApplication(app) {
    if (!currentDetailProject || !currentDetailProject.detail || !currentDetailProject.detail.authDetails) return;
    if (!app.relatedAuthId) return;

    const work = currentDetailProject.detail.authDetails.find(d => d.id === app.relatedAuthId);
    if (!work) return;

    if (app.type === '终止授权') {
        work.status = '已回收';
        delete work.pendingAction;
        delete work.pendingTime;
    } else if (app.type === '重新授权') {
        work.status = '授权中';
        delete work.pendingAction;
        delete work.pendingTime;
    }
    renderFilteredAuthTable();
}

/**
 * 审批驳回后清除作品pendingAction
 */
function clearWorkPendingAction(app) {
    if (!currentDetailProject || !currentDetailProject.detail || !currentDetailProject.detail.authDetails) return;
    if (!app.relatedAuthId) return;

    const work = currentDetailProject.detail.authDetails.find(d => d.id === app.relatedAuthId);
    if (work) {
        delete work.pendingAction;
        delete work.pendingTime;
        renderFilteredAuthTable();
    }
}

/**
 * 从授权操作创建申请单（终止授权/重新授权）
 */
function createApplicationFromAuth(authId, workName, actionType) {
    if (!currentDetailProject || !currentDetailProject.detail) return;

    const detail = currentDetailProject.detail;
    if (!detail.applications) detail.applications = [];
    if (!detail.approvals) detail.approvals = [];

    const typeLabel = actionType === 'terminate' ? '终止授权' : '重新授权';
    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN');
    const appId = 'APP-AUTO-' + Date.now();
    const aprId = 'APR-AUTO-' + Date.now();

    // 创建申请单
    const newApp = {
        id: appId,
        title: `${workName} - ${typeLabel}申请`,
        type: typeLabel,
        applicant: '当前用户',
        time: timeStr,
        status: '审批中',
        workName: workName,
        relatedAuthId: authId,
        approvalSteps: [
            { name: '提交申请', status: 'completed', operator: '当前用户', time: timeStr, result: '已提交' },
            { name: '运营审核', status: 'in_progress', operator: '', time: '', result: '' },
            { name: '负责人审批', status: 'pending', operator: '', time: '', result: '' }
        ]
    };
    detail.applications.push(newApp);

    // 创建审批单
    const newApr = {
        id: aprId,
        title: `${workName} - ${typeLabel}申请`,
        type: typeLabel,
        applicant: '当前用户',
        time: timeStr,
        status: '待审批',
        node: '运营审核',
        workName: workName,
        relatedAuthId: authId,
        relatedAppId: appId,
        approvalSteps: [
            { name: '提交申请', status: 'completed', operator: '当前用户', time: timeStr, result: '已提交' },
            { name: '运营审核', status: 'in_progress', operator: '', time: '', result: '' },
            { name: '负责人审批', status: 'pending', operator: '', time: '', result: '' }
        ]
    };
    detail.approvals.push(newApr);

    // 重新渲染审批管理区域
    renderApprovalManagement(detail);

    return appId;
}

/**
 * 跳转到审批管理模块的我的申请，并高亮对应申请
 */
function scrollToApplication(appId) {
    // 切换到我的申请Tab
    const tabsContainer = document.getElementById('approvalTabs');
    if (tabsContainer) {
        tabsContainer.querySelectorAll('.approval-tab').forEach(t => t.classList.remove('active'));
        const appTab = tabsContainer.querySelector('[data-approval-tab="myApplication"]');
        if (appTab) appTab.classList.add('active');
    }
    showApprovalTab('myApplication');

    // 滚动到审批管理区域
    const anchor = document.getElementById('anchorApprovals');
    if (anchor) {
        anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 高亮对应申请卡片
    setTimeout(() => {
        const cards = document.querySelectorAll('.application-card');
        cards.forEach(card => card.classList.remove('highlight'));
        if (appId) {
            const target = document.querySelector(`.application-card[data-app-id="${appId}"]`);
            if (target) {
                target.classList.add('highlight');
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => target.classList.remove('highlight'), 3000);
            }
        }
    }, 300);
}

// ==================== 终止授权弹窗 ====================

let terminateTargetId = null;
let terminateTargetWork = null;

/**
 * 打开终止授权确认弹窗
 */
function openTerminateAuthModal(authId, workName) {
    terminateTargetId = authId;
    terminateTargetWork = workName;

    const modal = document.getElementById('terminateAuthModal');
    const desc = document.getElementById('terminateModalDesc');

    if (desc) {
        desc.textContent = `确认申请终止「${workName}」的授权吗？`;
    }

    if (modal) {
        modal.style.display = 'flex';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

/**
 * 关闭终止授权确认弹窗
 */
function closeTerminateAuthModal() {
    const modal = document.getElementById('terminateAuthModal');
    if (modal) modal.style.display = 'none';
    terminateTargetId = null;
    terminateTargetWork = null;
}

/**
 * 确认终止授权
 */
function confirmTerminateAuth() {
    if (!terminateTargetId || !currentDetailProject) {
        closeTerminateAuthModal();
        return;
    }

    // 设置待处理申请标记，不直接更改状态
    const detail = currentDetailProject.detail;
    let workName = terminateTargetWork;
    if (detail && detail.authDetails) {
        const work = detail.authDetails.find(d => d.id === terminateTargetId);
        if (work) {
            work.pendingAction = 'terminate';
            work.pendingTime = new Date().toLocaleString('zh-CN');
            workName = work.workName;
        }
    }

    // 自动创建申请单到审批管理
    const appId = createApplicationFromAuth(terminateTargetId, workName, 'terminate');

    // 保存appId到作品上，方便查看申请时跳转
    if (detail && detail.authDetails) {
        const work = detail.authDetails.find(d => d.id === terminateTargetId);
        if (work) work.pendingAppId = appId;
    }

    closeTerminateAuthModal();
    renderFilteredAuthTable();
}

/**
 * 绑定终止授权弹窗事件
 */
function bindTerminateModalEvents() {
    const modal = document.getElementById('terminateAuthModal');
    const btnClose = document.getElementById('btnTerminateClose');
    const btnCancel = document.getElementById('btnTerminateCancel');
    const btnConfirm = document.getElementById('btnTerminateConfirm');

    if (btnClose) btnClose.addEventListener('click', closeTerminateAuthModal);
    if (btnCancel) btnCancel.addEventListener('click', closeTerminateAuthModal);
    if (btnConfirm) btnConfirm.addEventListener('click', confirmTerminateAuth);

    // 点击遮罩关闭
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeTerminateAuthModal();
        });
    }
}

// ==================== 重新授权弹窗 ====================

let reauthTargetId = null;
let reauthTargetWork = null;

/**
 * 打开重新授权确认弹窗
 */
function openReauthModal(authId, workName) {
    reauthTargetId = authId;
    reauthTargetWork = workName;

    const modal = document.getElementById('reauthModal');
    const desc = document.getElementById('reauthModalDesc');

    if (desc) {
        desc.textContent = `确认申请重新授权「${workName}」吗？`;
    }

    if (modal) {
        modal.style.display = 'flex';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

/**
 * 关闭重新授权确认弹窗
 */
function closeReauthModal() {
    const modal = document.getElementById('reauthModal');
    if (modal) modal.style.display = 'none';
    reauthTargetId = null;
    reauthTargetWork = null;
}

/**
 * 确认重新授权
 */
function confirmReauth() {
    if (!reauthTargetId || !currentDetailProject) {
        closeReauthModal();
        return;
    }

    // 设置待处理申请标记，不直接更改状态
    const detail = currentDetailProject.detail;
    let workName = reauthTargetWork;
    if (detail && detail.authDetails) {
        const work = detail.authDetails.find(d => d.id === reauthTargetId);
        if (work) {
            work.pendingAction = 'reauth';
            work.pendingTime = new Date().toLocaleString('zh-CN');
            workName = work.workName;
        }
    }

    // 自动创建申请单到审批管理
    const appId = createApplicationFromAuth(reauthTargetId, workName, 'reauth');

    // 保存appId到作品上，方便查看申请时跳转
    if (detail && detail.authDetails) {
        const work = detail.authDetails.find(d => d.id === reauthTargetId);
        if (work) work.pendingAppId = appId;
    }

    closeReauthModal();
    renderFilteredAuthTable();
}

/**
 * 绑定重新授权弹窗事件
 */
function bindReauthModalEvents() {
    const modal = document.getElementById('reauthModal');
    const btnClose = document.getElementById('btnReauthClose');
    const btnCancel = document.getElementById('btnReauthCancel');
    const btnConfirm = document.getElementById('btnReauthConfirm');

    if (btnClose) btnClose.addEventListener('click', closeReauthModal);
    if (btnCancel) btnCancel.addEventListener('click', closeReauthModal);
    if (btnConfirm) btnConfirm.addEventListener('click', confirmReauth);

    // 点击遮罩关闭
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeReauthModal();
        });
    }
}

// ==================== 查看申请弹窗 ====================

/**
 * 打开查看申请弹窗
 */
function openViewApplicationModal(authId, workName, pendingAction, pendingTime) {
    const modal = document.getElementById('viewApplicationModal');
    if (!modal) return;

    const typeLabel = pendingAction === 'terminate' ? '终止授权' : '重新授权';
    const statusLabel = pendingAction === 'terminate' ? '终止授权申请审批中' : '重新授权申请审批中';

    document.getElementById('viewAppWorkName').textContent = workName || '-';
    document.getElementById('viewAppType').textContent = typeLabel;
    document.getElementById('viewAppTime').textContent = pendingTime || '-';
    document.getElementById('viewAppStatus').textContent = statusLabel;

    // 设置状态样式
    const statusEl = document.getElementById('viewAppStatus');
    statusEl.className = 'view-app-status-tag ' + (pendingAction === 'terminate' ? 'terminate' : 'reauth');

    modal.style.display = 'flex';
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * 关闭查看申请弹窗
 */
function closeViewApplicationModal() {
    const modal = document.getElementById('viewApplicationModal');
    if (modal) modal.style.display = 'none';
}

/**
 * 绑定查看申请弹窗事件
 */
function bindViewApplicationModalEvents() {
    const modal = document.getElementById('viewApplicationModal');
    const btnClose = document.getElementById('btnViewAppClose');
    const btnOk = document.getElementById('btnViewAppOk');

    if (btnClose) btnClose.addEventListener('click', closeViewApplicationModal);
    if (btnOk) btnOk.addEventListener('click', closeViewApplicationModal);

    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeViewApplicationModal();
        });
    }
}

// ==================== 添加审查IP弹窗 ====================

/**
 * 模拟作品库数据（用于关联查询）
 */
const workLibrary = [
    { workName: '庆余年第三季', bqid: 'bq2078802', cid: 'mzc00200djsz2lc', category: '电视剧' },
    { workName: '斗罗大陆3', bqid: 'bq2078815', cid: 'mzc00200kfts7nb', category: '动漫' },
    { workName: '三体动画版', bqid: 'bq2078823', cid: 'mzc00200mptr9ex', category: '动漫' },
    { workName: '长相思第三季', bqid: 'bq2078831', cid: 'mzc00200qwvk5pa', category: '电视剧' },
    { workName: '创造营2026', bqid: 'bq2078846', cid: 'mzc00200rxnm3fc', category: '综艺' },
    { workName: '仙剑奇侠传四', bqid: 'bq2078859', cid: 'mzc00200txhp8jd', category: '电视剧' },
    { workName: '风起洛阳2', bqid: 'bq2078867', cid: 'mzc00200vnbq4hy', category: '电视剧' },
    { workName: '大唐来的苏无名', bqid: 'bq2078873', cid: 'mzc00200wkcr6gz', category: '横屏短剧' },
    { workName: '繁花', bqid: 'bq2078889', cid: 'mzc00200xjds5fv', category: '电视剧' },
    { workName: '完美世界', bqid: 'bq2078895', cid: 'mzc00200ynet7eu', category: '动漫' },
    { workName: '十日游戏', bqid: 'bq2078908', cid: 'mzc00200zpfu9dt', category: '电视剧' },
    { workName: '萌探2026', bqid: 'bq2078916', cid: 'mzc002001qgv0cs', category: '综艺' },
    { workName: '宝宝巴士', bqid: 'bq2078924', cid: 'mzc002002rhw3br', category: '少儿' },
    { workName: '去有风的地方', bqid: 'bq2078932', cid: 'mzc002003six2aq', category: '电视剧' },
    { workName: '超新星运动会2026', bqid: 'bq2078947', cid: 'mzc002004tjy8zp', category: '综艺' },
    { workName: '蓝色星球·中国篇', bqid: 'bq2078955', cid: 'mzc002005ukz7yo', category: '纪录片' },
    { workName: '鬼吹灯之昆仑神宫', bqid: 'bq2078963', cid: 'mzc002006vla6xn', category: '电视剧' },
    { workName: '斗破苍穹年番', bqid: 'bq2078971', cid: 'mzc002007wmb5wm', category: '动漫' },
    { workName: '人世间', bqid: 'bq2078986', cid: 'mzc002008xnc4vl', category: '电视剧' },
    { workName: '漫长的季节', bqid: 'bq2078994', cid: 'mzc002009yod3uk', category: '电视剧' },
    { workName: '与凤行', bqid: 'bq2079050', cid: 'mzc00200abcd01', category: '电视剧' },
    { workName: '莲花楼', bqid: 'bq2079055', cid: 'mzc00200abcd02', category: '电视剧' },
    { workName: '长月烬明', bqid: 'bq2079060', cid: 'mzc00200abcd03', category: '电视剧' },
    { workName: '偷偷藏不住', bqid: 'bq2079065', cid: 'mzc00200abcd04', category: '电视剧' },
];

// 选中的作品库记录
let addAuthIPSelectedWork = null;
let addAuthIPSuggestTimer = null;

/**
 * 打开添加审查IP弹窗
 */
function openAddAuthIPModal() {
    const modal = document.getElementById('addAuthIPModal');
    if (!modal) return;

    // 重置表单
    resetAddAuthIPForm();
    modal.style.display = 'flex';
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // 预填充初审瑕疵原因：从系统中已有的数据获取默认值
    prefillDefectReason();

    // 绑定事件
    bindAddAuthIPModalEvents();
}

/**
 * 预填充初审瑕疵原因（从系统数据中获取已有的瑕疵原因作为默认值）
 */
function prefillDefectReason() {
    const defectReasonInput = document.getElementById('addAuthDefectReason');
    const charCount = document.getElementById('addAuthCharCount');
    if (!defectReasonInput) return;

    // 从二创权益数据中找到有瑕疵原因的条目
    const categories = authData.rightsReviewData?.categories || [];
    const ugcCat = categories.find(c => c.type === 'ugc');
    if (ugcCat && ugcCat.items) {
        // 找到最近的一条有瑕疵原因的记录
        const itemWithReason = ugcCat.items.find(item =>
            item.systemDenyReason && item.systemDenyReason.trim() !== '' && item.externalAuthRights === '权利瑕疵'
        );
        if (itemWithReason && itemWithReason.systemDenyReason) {
            defectReasonInput.value = itemWithReason.systemDenyReason;
            if (charCount) charCount.textContent = itemWithReason.systemDenyReason.length;
        }
    }
}

/**
 * 关闭添加审查IP弹窗
 */
function closeAddAuthIPModal() {
    const modal = document.getElementById('addAuthIPModal');
    if (modal) modal.style.display = 'none';
    addAuthIPSelectedWork = null;
}

/**
 * 重置表单
 */
function resetAddAuthIPForm() {
    addAuthIPSelectedWork = null;
    const bqidInput = document.getElementById('addAuthBqid');
    const workNameField = document.getElementById('addAuthWorkNameField');
    const rightsIdInput = document.getElementById('addAuthRightsId');
    const defectReasonInput = document.getElementById('addAuthDefectReason');
    const charCount = document.getElementById('addAuthCharCount');

    if (bqidInput) { bqidInput.value = ''; bqidInput.classList.remove('input-error'); }
    if (workNameField) {
        workNameField.innerHTML = '<span class="add-auth-ip-autofill-placeholder">输入版权ID后自动填充</span>';
        workNameField.classList.remove('filled');
    }
    if (rightsIdInput) { rightsIdInput.value = ''; rightsIdInput.classList.remove('input-error'); }
    if (defectReasonInput) { defectReasonInput.value = ''; defectReasonInput.classList.remove('input-error'); }
    if (charCount) charCount.textContent = '0';

    // 清除所有错误提示
    ['addAuthWorkNameError', 'addAuthBqidError', 'addAuthRightsIdError', 'addAuthDefectReasonError'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = ''; el.style.display = 'none'; }
    });
}

/**
 * 绑定弹窗事件
 */
function bindAddAuthIPModalEvents() {
    const modal = document.getElementById('addAuthIPModal');
    const btnClose = document.getElementById('btnAddAuthIPClose');
    const btnCancel = document.getElementById('btnAddAuthIPCancel');
    const btnConfirm = document.getElementById('btnAddAuthIPConfirm');
    const defectReasonInput = document.getElementById('addAuthDefectReason');

    // 避免重复绑定
    if (modal._authIPBound) return;
    modal._authIPBound = true;

    // 关闭按钮
    if (btnClose) btnClose.addEventListener('click', closeAddAuthIPModal);
    if (btnCancel) btnCancel.addEventListener('click', closeAddAuthIPModal);

    // 点击遮罩关闭
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeAddAuthIPModal();
    });

    // 确认添加
    if (btnConfirm) btnConfirm.addEventListener('click', confirmAddAuthIP);

    // 版权ID输入 - 自动查找并填充作品名称
    const bqidInput = document.getElementById('addAuthBqid');
    if (bqidInput) {
        bqidInput.addEventListener('input', function() {
            clearFieldError('addAuthBqid');
            clearFieldError('addAuthWorkName');
            const val = this.value.trim();
            autoFillWorkNameByBqid(val);
        });

        // 失焦时也做一次查找
        bqidInput.addEventListener('blur', function() {
            const val = this.value.trim();
            if (val) autoFillWorkNameByBqid(val);
        });
    }

    // 字数统计
    if (defectReasonInput) {
        defectReasonInput.addEventListener('input', function() {
            const charCount = document.getElementById('addAuthCharCount');
            if (charCount) charCount.textContent = this.value.length;
            clearFieldError('addAuthDefectReason');
        });
    }

    // 合同号输入时清除错误
    const rightsIdInput = document.getElementById('addAuthRightsId');
    if (rightsIdInput) {
        rightsIdInput.addEventListener('input', function() {
            clearFieldError('addAuthRightsId');
        });
    }
}

/**
 * 根据版权ID自动填充作品名称
 */
function autoFillWorkNameByBqid(bqid) {
    const workNameField = document.getElementById('addAuthWorkNameField');
    if (!workNameField) return;

    if (!bqid) {
        workNameField.innerHTML = '<span class="add-auth-ip-autofill-placeholder">输入版权ID后自动填充</span>';
        workNameField.classList.remove('filled', 'not-found');
        addAuthIPSelectedWork = null;
        return;
    }

    const matched = workLibrary.find(w => w.bqid === bqid);
    if (matched) {
        workNameField.innerHTML = `
            <span class="add-auth-ip-autofill-name">${matched.workName}</span>
            <span class="add-auth-ip-autofill-cat">${matched.category}</span>
        `;
        workNameField.classList.add('filled');
        workNameField.classList.remove('not-found');
        addAuthIPSelectedWork = matched;
    } else {
        workNameField.innerHTML = '<span class="add-auth-ip-autofill-notfound">未找到匹配作品，请确认版权ID是否正确</span>';
        workNameField.classList.remove('filled');
        workNameField.classList.add('not-found');
        addAuthIPSelectedWork = null;
    }
}

/**
 * 清除字段错误状态
 */
function clearFieldError(fieldId) {
    const input = document.getElementById(fieldId);
    const errorEl = document.getElementById(fieldId + 'Error');
    if (input) input.classList.remove('input-error');
    if (errorEl) { errorEl.textContent = ''; errorEl.style.display = 'none'; }
}

/**
 * 设置字段错误状态
 */
function setFieldError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const errorEl = document.getElementById(fieldId + 'Error');
    if (input) input.classList.add('input-error');
    if (errorEl) { errorEl.textContent = message; errorEl.style.display = 'block'; }
}

/**
 * 校验版权ID、合同号映射关系
 */
function validateAddAuthIPForm() {
    let valid = true;
    const bqid = (document.getElementById('addAuthBqid')?.value || '').trim();
    const rightsIdStr = (document.getElementById('addAuthRightsId')?.value || '').trim();
    const defectReason = (document.getElementById('addAuthDefectReason')?.value || '').trim();

    // 清除所有错误
    ['addAuthWorkName', 'addAuthBqid', 'addAuthRightsId', 'addAuthDefectReason'].forEach(clearFieldError);

    // 必填校验：版权ID
    if (!bqid) {
        setFieldError('addAuthBqid', '请输入版权ID');
        valid = false;
    }

    // 必填校验：瑕疵原因
    if (!defectReason) {
        setFieldError('addAuthDefectReason', '请输入初审瑕疵原因');
        valid = false;
    }

    if (!valid) return false;

    // 关联性校验：版权ID是否在作品库中存在
    const matchedByBqid = workLibrary.find(w => w.bqid === bqid);

    if (!matchedByBqid) {
        setFieldError('addAuthBqid', `版权ID"${bqid}"在作品库中未找到，请确认是否正确`);
        setFieldError('addAuthWorkName', '');
        // 同时更新作品名称区域
        const workNameField = document.getElementById('addAuthWorkNameField');
        if (workNameField) {
            workNameField.innerHTML = '<span class="add-auth-ip-autofill-notfound">未找到匹配作品，请确认版权ID是否正确</span>';
            workNameField.classList.remove('filled');
            workNameField.classList.add('not-found');
        }
        valid = false;
    }

    // 合同号关联性校验（如果填了的话）
    if (rightsIdStr && matchedByBqid) {
        const rightsIds = rightsIdStr.split(/[；;]/).map(s => s.trim()).filter(Boolean);
        const invalidRights = rightsIds.filter(rid => !rid.startsWith(bqid));
        if (invalidRights.length > 0) {
            setFieldError('addAuthRightsId', `合同号 "${invalidRights.join('、')}" 的前缀与版权ID "${bqid}" 不匹配，请检查`);
            valid = false;
        }
    }

    return valid;
}

/**
 * 确认添加审查IP
 */
function confirmAddAuthIP() {
    if (!validateAddAuthIPForm()) return;

    const bqid = document.getElementById('addAuthBqid').value.trim();
    const rightsIdStr = document.getElementById('addAuthRightsId')?.value?.trim() || '';
    const defectReason = document.getElementById('addAuthDefectReason').value.trim();

    // 查找匹配的作品库记录
    const matchedWork = workLibrary.find(w => w.bqid === bqid) || {};
    const workName = matchedWork.workName || bqid;

    // 生成新条目
    const newId = 'RR-UGC-MANUAL-' + Date.now();
    const rightsId = rightsIdStr || (bqid + '-o' + Math.floor(Math.random() * 9000000 + 1000000));

    // 生成审核任务ID（格式：SQ + 6位数字 + 2位小写字母）
    const taskIdNum = String(Math.floor(Math.random() * 900000 + 100000));
    const taskIdSuffix = String.fromCharCode(97 + Math.floor(Math.random() * 26)) + String.fromCharCode(97 + Math.floor(Math.random() * 26));
    const generatedTaskId = 'SQ' + taskIdNum + taskIdSuffix;

    // 生成任务发起时间（当前时间，格式：YYYY-MM-DD HH:mm:ss）
    const now = new Date();
    const taskInitTime = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + ' ' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0');

    const newItem = {
        id: newId,
        taskId: generatedTaskId,
        taskInitTime: taskInitTime,
        bqid: bqid,
        cid: matchedWork.cid || '',
        rightsId: rightsId,
        contractNo: '',
        workName: workName,
        alias: '',
        category: matchedWork.category || '未知',
        director: '',
        starring: '',
        productionYear: '',
        productionRegion: '中国大陆',
        episodeCount: '',
        listType: '新热',
        isTalkShow: false,
        isGala: false,
        infoNetStatus: '生效中',
        externalAuthRights: '权利瑕疵',
        systemDenyReason: defectReason,
        rightsType: '二创权益',
        applicant: '当前用户（手动添加）',
        applyTime: new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '.'),
        platform: '',
        status: '待审核',
        priority: '高',
        rightsScope: '',
        authPeriod: '',
        aiRiskNote: '',
        reviewStatus: '权益初审待审',
        manualAdded: true
    };

    // 添加到二创权益数据中
    const categories = authData.rightsReviewData?.categories || [];
    const ugcCat = categories.find(c => c.type === 'ugc');
    if (ugcCat) {
        ugcCat.items.unshift(newItem);
        ugcCat.totalPending = (ugcCat.totalPending || 0) + 1;
    }

    // 关闭弹窗
    closeAddAuthIPModal();

    // 刷新授权审查列表
    refreshRRWithFilters();

    // 显示成功提示（简单的临时提示）
    showAddAuthIPSuccess(workName);
}

/**
 * 显示添加成功提示
 */
function showAddAuthIPSuccess(workName) {
    const toast = document.createElement('div');
    toast.className = 'add-auth-ip-toast';
    toast.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <span>「${workName}」已成功添加至授权审查队列</span>
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========== 创建项目 3 步弹窗（M1 规格 C2-C6）==========
let createProjectStep = 1;
let createProjectData = { rights_type: '', audit_mode: '' };

function openCreateProjectModal() {
  createProjectStep = 1;
  createProjectData = { rights_type: '', audit_mode: '' };
  renderCreateProjectModal();
}

function renderCreateProjectModal() {
  let existing = document.getElementById('createProjectModal');
  if (existing) existing.remove();

  const stepTitles = ['选择权利类型', '选择审核方式', '填写配置项'];
  let bodyHTML = '';

  if (createProjectStep === 1) {
    bodyHTML = Object.entries(RIGHTS_TYPE_MAP).map(([k,v]) =>
      `<label style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid ${createProjectData.rights_type===k?'#6c5ce7':'#e5e7eb'};border-radius:8px;cursor:pointer;background:${createProjectData.rights_type===k?'#f5f3ff':'#fff'}" onclick="createProjectData.rights_type='${k}';renderCreateProjectModal()">
        <input type="radio" name="cpRightsType" value="${k}" ${createProjectData.rights_type===k?'checked':''} style="accent-color:#6c5ce7">
        <span style="font-size:13px">${v}</span>
      </label>`
    ).join('');
  } else if (createProjectStep === 2) {
    const defaultMode = createProjectData.rights_type === 'secondary_creation' ? 'rolling' : 'one_time';
    if (!createProjectData.audit_mode) createProjectData.audit_mode = defaultMode;
    bodyHTML = Object.entries(AUDIT_MODE_MAP).map(([k,v]) =>
      `<label style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid ${createProjectData.audit_mode===k?'#6c5ce7':'#e5e7eb'};border-radius:8px;cursor:pointer;background:${createProjectData.audit_mode===k?'#f5f3ff':'#fff'}" onclick="createProjectData.audit_mode='${k}';renderCreateProjectModal()">
        <input type="radio" name="cpAuditMode" value="${k}" ${createProjectData.audit_mode===k?'checked':''} style="accent-color:#6c5ce7">
        <span style="font-size:13px">${v}</span>
        ${k===defaultMode?'<span style="background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:4px;font-size:10px;margin-left:auto">推荐</span>':''}
      </label>`
    ).join('');
  } else {
    const isRolling = createProjectData.audit_mode === 'rolling';
    bodyHTML = `
      <div style="display:grid;gap:12px">
        <div><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">合作方名称</label><input type="text" placeholder="请输入" style="width:100%;padding:8px;border:1px solid #d0d5dd;border-radius:6px;font-size:12px"></div>
        <div><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">合同编号</label><input type="text" placeholder="请输入" style="width:100%;padding:8px;border:1px solid #d0d5dd;border-radius:6px;font-size:12px"></div>
        <div><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">联系人</label><input type="text" placeholder="请输入" style="width:100%;padding:8px;border:1px solid #d0d5dd;border-radius:6px;font-size:12px"></div>
        <div><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">品类范围</label><div style="display:flex;gap:6px;flex-wrap:wrap">${['电视剧','电影','综艺','动漫','纪录片','少儿','微短剧'].map(c=>'<label style="display:flex;align-items:center;gap:4px;font-size:12px"><input type="checkbox" checked>'+c+'</label>').join('')}</div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">授权开始</label><input type="date" style="width:100%;padding:8px;border:1px solid #d0d5dd;border-radius:6px;font-size:12px"></div><div><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">授权结束</label><input type="date" style="width:100%;padding:8px;border:1px solid #d0d5dd;border-radius:6px;font-size:12px"></div></div>
        ${isRolling?'<div><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">合同安全线（日均）</label><input type="number" placeholder="如 3500" style="width:100%;padding:8px;border:1px solid #d0d5dd;border-radius:6px;font-size:12px"></div>':''}
      </div>`;
  }

  const html = `
    <div id="createProjectModal" style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)this.remove()">
      <div style="background:#fff;border-radius:12px;width:480px;max-height:80vh;overflow-y:auto" onclick="event.stopPropagation()">
        <div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center">
          <h3 style="margin:0;font-size:16px">创建项目 — Step ${createProjectStep}/3 ${stepTitles[createProjectStep-1]}</h3>
          <button style="background:none;border:none;cursor:pointer" onclick="document.getElementById('createProjectModal').remove()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style="padding:20px;display:grid;gap:8px">${bodyHTML}</div>
        <div style="padding:12px 20px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:8px">
          ${createProjectStep > 1 ? '<button class="rr-btn-view" onclick="createProjectStep--;renderCreateProjectModal()">上一步</button>' : ''}
          <button class="rr-btn-view" onclick="document.getElementById(\'createProjectModal\').remove()">取消</button>
          ${createProjectStep < 3
            ? `<button class="rr-btn-submit" onclick="if(createProjectStep===1&&!createProjectData.rights_type){alert('请选择权利类型');return;}createProjectStep++;renderCreateProjectModal()">下一步</button>`
            : `<button class="rr-btn-submit" onclick="document.getElementById('createProjectModal').remove();showToast('项目已创建（configuring状态）','success');renderProjectList()">确认创建</button>`
          }
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * 显示空白占位页
 */
function showBlankPage(title, desc) {
    const overlay = document.getElementById('blankPageOverlay');
    const titleEl = document.getElementById('blankPageTitle');
    const descEl = document.getElementById('blankPageDesc');

    if (titleEl) titleEl.textContent = title || '页面开发中';
    if (descEl) descEl.textContent = desc || '该功能页面正在开发中，敬请期待';
    if (overlay) {
        overlay.style.display = 'flex';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

/**
 * 隐藏空白占位页
 */
function hideBlankPage() {
    const overlay = document.getElementById('blankPageOverlay');
    if (overlay) overlay.style.display = 'none';
}



// 模块加载入口
console.log('[授权管理] 模块加载，开始初始化');
if (typeof initAuthManagementModule === 'function') {
    initAuthManagementModule();
}

// 监听模块重新加载事件（从缓存渲染时也会触发）
document.addEventListener('moduleLoaded', function(e) {
    if (e.detail && e.detail.moduleId === 'module-auth-management') {
        console.log('[授权管理] 模块重新加载，重新初始化');
        // 重置页面状态
        currentDetailProject = null;
        initAuthManagementModule();
    }
});


// ================================================================
// 授权审查 V2 模块（从 rights-review.js 合并，解决 module-loader 时序问题）
// ================================================================
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
  'authorization_review': '授权审查',
  'risk_review_distribution': '风险审查-分销冲突',
  'risk_review_defect': '风险审查-新增瑕疵',
  'defect_reaudit': '权益瑕疵重审'
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
  { key: 'rights_third_review', label: '运营授权评估', reviewByField: 'rights_third_review_by', reviewAtField: 'rights_third_review_at' }
];

// M3: 根据 task_type 动态获取审核链路步骤
function getFlowStepsByTaskType(taskType) {
  switch (taskType) {
    case 'authorization_review':
    case 'defect_reaudit':
      return FLOW_STEPS; // 初审→复审→终审（3步）
    case 'risk_review_distribution':
    case 'risk_review_defect':
      return [
        { key: 'rights_first_review', label: '初审', reviewByField: 'rights_first_review_by', reviewAtField: 'rights_first_review_at' },
        { key: 'rights_second_review', label: '法务判定', reviewByField: 'rights_second_review_by', reviewAtField: 'rights_second_review_at' }
      ]; // 2步
    default:
      return FLOW_STEPS;
  }
}

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
    case 'authorization_review': return 'rr-badge-auth';
    case 'risk_review_distribution': return 'rr-badge-risk';
    case 'risk_review_defect': return 'rr-badge-risk';
    case 'defect_reaudit': return 'rr-badge-change';
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
  keyword: '',
  // v1.2 新增 5 个筛选
  project: '',
  hot_level: '',
  rights_contract_no: '',
  xwq_status: '',
  online_status: ''
};

// ============================================================
// 列表页：筛选
// ============================================================

function filterRRItems() {
  return rrItems.filter(item => {
    // obsoleted 数据始终不显示（系统内部状态不进入界面）
    if (item.audit_progress === 'obsoleted') return false;

    if (rrFilters.audit_progress && item.audit_progress !== rrFilters.audit_progress) return false;
    if (rrFilters.task_type && item.task_type !== rrFilters.task_type) return false;
    if (rrFilters.play_category) {
      const label = getPlayCategoryLabel(item.play_category);
      if (label !== rrFilters.play_category) return false;
    }
    if (rrFilters.rights_second_review_result && item.rights_second_review_result !== rrFilters.rights_second_review_result) return false;
    if (rrFilters.project && (item.project_id || '') !== rrFilters.project) return false;
    // v1.2 新增筛选
    if (rrFilters.xwq_status && (item.xwq_status || '') !== rrFilters.xwq_status) return false;
    if (rrFilters.online_status && (item.online_status || '') !== rrFilters.online_status) return false;
    if (rrFilters.hot_level && (item.cid_info?.hot_level || '') !== rrFilters.hot_level) return false;
    if (rrFilters.rights_contract_no) {
      const ids = (item.import_copr_rights_ids || []).join(' ') + ' ' + (item.import_copr_rights_id || '');
      if (!ids.toLowerCase().includes(rrFilters.rights_contract_no.toLowerCase())) return false;
    }
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
            ${Object.entries(AUDIT_PROGRESS_MAP).filter(([k]) => k !== 'obsoleted').map(([k,v]) => `<option value="${k}" ${rrFilters.audit_progress === k ? 'selected' : ''}>${v}</option>`).join('')}
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
        <!-- v1.2 新增筛选 -->
        <div class="rr-filter-group-v2">
          <label>热度口径</label>
          <select class="rr-filter-sel" id="rrFilterHotLevel">
            <option value="">全部</option>
            <option value="S" ${rrFilters.hot_level==='S'?'selected':''}>S</option>
            <option value="A" ${rrFilters.hot_level==='A'?'selected':''}>A</option>
            <option value="B" ${rrFilters.hot_level==='B'?'selected':''}>B</option>
            <option value="C" ${rrFilters.hot_level==='C'?'selected':''}>C</option>
          </select>
        </div>
        <div class="rr-filter-group-v2">
          <label>所属项目</label>
          <select class="rr-filter-sel" id="rrFilterProject">
            <option value="">全部</option>
            ${(authData?.projects||[]).filter(p=>p.status!=='deleted').map(p=>`<option value="${p.id}" ${rrFilters.project===p.id?'selected':''}>${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="rr-filter-group-v2">
          <label>权益合同号</label>
          <input type="text" class="rr-filter-sel" id="rrFilterContractNo" placeholder="输入合同号" value="${rrFilters.rights_contract_no || ''}" style="width:140px">
        </div>
        <div class="rr-filter-group-v2">
          <label>信网权状态</label>
          <select class="rr-filter-sel" id="rrFilterXwqStatus">
            <option value="">全部</option>
            <option value="生效中" ${rrFilters.xwq_status==='生效中'?'selected':''}>生效中</option>
            <option value="已失效" ${rrFilters.xwq_status==='已失效'?'selected':''}>已失效</option>
            <option value="未知" ${rrFilters.xwq_status==='未知'?'selected':''}>未知</option>
          </select>
        </div>
        <div class="rr-filter-group-v2">
          <label>正片在线</label>
          <select class="rr-filter-sel" id="rrFilterOnlineStatus">
            <option value="">全部</option>
            <option value="在线" ${rrFilters.online_status==='在线'?'selected':''}>在线</option>
            <option value="下架" ${rrFilters.online_status==='下架'?'selected':''}>下架</option>
          </select>
        </div>
      </div>
    </div>
    <!-- 批量操作栏（常显） -->
    <div id="rrBatchBar" style="background:#f0f5ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px">
      <span style="font-size:13px;color:#1e40af" id="rrBatchCount">已选 0 条</span>
      <button class="rr-btn-view rr-batch-btn" id="rrBtnBatchFirst" onclick="openRRBatchModal('初审')" style="color:#1e40af;border-color:#bfdbfe" disabled>批量初审</button>
      <button class="rr-btn-view rr-batch-btn" id="rrBtnBatchSecond" onclick="openRRBatchModal('复审')" style="color:#1e40af;border-color:#bfdbfe" disabled>批量复审</button>
      <button class="rr-btn-view rr-batch-btn" id="rrBtnBatchThird" onclick="openRRBatchModal('终审')" style="color:#1e40af;border-color:#bfdbfe" disabled>批量终审</button>
    </div>
    <div class="rr-table-wrap">
      <table class="rr-table">
        <thead>
          <tr>
            <th style="width:32px"><input type="checkbox" id="rrSelectAll" onchange="toggleRRSelectAll(this.checked)"></th>
            <th>审核ID</th>
            <th>作品名</th>
            <th>别名</th>
            <th>品类</th>
            <th>版权ID</th>
            <th>权益合同号</th>
            <th>热度</th>
            <th>任务时间</th>
            <th>任务类型</th>
            <th>初审结论</th>
            <th>审核进度</th>
            <th>授权判定</th>
            <th>信网权状态</th>
            <th>正片在线</th>
            <th>瑕疵类型</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${pageData.length === 0 ? `<tr><td colspan="17" class="rr-table-empty">暂无匹配数据</td></tr>` :
            pageData.map(item => `
              <tr class="rr-table-row" data-audit-id="${item.audit_id}">
                <td><input type="checkbox" class="rr-row-check" value="${item.audit_id}" onchange="updateRRBatchBar()"></td>
                <td class="rr-td-mono">${item.audit_id}</td>
                <td><div class="rr-td-name">${item.play_name}</div></td>
                <td style="font-size:11px;color:#666">${item.play_name_alias || '-'}</td>
                <td>${getPlayCategoryLabel(item.play_category)}</td>
                <td class="rr-td-mono">${item.copyright_id}</td>
                <td style="font-size:11px">${(item.import_copr_rights_ids && item.import_copr_rights_ids.length > 0) ? item.import_copr_rights_ids.map(id => `<div>${id}</div>`).join('') : (item.import_copr_rights_id || '-')}</td>
                <td style="font-size:11px"><span style="background:${{'S':'#fef2f2','A':'#fff7ed','B':'#f0fdf4','C':'#f5f3ff'}[item.cid_info?.hot_level]||'#f9fafb'};color:${{'S':'#991b1b','A':'#9a3412','B':'#166534','C':'#5b21b6'}[item.cid_info?.hot_level]||'#666'};padding:1px 6px;border-radius:4px;font-weight:500">${item.cid_info?.hot_level || '-'}</span></td>
                <td>${formatDate(item.task_time)}</td>
                <td><span class="rr-badge ${getTaskTypeBadgeClass(item.task_type)}">${getTaskTypeLabel(item.task_type)}</span></td>
                <td>${getReviewResultLabel(item.rights_first_review_result) || '-'}</td>
                <td><span class="rr-badge ${getProgressBadgeClass(item.audit_progress)}">${getAuditProgressLabel(item.audit_progress)}</span></td>
                <td>${getAuthJudgment(item)}</td>
                <td style="font-size:11px">${item.xwq_status || '-'}</td>
                <td style="font-size:11px">${item.online_status || '-'}</td>
                <td style="font-size:11px">${item.defect_type || '-'}</td>
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

  // v1.2 新增筛选器绑定
  const selProject = document.getElementById('rrFilterProject');
  const selHot = document.getElementById('rrFilterHotLevel');
  const inputContract = document.getElementById('rrFilterContractNo');
  const selXwq = document.getElementById('rrFilterXwqStatus');
  const selOnline = document.getElementById('rrFilterOnlineStatus');
  if (selProject) selProject.onchange = function() { rrFilters.project = this.value; rrCurrentPage = 1; renderRightsReviewV2(); };
  if (selHot) selHot.onchange = function() { rrFilters.hot_level = this.value; rrCurrentPage = 1; renderRightsReviewV2(); };
  if (inputContract) { let d2; inputContract.oninput = function() { clearTimeout(d2); d2 = setTimeout(() => { rrFilters.rights_contract_no = this.value; rrCurrentPage = 1; renderRightsReviewV2(); }, 300); }; }
  if (selXwq) selXwq.onchange = function() { rrFilters.xwq_status = this.value; rrCurrentPage = 1; renderRightsReviewV2(); };
  if (selOnline) selOnline.onchange = function() { rrFilters.online_status = this.value; rrCurrentPage = 1; renderRightsReviewV2(); };

  // 分页按钮
  document.querySelectorAll('.rr-page-btn[data-rrpage]').forEach(btn => {
    btn.onclick = function() {
      const p = parseInt(this.dataset.rrpage);
      if (p >= 1) { rrCurrentPage = p; renderRightsReviewV2(); }
    };
  });
}

// ========== 批量操作（M2 规格 B6/C3-C6）==========
let rrSelectedIds = new Set();

function toggleRRSelectAll(checked) {
  document.querySelectorAll('.rr-row-check').forEach(cb => { cb.checked = checked; });
  updateRRBatchBar();
}

function updateRRBatchBar() {
  const checks = document.querySelectorAll('.rr-row-check:checked');
  rrSelectedIds = new Set([...checks].map(c => c.value));
  const count = document.getElementById('rrBatchCount');
  if (count) count.textContent = '已选 ' + rrSelectedIds.size + ' 条';
  // 启用/禁用批量按钮
  const btns = document.querySelectorAll('.rr-batch-btn');
  btns.forEach(btn => {
    btn.disabled = rrSelectedIds.size === 0;
    btn.style.opacity = rrSelectedIds.size === 0 ? '0.4' : '1';
    btn.style.cursor = rrSelectedIds.size === 0 ? 'not-allowed' : 'pointer';
  });
}

function openRRBatchModal(action) {
  if (rrSelectedIds.size === 0) { alert('请先勾选审查单'); return; }
  const selectedItems = rrItems.filter(i => rrSelectedIds.has(i.audit_id));
  const categories = new Set(selectedItems.map(i => i.play_category));
  const progresses = new Set(selectedItems.map(i => i.audit_progress));
  if (categories.size > 1 || progresses.size > 1) {
    alert('批量操作仅支持同品类同进度的审查单');
    return;
  }

  // 复审校验：含多待审权益的作品不支持批量复审
  if (action === '复审') {
    const multiRightsItems = selectedItems.filter(i => (i.import_copr_rights_ids || []).length > 1);
    if (multiRightsItems.length > 0) {
      const names = multiRightsItems.map(i => i.play_name).join('、');
      alert('以下作品含多条待审权益，授权依据无法默认勾选，不支持批量复审，请逐条审核：\n\n' + names);
      return;
    }
  }

  const platforms = Object.entries(AUTHORIZED_PLATFORM_MAP).map(([k,v]) => `<label style="display:flex;align-items:center;gap:4px;font-size:12px"><input type="checkbox" value="${k}">${v}</label>`).join('');
  const excludePlatforms = Object.entries(EXCLUDED_PLATFORM_MAP).map(([k,v]) => `<label style="display:flex;align-items:center;gap:4px;font-size:12px"><input type="checkbox" value="${k}">${v}</label>`).join('');
  const defectTypes = Object.entries(DEFECT_TYPE_MAP).map(([k,v]) => `<label style="display:flex;align-items:center;gap:4px;font-size:12px"><input type="checkbox" value="${k}">${v}</label>`).join('');
  let formHTML = '';

  if (action === '初审') {
    formHTML = `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:#991b1b;line-height:1.6">
        <div style="font-weight:600;margin-bottom:4px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#991b1b" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          批量初审注意事项
        </div>
        批量审查将对所选作品的权益统一给出相同判断，包括人审结论、瑕疵类型、可授权平台、排除平台及初审备注。<strong>审核人需为审核结论承担责任</strong>，请确认所选作品确实适用相同审查结论后再提交。
      </div>
      <div style="margin-bottom:12px"><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">初审结论 <span style="color:#ef4444">*</span></label>
        <select id="batchReviewResult" style="width:100%;padding:8px;border:1px solid #d0d5dd;border-radius:6px;font-size:12px" onchange="document.getElementById('batchDefectArea').style.display=this.value==='rights_defect'?'':'none'">
          <option value="">请选择</option><option value="rights_available">权利可用</option><option value="rights_defect">权利瑕疵</option>
        </select></div>
      <div id="batchDefectArea" style="display:none;margin-bottom:12px"><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">瑕疵类型 <span style="color:#ef4444">*</span></label>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${defectTypes}</div></div>
      <div style="margin-bottom:12px"><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">可授权平台</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${platforms}</div></div>
      <div style="margin-bottom:12px"><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">排除平台</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${excludePlatforms}</div></div>
      <div><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">备注</label>
        <textarea style="width:100%;padding:8px;border:1px solid #d0d5dd;border-radius:6px;font-size:12px;resize:vertical" rows="2" placeholder="可选"></textarea></div>`;
  } else if (action === '复审') {
    formHTML = `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:#991b1b;line-height:1.6">
        <div style="font-weight:600;margin-bottom:4px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#991b1b" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          批量复审注意事项
        </div>
        批量审查将对所选作品的权益统一给出相同判断，包括人审结论、瑕疵类型、瑕疵处置方式、可授权平台、排除平台及复审备注。<strong>审核人需为审核结论承担责任</strong>。<br>含多条待审权益的作品不支持批量复审（授权依据无法默认勾选），仅限单待审权益的作品。
      </div>
      <div style="margin-bottom:12px"><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">复审结论 <span style="color:#ef4444">*</span></label>
        <select id="batchReviewResult" style="width:100%;padding:8px;border:1px solid #d0d5dd;border-radius:6px;font-size:12px" onchange="document.getElementById('batchSecondDefectArea').style.display=this.value==='rights_defect'?'':'none'">
          <option value="">请选择</option><option value="rights_available">权利可用</option><option value="rights_defect">权利瑕疵</option>
        </select></div>
      <div style="margin-bottom:12px"><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">可授权平台 <span style="color:#ef4444">*</span></label>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${platforms}</div></div>
      <div style="margin-bottom:12px"><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">排除平台 <span style="color:#ef4444">*</span></label>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${excludePlatforms}</div></div>
      <div id="batchSecondDefectArea" style="display:none">
        <div style="margin-bottom:12px"><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">瑕疵类型 <span style="color:#ef4444">*</span></label>
          <div style="display:flex;gap:6px;flex-wrap:wrap">${defectTypes}</div></div>
        <div style="margin-bottom:12px"><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">瑕疵处置方式 <span style="color:#ef4444">*</span></label>
          <select style="width:100%;padding:8px;border:1px solid #d0d5dd;border-radius:6px;font-size:12px">
            <option value="">请选择</option>
            ${Object.entries(DEFECT_DISPOSAL_METHOD_MAP).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
          </select></div>
        <div style="margin-bottom:12px"><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">授权依据（权益ID） <span style="color:#ef4444">*</span></label>
          <input type="text" style="width:100%;padding:8px;border:1px solid #d0d5dd;border-radius:6px;font-size:12px" placeholder="如 bq2078802-o1160834"></div>
      </div>
      <div><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">备注</label>
        <textarea style="width:100%;padding:8px;border:1px solid #d0d5dd;border-radius:6px;font-size:12px;resize:vertical" rows="2" placeholder="可选"></textarea></div>`;
  } else {
    const runningProjects = (authData?.projects || []).filter(p => p.status === 'running');
    formHTML = `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:#991b1b;line-height:1.6">
        <div style="font-weight:600;margin-bottom:4px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#991b1b" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          批量终审注意事项
        </div>
        批量审查将对所选作品统一给出相同授权结论，包括是否授权、授权平台及瑕疵处置结论。<strong>授权起止时间将默认采用系统填充时间，不支持单独修改。</strong>若实际授权信息存在差异，请勿使用批量功能，对特殊项目单独确认。
      </div>
      <div style="margin-bottom:12px"><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">终审结论 <span style="color:#ef4444">*</span></label>
        <select id="batchReviewResult" style="width:100%;padding:8px;border:1px solid #d0d5dd;border-radius:6px;font-size:12px">
          <option value="">请选择</option><option value="can_authorized">可授权</option><option value="not_authorized">不授权</option>
        </select></div>
      <div style="margin-bottom:12px"><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">选择授权项目</label>
        <div style="display:grid;gap:6px">${runningProjects.map(p => `<label style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;cursor:pointer"><input type="checkbox" value="${p.id}" checked><span>${p.name}</span><span style="color:#999;font-size:11px">${p.partner_name}</span></label>`).join('')}</div></div>
      <div><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">备注</label>
        <textarea style="width:100%;padding:8px;border:1px solid #d0d5dd;border-radius:6px;font-size:12px;resize:vertical" rows="2" placeholder="可选"></textarea></div>`;
  }

  const html = `
    <div id="rrBatchModal" style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)this.remove()">
      <div style="background:#fff;border-radius:12px;width:480px;max-height:80vh;overflow-y:auto" onclick="event.stopPropagation()">
        <div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center">
          <h3 style="margin:0;font-size:16px">批量${action}（${rrSelectedIds.size} 条）</h3>
          <button style="background:none;border:none;cursor:pointer" onclick="document.getElementById('rrBatchModal').remove()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style="padding:20px">${formHTML}</div>
        <div style="padding:12px 20px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:8px">
          <button class="rr-btn-view" onclick="document.getElementById('rrBatchModal').remove()">取消</button>
          <button class="rr-btn-submit" onclick="confirmRRBatch('${action}')">确认提交</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function confirmRRBatch(action) {
  const result = document.getElementById('batchReviewResult')?.value;
  if (!result) { alert('请选择' + action + '结论'); return; }
  document.getElementById('rrBatchModal')?.remove();
  showToast('批量' + action + '提交成功（' + rrSelectedIds.size + ' 条）', 'success');
  rrSelectedIds.clear();
  renderRightsReviewV2();
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
  const pageBreadcrumb = document.querySelector('.page-breadcrumb');
  if (listTab) listTab.style.display = 'none';
  if (detailPage) detailPage.style.display = 'block';
  if (catTabs) catTabs.style.display = 'none';
  if (pageBreadcrumb) pageBreadcrumb.style.display = 'none';

  renderRRDetailV2(item);
}

function closeRRDetailV2() {
  rrCurrentDetailItem = null;
  const listTab = document.getElementById('tabRightsReview');
  const detailPage = document.getElementById('rightsReviewDetailPage');
  const catTabs = document.getElementById('authCategoryTabs');
  const pageBreadcrumb = document.querySelector('.page-breadcrumb');
  if (listTab) listTab.style.display = 'block';
  if (detailPage) detailPage.style.display = 'none';
  if (catTabs) catTabs.style.display = 'flex';
  if (pageBreadcrumb) pageBreadcrumb.style.display = '';
  const historyBtn = document.getElementById('btnAuthHistory');
  if (historyBtn) historyBtn.style.display = 'none';
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

  // 审核历史按钮（面包屑右侧）
  const historyBtn = document.getElementById('btnAuthHistory');
  if (historyBtn) {
    historyBtn.style.display = '';
    historyBtn.onclick = function() { openAuthHistoryV2(item.copyright_id); };
  }

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
        </div>
      </div>
    </div>
  `;
}

function renderFlowSteps(item) {
  const container = document.getElementById('rrdReviewNodes');
  if (!container) return;

  const steps = getFlowStepsByTaskType(item.task_type);
  const currentIdx = steps.findIndex(s => s.key === item.audit_progress);
  const isObsoleted = item.audit_progress === 'obsoleted';

  container.innerHTML = `
    <div class="rr-flow-steps">
      ${steps.map((step, idx) => {
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
          status = 'completed';
          operator = item[step.reviewByField] || '';
          time = formatDateTime(item[step.reviewAtField]);
        }

        return `
          <div class="rr-flow-step ${status}">
            <div class="rr-flow-step-dot">
              ${status === 'completed' ? SVG.check : (status === 'active' ? '<span class="rr-flow-dot-active"></span>' : '<span class="rr-flow-dot-pending"></span>')}
            </div>
            <div class="rr-flow-step-label">${step.label}</div>
            ${operator ? `<div class="rr-flow-step-info">${operator} · ${time}</div>` : ''}
            ${idx < steps.length - 1 ? '<div class="rr-flow-step-line"></div>' : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderReviewSection(item) {
  const container = document.getElementById('rrdRightsList');
  if (!container) return;

  const steps = getFlowStepsByTaskType(item.task_type);
  const currentIdx = steps.findIndex(s => s.key === item.audit_progress);
  const isConfirmed = item.audit_progress === 'confirmed_rights';
  const isRisk = item.task_type && (item.task_type.startsWith('risk_review') || item.task_type === 'defect_reaudit');

  // ========== 当前流程区（左右分栏） ==========
  let flowHTML = '';
  if (isConfirmed) {
    // 已完成——横向展示所有节点回显
    flowHTML = `
      <div class="rrd-section-card">
        <div class="rrd-section-title">当前流程</div>
        <div style="display:flex;flex-direction:column;gap:16px;padding:16px 20px">
          ${renderNodeSummary('版权运营初审', buildFirstReviewDisplay(item, isRisk), item.rights_first_review_by, item.rights_first_review_at)}
          ${renderNodeSummary('法务复审', buildSecondReviewDisplay(item, isRisk), item.rights_second_review_by, item.rights_second_review_at)}
          ${renderNodeSummary(isRisk ? '外循环运营授权评估' : '品类运营授权评估', buildThirdReviewDisplay(item), item.rights_third_review_by, item.rights_third_review_at)}
        </div>
      </div>`;
  } else {
    // 未完成——左右分栏
    const leftNodes = steps.map((step, idx) => {
      let status = 'pending';
      if (idx < currentIdx) status = 'completed';
      else if (idx === currentIdx) status = 'active';
      return `
        <div class="rrd-flow-node ${status}" style="display:flex;align-items:flex-start;gap:12px;position:relative;padding-bottom:${idx < steps.length - 1 ? '24px' : '0'}">
          <div style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;${
            status === 'completed' ? 'background:#10b981;color:#fff' :
            status === 'active' ? 'background:#6c5ce7;color:#fff' :
            'background:#e5e7eb;color:#999'
          }">
            ${status === 'completed' ? SVG.check : `<span style="font-size:11px;font-weight:600">${idx + 1}</span>`}
          </div>
          ${idx < steps.length - 1 ? `<div style="position:absolute;left:11px;top:28px;width:2px;height:calc(100% - 28px);background:${status === 'completed' ? '#10b981' : '#e5e7eb'}"></div>` : ''}
          <div>
            <div style="font-size:13px;font-weight:500;color:${status === 'active' ? '#6c5ce7' : '#333'}">${step.label}</div>
            ${status === 'completed' && item[step.reviewByField] ? `<div style="font-size:11px;color:#999;margin-top:2px">${item[step.reviewByField]} · ${formatDateTime(item[step.reviewAtField])}</div>` : ''}
            ${status === 'completed' ? `<div style="margin-top:6px;font-size:12px;color:#666">${
              idx === 0 ? buildFirstReviewDisplay(item, isRisk) :
              idx === 1 ? buildSecondReviewDisplay(item, isRisk) :
              buildThirdReviewDisplay(item)
            }</div>` : ''}
          </div>
        </div>`;
    }).join('');

    // 右侧：当前阶段审核表单
    let rightPanel = '';
    const activeStep = steps[currentIdx];
    const activeName = activeStep ? activeStep.label : '';
    if (item.audit_progress === 'rights_first_review') {
      rightPanel = renderFirstReviewForm(item, isRisk);
    } else if (item.audit_progress === 'rights_second_review') {
      rightPanel = renderSecondReviewForm(item, isRisk);
    } else if (item.audit_progress === 'rights_third_review') {
      rightPanel = renderThirdReviewForm(item, isRisk);
    }

    flowHTML = `
      <div class="rrd-section-card" style="padding:0">
        <div style="display:flex">
          <div style="flex:7;min-width:0;border-right:1px solid #e5e7eb">
            <div class="rrd-section-title" style="padding:14px 20px;border-bottom:1px solid #e5e7eb">当前流程</div>
            <div style="padding:20px">${leftNodes}</div>
          </div>
          <div style="flex:10;min-width:0">
            <div style="padding:14px 20px;border-bottom:1px solid #e5e7eb;font-size:15px;font-weight:500">${activeName}</div>
            <div style="padding:20px">${rightPanel}</div>
          </div>
        </div>
      </div>`;
  }

  // ========== 待审核信息区（权益卡片 + 详情面板） ==========
  const rightsInfos = item.rights_infos || [];
  let rightsHTML = '';
  if (rightsInfos.length > 0) {
    rightsHTML = `
      <div style="margin-top:20px">
        <div style="font-size:16px;font-weight:600;color:#111;margin-bottom:12px">待审核信息</div>
        <div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px">
          ${rightsInfos.map((r, i) => {
            const isImport = r.copyright_type === 'import';
            const isRiskCard = (item.risk_export_copr_rights_ids || []).includes(r.copr_rights_id) ||
                               (item.defect_copy_rights_ids || []).includes(r.copr_rights_id);
            return `
              <div class="rrd-rights-card" onclick="toggleRightsDetail(this, ${i})" style="min-width:280px;cursor:pointer;border:1px solid #f0f0f0;border-radius:10px;padding:14px 18px;background:#fff;transition:all .2s">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                  <span style="font-size:11px;padding:2px 8px;border-radius:4px;${
                    r.ip_authorize_right_external === 'authorized' ? 'background:#f0fdf4;color:#166534' :
                    r.ip_authorize_right_external === 'not_authorized' ? 'background:#fef2f2;color:#991b1b' :
                    r.ip_authorize_right_external === 'pending' ? 'background:#fffbeb;color:#92400e' : 'background:#f9fafb;color:#666'
                  }">${
                    r.ip_authorize_right_external === 'authorized' ? '已授权' :
                    r.ip_authorize_right_external === 'not_authorized' ? '不授权' :
                    r.ip_authorize_right_external === 'pending' ? '待审查' : '—'
                  }</span>
                  ${isRiskCard || !isImport ? `<span style="color:#ef4444;font-size:12px;font-weight:500">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" style="vertical-align:-1px"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    风险审查</span>` : ''}
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;font-size:12px">
                  <div style="display:flex;justify-content:space-between"><span style="color:#999">权益ID</span><span style="color:#333;font-family:monospace">${r.copr_rights_id}</span></div>
                  <div style="display:flex;justify-content:space-between"><span style="color:#999">合同号</span><span style="color:#333">${r.contract_codes || '-'}</span></div>
                  <div style="display:flex;justify-content:space-between"><span style="color:#999">权益类型</span><span style="color:#333">${isImport ? '引入类权益' : '输出类权益'}</span></div>
                </div>
              </div>`;
          }).join('')}
        </div>
        <div id="rightsDetailPanel" style="margin-top:12px;display:none;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:20px">
        </div>
      </div>`;
  }

  container.innerHTML = flowHTML + rightsHTML;
}

function toggleRightsDetail(card, idx) {
  const panel = document.getElementById('rightsDetailPanel');
  if (!panel || !rrCurrentDetailItem) return;
  const infos = rrCurrentDetailItem.rights_infos || [];
  const r = infos[idx];
  if (!r) return;
  
  // 高亮选中卡片
  document.querySelectorAll('.rrd-rights-card').forEach(c => c.style.borderColor = '#f0f0f0');
  card.style.borderColor = '#6c5ce7';
  
  panel.style.display = '';
  const isImport = r.copyright_type === 'import';
  
  // Radio 只读展示辅助函数
  const radioRow = (label, options, selected) => {
    if (!options || options.length === 0) return '';
    return `<div style="margin-bottom:14px">
      <div style="font-size:12px;color:#999;margin-bottom:6px">${label}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">${options.map(([val, text]) => 
        `<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:${val === selected ? '#6c5ce7' : '#ccc'}">
          <span style="width:14px;height:14px;border-radius:50%;border:2px solid ${val === selected ? '#6c5ce7' : '#d0d5dd'};display:inline-flex;align-items:center;justify-content:center">
            ${val === selected ? '<span style="width:6px;height:6px;border-radius:50%;background:#6c5ce7"></span>' : ''}
          </span>${text}</span>`
      ).join('')}</div>
    </div>`;
  };
  const multiRadioRow = (label, options, selectedArr) => {
    if (!options || options.length === 0) return '';
    const arr = selectedArr || [];
    return `<div style="margin-bottom:14px">
      <div style="font-size:12px;color:#999;margin-bottom:6px">${label}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">${options.map(([val, text]) => 
        `<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:${arr.includes(val) ? '#6c5ce7' : '#ccc'}">
          <span style="width:14px;height:14px;border-radius:3px;border:2px solid ${arr.includes(val) ? '#6c5ce7' : '#d0d5dd'};display:inline-flex;align-items:center;justify-content:center">
            ${arr.includes(val) ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="#6c5ce7" stroke="#6c5ce7" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
          </span>${text}</span>`
      ).join('')}</div>
    </div>`;
  };
  const infoItem = (label, value) => `<div style="flex:1;min-width:200px;margin-bottom:14px"><div style="font-size:12px;color:#999;margin-bottom:4px">${label}</div><div style="font-size:13px;color:#333">${value || '-'}</div></div>`;
  const divider = '<div style="height:1px;background:#f0f0f0;margin:8px 0 16px"></div>';
  const sectionTitle = (title) => `<div style="font-size:14px;font-weight:600;color:#333;margin-bottom:14px">${title}</div>`;

  if (isImport) {
    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;border-bottom:1px solid #f0f0f0;padding-bottom:14px;margin-bottom:16px">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span style="font-size:15px;font-weight:500">权益ID-${r.copr_rights_id}</span>
      </div>
      <div style="padding:0 12px">
        ${sectionTitle('一、基本信息')}
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          ${infoItem('权益ID', r.copr_rights_id)}
          ${infoItem('权益合同号', `<a href="#" style="color:#6c5ce7;text-decoration:none">${r.contract_codes || '-'}</a>`)}
        </div>
        ${radioRow('版权类型', [['import_intro','引入版权'],['import_self','引入自制'],['import_custom','引入定制'],['import_replace','引入置换']], r.copyright_type === 'import' ? 'import_intro' : '')}
        ${radioRow('瑕疵类型', [['pending','权利瑕疵'],['authorized','权利可用'],['not_authorized','权利完全不可用']], r.ip_authorize_right_external)}
        
        ${divider}
        ${sectionTitle('二、授权基础权利')}
        <div style="display:flex;gap:24px;flex-wrap:wrap">
          ${radioRow('授权性质', [['exclusive','独家'],['non_exclusive','非独家']], r.co_intention)}
          <div style="flex:2">${multiRadioRow('授权权利', [['information_network','信息网络传播权'],['broadcast','广播权'],['editing','剪辑权'],['entertainment','娱乐权'],['tv_channel','电视渠道广播权'],['satellite','卫星'],['terrestrial','地面频道'],['network_broadcast','网络渠道广播权'],['aviation','航空器播放权']], r.copyright_rights)}</div>
        </div>
        <div style="display:flex;gap:24px;flex-wrap:wrap">
          ${radioRow('转授权起止日期类型', [['inherit_auth_period','继承授权期限'],['custom_period','自有期限']], r.resell_time_type)}
          ${infoItem('授权起止日期', `${r.copyright_time_start || '-'} 至 ${r.copyright_time_end || '-'}`)}
        </div>
        ${radioRow('转授权许可', [['allowed','可转授'],['joint_sublicense','联合转授'],['not_allowed','不可转授']], r.sub_license_permission)}
        
        ${divider}
        ${sectionTitle('三、二创权利')}
        ${radioRow('二创权利-权利有无', [['123127036','有'],['123127037','无'],['123127038','未约定']], r.second_creation_has_rights)}
        ${radioRow('二创权利性质-独占性', [['exclusive','独占'],['non_exclusive','非独占']], r.second_creation_exclusivity)}
        ${radioRow('二创权利性质-转授权', [['allowed','可转授'],['not_allowed','不可转授']], r.second_creation_sublicense)}
        
        ${divider}
        ${sectionTitle('四、二创创作成果')}
        ${radioRow('时长要求-授权使用', [['no_limit','无限制'],['has_limit','有限制']], r.achievements_time_requirement_authorized_use)}
        ${radioRow('数量要求-授权使用', [['no_limit','无限制'],['has_limit','有限制']], r.achievements_quantity_requirement_authorized_use)}
        ${radioRow('二创权利-新成果归属', [['licensor','授权方'],['licensee','被授权方'],['joint_ownership','共同所有']], r.second_creation_new_attribution)}
        
        ${divider}
        ${sectionTitle('五、二创传播限制')}
        ${radioRow('传播渠道-授权使用', [['no_limit','无限制'],['has_limit','有限制']], r.dissemination_restrictions_channels_authorized_use)}
        ${radioRow('传播期限-授权使用', [['no_limit','无限制'],['has_limit','有限制']], r.dissemination_restrictions_period_authorized_use)}
        ${radioRow('地域-授权使用', [['no_limit','无限制'],['has_limit','有限制']], r.dissemination_restrictions_area_authorized_use)}
      </div>`;
  } else {
    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;border-bottom:1px solid #f0f0f0;padding-bottom:14px;margin-bottom:16px">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span style="font-size:15px;font-weight:500">权益ID-${r.copr_rights_id}</span>
      </div>
      <div style="padding:0 12px">
        ${sectionTitle('输出类权益信息')}
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          ${infoItem('权益ID', r.copr_rights_id)}
          ${infoItem('合同号', r.contract_codes || '-')}
          ${infoItem('输出平台', r.export_platform || '-')}
          ${infoItem('权利类型', r.export_rights_type || '-')}
          ${infoItem('授权开始', r.export_time_start || '-')}
          ${infoItem('授权结束', r.export_time_end || '-')}
        </div>
      </div>`;
  }
}

// ========== 已完成节点回显 ==========
function renderNodeSummary(name, fieldsHTML, reviewer, reviewAt) {
  return `
    <div style="background:#f9fafb;border-radius:8px;padding:12px 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:13px;font-weight:500;color:#333">${name}</span>
        ${reviewer ? `<span style="font-size:11px;color:#999">${reviewer} · ${formatDateTime(reviewAt)}</span>` : ''}
      </div>
      <div style="font-size:12px;color:#666">${fieldsHTML}</div>
    </div>`;
}

function buildFirstReviewDisplay(item, isRisk) {
  const parts = [];
  parts.push(`人审结论：${getReviewResultLabel(item.rights_first_review_result) || '-'}`);
  if (item.rights_first_review_result === 'rights_defect' && item.rights_first_review_defect_type?.length) {
    parts.push(`瑕疵类型：${getDefectTypeLabels(item.rights_first_review_defect_type)}`);
  }
  if (item.rights_first_review_authorized_platforms?.length) {
    parts.push(`可授权平台：${getPlatformLabels(item.rights_first_review_authorized_platforms)}`);
  }
  if (item.rights_first_review_excluded_platforms?.length) {
    parts.push(`排除平台：${getExcludedPlatformLabels(item.rights_first_review_excluded_platforms)}`);
  }
  if (item.rights_first_review_remark) parts.push(`备注：${item.rights_first_review_remark}`);
  return parts.join('<br>');
}

function buildSecondReviewDisplay(item, isRisk) {
  const parts = [];
  parts.push(`人审结论：${getReviewResultLabel(item.rights_second_review_result) || '-'}`);
  if (item.import_copr_rights_id) parts.push(`授权依据：${item.import_copr_rights_id}`);
  if (item.rights_second_review_authorized_platforms?.length) {
    parts.push(`可授权平台：${getPlatformLabels(item.rights_second_review_authorized_platforms)}`);
  }
  if (item.rights_second_review_excluded_platforms?.length) {
    parts.push(`排除平台：${getExcludedPlatformLabels(item.rights_second_review_excluded_platforms)}`);
  }
  if (item.rights_second_review_result === 'rights_defect') {
    if (item.rights_second_review_defect_type?.length) parts.push(`瑕疵类型：${getDefectTypeLabels(item.rights_second_review_defect_type)}`);
    if (item.rights_second_review_defect_disposal_method) parts.push(`瑕疵处置：${getDisposalMethodLabel(item.rights_second_review_defect_disposal_method)}`);
  }
  if (item.rights_second_review_remark) parts.push(`备注：${item.rights_second_review_remark}`);
  return parts.join('<br>');
}

function buildThirdReviewDisplay(item) {
  const parts = [];
  parts.push(`授权判断：${getThirdReviewResultLabel(item.rights_third_review_result) || '-'}`);
  if (item.rights_third_review_defect_disposal_result) parts.push(`瑕疵处置结论：${item.rights_third_review_defect_disposal_result}`);
  const platforms = [];
  if (item.rights_third_review_authorized_platform_kuaishou === 'Y') platforms.push('快手');
  if (item.rights_third_review_authorized_platform_douyin === 'Y') platforms.push('抖音');
  if (platforms.length) parts.push(`可授权平台：${platforms.join('、')}`);
  if (item.rights_third_review_authorized_platform_kuaishou === 'Y') {
    parts.push(`快手授权：${item.rights_third_review_authorized_platform_kuaishou_start_date || '-'} 至 ${item.rights_third_review_authorized_platform_kuaishou_end_date || '-'}`);
  }
  if (item.rights_third_review_authorized_platform_douyin === 'Y') {
    parts.push(`抖音授权：${item.rights_third_review_authorized_platform_douyin_start_date || '-'} 至 ${item.rights_third_review_authorized_platform_douyin_end_date || '-'}`);
  }
  return parts.join('<br>');
}

// ========== 各阶段审核表单（右侧面板） ==========

function renderFirstReviewForm(item, isRisk) {
  return `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="rr-form-row"><span class="rr-form-label">人审结论 <span style="color:#ef4444">*</span></span>
        <select class="rr-form-select" id="rrFirstResult" onchange="document.getElementById('rrFirstDefectRow').style.display=this.value==='rights_defect'?'':'none'">
          <option value="">请选择</option><option value="rights_available">权利可用</option><option value="rights_defect">权利瑕疵</option>
        </select>
      </div>
      <div class="rr-form-row" id="rrFirstDefectRow" style="display:none">
        <span class="rr-form-label">瑕疵类型 <span style="color:#ef4444">*</span></span>
        <div class="rr-checkbox-group">${Object.entries(DEFECT_TYPE_MAP).map(([k,v]) => `<label class="rr-checkbox-label"><input type="checkbox" value="${k}" class="rrFirstDefect"> ${v}</label>`).join('')}</div>
      </div>
      <div class="rr-form-row"><span class="rr-form-label">可授权平台</span>
        <div class="rr-checkbox-group">${Object.entries(AUTHORIZED_PLATFORM_MAP).map(([k,v]) => `<label class="rr-checkbox-label"><input type="checkbox" value="${k}" class="rrFirstPlatform"> ${v}</label>`).join('')}</div>
      </div>
      <div class="rr-form-row"><span class="rr-form-label">排除平台</span>
        <div class="rr-checkbox-group">${Object.entries(EXCLUDED_PLATFORM_MAP).map(([k,v]) => `<label class="rr-checkbox-label"><input type="checkbox" value="${k}" class="rrFirstExclude"> ${v}</label>`).join('')}</div>
      </div>
      <div class="rr-form-row"><span class="rr-form-label">初审备注</span>
        <textarea class="rr-form-textarea" id="rrFirstRemark" placeholder="选填"></textarea>
      </div>
      <div style="display:flex;justify-content:flex-end"><button class="rr-btn-submit" onclick="submitFirstReviewV2()">提交审查结论</button></div>
    </div>`;
}

function renderSecondReviewForm(item, isRisk) {
  const rightsOpts = (item.import_copr_rights_ids || []).filter(id => id);
  const autoSelect = rightsOpts.length === 1;
  return `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="rr-form-row"><span class="rr-form-label">人审结论 <span style="color:#ef4444">*</span></span>
        <select class="rr-form-select" id="rrSecondResult" onchange="document.getElementById('rrSecondDefectArea').style.display=this.value==='rights_defect'?'':'none'">
          <option value="">请选择</option><option value="rights_available">权利可用</option><option value="rights_defect">权利瑕疵</option>
        </select>
      </div>
      <div class="rr-form-row"><span class="rr-form-label">授权依据的引入权利 <span style="color:#ef4444">*</span></span>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${rightsOpts.map(id => `<label style="display:flex;align-items:center;gap:6px;font-size:12px;padding:6px 10px;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer">
            <input type="radio" name="rrSecondImportRightsId" value="${id}" ${autoSelect ? 'checked' : ''}> ${id}
          </label>`).join('')}
        </div>
      </div>
      <div class="rr-form-row"><span class="rr-form-label">可授权平台 <span style="color:#ef4444">*</span></span>
        <div class="rr-checkbox-group">${Object.entries(AUTHORIZED_PLATFORM_MAP).map(([k,v]) => `<label class="rr-checkbox-label"><input type="checkbox" value="${k}" class="rrSecondPlatform"> ${v}</label>`).join('')}</div>
      </div>
      <div class="rr-form-row"><span class="rr-form-label">排除平台 <span style="color:#ef4444">*</span></span>
        <div class="rr-checkbox-group">${Object.entries(EXCLUDED_PLATFORM_MAP).map(([k,v]) => `<label class="rr-checkbox-label"><input type="checkbox" value="${k}" class="rrSecondExclude"> ${v}</label>`).join('')}</div>
      </div>
      <div id="rrSecondDefectArea" style="display:none">
        <div class="rr-form-row" style="margin-bottom:14px"><span class="rr-form-label">瑕疵类型 <span style="color:#ef4444">*</span></span>
          <div class="rr-checkbox-group">${Object.entries(DEFECT_TYPE_MAP).map(([k,v]) => `<label class="rr-checkbox-label"><input type="checkbox" value="${k}" class="rrSecondDefect"> ${v}</label>`).join('')}</div>
        </div>
        <div class="rr-form-row"><span class="rr-form-label">瑕疵处置方式 <span style="color:#ef4444">*</span></span>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${Object.entries(DEFECT_DISPOSAL_METHOD_MAP).map(([k,v]) => `<label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="radio" name="rrSecondDisposal" value="${k}"> ${v}</label>`).join('')}
          </div>
        </div>
      </div>
      <div class="rr-form-row"><span class="rr-form-label">复审备注</span>
        <textarea class="rr-form-textarea" id="rrSecondRemark" placeholder="选填，如：合同授权范围不含短视频二创权益"></textarea>
      </div>
      <div style="display:flex;justify-content:flex-end"><button class="rr-btn-submit" onclick="submitSecondReviewV2()">提交审查结论</button></div>
    </div>`;
}

function renderThirdReviewForm(item, isRisk) {
  const hasDefect = item.rights_second_review_result === 'rights_defect';
  return `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="rr-form-row"><span class="rr-form-label">授权判断 <span style="color:#ef4444">*</span></span>
        <select class="rr-form-select" id="rrThirdResult" onchange="document.getElementById('rrThirdPlatformSection').style.display=this.value==='can_authorized'?'':'none'">
          <option value="">请选择</option><option value="can_authorized">可授权</option><option value="not_authorized">不授权</option>
        </select>
      </div>
      ${hasDefect ? `
        <div class="rr-form-row"><span class="rr-form-label">瑕疵处置结论 <span style="color:#ef4444">*</span></span>
          <div style="display:flex;flex-direction:column;gap:4px">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="radio" name="rrThirdDisposalResult" value="confirmed_disposal"> 已处置</label>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="radio" name="rrThirdDisposalResult" value="no_disposal_needed"> 无需处置</label>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="radio" name="rrThirdDisposalResult" value="pending_disposal"> 待处置</label>
          </div>
        </div>
      ` : ''}
      <div id="rrThirdPlatformSection" style="display:none">
        <div class="rr-form-row" style="margin-bottom:14px"><span class="rr-form-label">可授权平台 <span style="color:#ef4444">*</span></span>
          <div style="display:flex;gap:12px">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="checkbox" id="rrThirdKs" ${item.is_restricted_kuaishou ? 'disabled' : ''} onchange="document.getElementById('rrThirdKsDates').style.display=this.checked?'flex':'none'"> 快手 ${item.is_restricted_kuaishou ? '<span style="color:#ef4444;font-size:11px">（受限）</span>' : ''}</label>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="checkbox" id="rrThirdDy" onchange="document.getElementById('rrThirdDyDates').style.display=this.checked?'flex':'none'"> 抖音</label>
          </div>
        </div>
        <div id="rrThirdKsDates" style="display:none;gap:8px;align-items:center;margin-bottom:14px;padding-left:8px">
          <span style="font-size:12px;color:#666">快手授权时间：</span>
          <input type="date" class="rr-form-date" id="rrThirdKsStart" ${isRisk ? 'disabled' : ''}> <span>—</span>
          <input type="date" class="rr-form-date" id="rrThirdKsEnd" ${isRisk ? 'disabled' : ''}>
        </div>
        <div id="rrThirdDyDates" style="display:none;gap:8px;align-items:center;margin-bottom:14px;padding-left:8px">
          <span style="font-size:12px;color:#666">抖音授权时间：</span>
          <input type="date" class="rr-form-date" id="rrThirdDyStart" ${isRisk ? 'disabled' : ''}> <span>—</span>
          <input type="date" class="rr-form-date" id="rrThirdDyEnd" ${isRisk ? 'disabled' : ''}>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end"><button class="rr-btn-submit" onclick="submitThirdReviewV2()">提交${isRisk ? '回收评估' : '授权评估'}结论</button></div>
    </div>`;
}

// 排除平台标签辅助函数
function getExcludedPlatformLabels(arr) {
  if (!arr || arr.length === 0) return '-';
  return arr.map(k => EXCLUDED_PLATFORM_MAP[k] || k).join('、');
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
  const excludePlatforms = Array.from(document.querySelectorAll('.rrFirstExclude:checked')).map(c => c.value);
  const remark = document.getElementById('rrFirstRemark')?.value || '';
  const defectTypes = Array.from(document.querySelectorAll('.rrFirstDefect:checked')).map(c => c.value);

  // Mock 更新
  rrCurrentDetailItem.rights_first_review_result = result;
  rrCurrentDetailItem.rights_first_review_authorized_platforms = platforms;
  rrCurrentDetailItem.rights_first_review_excluded_platforms = excludePlatforms;
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
  const excludePlatforms = Array.from(document.querySelectorAll('.rrSecondExclude:checked')).map(c => c.value);
  const disposal = document.querySelector('input[name="rrSecondDisposal"]:checked')?.value || '';
  const remark = document.getElementById('rrSecondRemark')?.value || '';
  const importRightsId = document.querySelector('input[name="rrSecondImportRightsId"]:checked')?.value || '';
  const defectTypes = Array.from(document.querySelectorAll('.rrSecondDefect:checked')).map(c => c.value);

  if (!importRightsId) { alert('请选择授权依据的引入权利'); return; }

  rrCurrentDetailItem.rights_second_review_result = result;
  rrCurrentDetailItem.rights_second_review_authorized_platforms = platforms;
  rrCurrentDetailItem.rights_second_review_excluded_platforms = excludePlatforms;
  rrCurrentDetailItem.rights_second_review_defect_disposal_method = disposal;
  rrCurrentDetailItem.rights_second_review_defect_type = defectTypes;
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
