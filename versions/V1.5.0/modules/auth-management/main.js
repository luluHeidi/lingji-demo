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

    // M13: Detect entry point from active sidebar menu
    var activeSubmenu = document.querySelector('.menu-item.level-2.active');
    var entryId = activeSubmenu ? activeSubmenu.dataset.submenu : 'project-management';

    // M13: Hide category tabs (no longer needed)
    var tabsEl = document.getElementById('authCategoryTabs');
    if (tabsEl) tabsEl.style.display = 'none';

    // M13: Update breadcrumb text
    var breadcrumb = document.querySelector('.auth-management-page .breadcrumb-item span');
    if (breadcrumb) {
        breadcrumb.textContent = (entryId === 'rights-review') ? '\u6388\u6743\u5ba1\u67e5' : '\u9879\u76ee\u7ba1\u7406';
    }

    // M13: Show correct content based on entry
    var tabMyProjects = document.getElementById('tabMyProjects');
    var tabRightsReview = document.getElementById('tabRightsReview');
    if (entryId === 'rights-review') {
        if (tabMyProjects) tabMyProjects.style.display = 'none';
        if (tabRightsReview) tabRightsReview.style.display = 'block';
        // Init rights review V2 module with data
        if (typeof initRightsReviewV2 === 'function') {
            initRightsReviewV2(authData);
        } else {
            setTimeout(function() {
                if (typeof initRightsReviewV2 === 'function') initRightsReviewV2(authData);
            }, 300);
        }
    } else {
        if (tabMyProjects) tabMyProjects.style.display = 'block';
        if (tabRightsReview) tabRightsReview.style.display = 'none';
        renderProjectList();
        bindEvents();
    }

    bindAuthTabs();
}

/**
 * 加载数据
 */
async function loadAuthData() {
    try {
        const response = await fetch('modules/auth-management/data.json?_=' + Date.now());
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

    // 兼容一期/二期数据结构
    const STATUS_LABEL_MAP = { running: '进行中', completed: '已结束', paused: '已暂停', draft: '草稿', deleted: '已删除' };
    const RIGHTS_TYPE_MAP = { secondary_creation: '二创权', info_network: '信网权', adaptation: '改编权', ip_usage: 'IP使用权' };
    const AUDIT_MODE_MAP = { rolling: '滚动审核', batch: '批量审核', simplified: '简化审核' };
    const statusLabel = project.statusLabel || STATUS_LABEL_MAP[project.status] || project.status || '-';
    const authPeriod = project.authPeriod || ((project.auth_window_start && project.auth_window_end) ? `${project.auth_window_start} ~ ${project.auth_window_end}` : '-');
    const projectType = project.type || RIGHTS_TYPE_MAP[project.rights_type] || '-';
    const auditMode = AUDIT_MODE_MAP[project.audit_mode] || project.audit_mode || '';

    header.innerHTML = `
        <div class="detail-header-top">
            <div class="detail-header-name">
                <i data-lucide="layers" class="project-title-icon"></i>
                <h2>${project.name}</h2>
                <span class="detail-id">ID: ${project.id}</span>
            </div>
            <div class="project-status-tag ${project.status}">
                <span class="status-dot"></span>
                <span>${statusLabel}</span>
            </div>
        </div>
        <div class="detail-header-info">
            <div class="detail-info-item">授权时间：<span>${authPeriod}</span></div>
            <div class="detail-info-item">权利类型：<span>${projectType}</span></div>
            ${auditMode ? `<div class="detail-info-item">审核方式：<span>${auditMode}</span></div>` : ''}
        </div>
    `;
}

/**
 * 判断各区域可见性
 */
function getSectionVisibility(project) {
    const isLongTerm = project.type === '长期授权项目' || project.audit_mode === 'rolling';
    const isSingleTerm = project.type === '单次授权项目' || project.audit_mode === 'batch';
    var isKuaishou = (project.partner_name || '').indexOf('\u5feb\u624b') >= 0;
    var isRolling = project.audit_mode === 'rolling';

    // 二期项目默认显示所有区域
    const isV2Project = !!project.rights_type;
    if (isV2Project) {
        return {
            showProjectData: isRolling,
            showAuthDetails: true,
            showApplications: false,
            showApprovals: false,
            showProjectConfig: true,
            showNewHot: isKuaishou && isRolling
        };
    }
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

    return { showProjectData, showAuthDetails, showApplications, showApprovals, showProjectConfig: true, showNewHot: isKuaishou && isRolling };
}

/**
 * 渲染快速跳转导航条
 */
function renderDetailNavBar(project) {
    const navBar = document.getElementById('detailNavBar');
    if (!navBar) return;

    const vis = getSectionVisibility(project);
    const tabs = [];

    if (vis.showProjectData) tabs.push({ section: 'sectionProjectData', label: '\u9879\u76ee\u6570\u636e' });
    if (vis.showAuthDetails) tabs.push({ section: 'sectionAuthDetails', label: '\u6388\u6743\u7247\u5355\u7ba1\u7406' });
    if (vis.showProjectConfig) tabs.push({ section: 'sectionProjectConfig', label: '\u9879\u76ee\u914d\u7f6e' });
    if (vis.showNewHot) tabs.push({ section: 'sectionNewHot', label: '\u65b0\u70ed\u9884\u544a' });

    navBar.innerHTML = '<div class="detail-tabs">' + tabs.map(function(tab, idx) {
        return '<div class="detail-tab' + (idx === 0 ? ' active' : '') + '" data-section="' + tab.section + '">' + tab.label + '</div>';
    }).join('') + '</div>';

    // Hide all sections first, show first tab
    var allSections = ['sectionProjectData', 'sectionAuthDetails', 'sectionApprovals', 'sectionProjectConfig', 'sectionNewHot'];
    allSections.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    if (tabs.length > 0) {
        var firstSection = document.getElementById(tabs[0].section);
        if (firstSection) firstSection.style.display = 'block';
    }

    // Tab click handler
    navBar.querySelectorAll('.detail-tab').forEach(function(tabEl) {
        tabEl.addEventListener('click', function() {
            navBar.querySelectorAll('.detail-tab').forEach(function(t) { t.classList.remove('active'); });
            tabEl.classList.add('active');
            allSections.forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            var target = document.getElementById(tabEl.dataset.section);
            if (target) target.style.display = 'block';
        });
    });
}

/**
 * 渲染详情各区域
 */
function renderDetailSections(project) {
    const vis = getSectionVisibility(project);
    const detail = project.detail || {};

    // 项目数据（M5）
    if (vis.showProjectData && detail.projectData) {
        renderProjectDataSection(detail.projectData);
    }

    // 授权明细（M4: 授权片单）
    if (vis.showAuthDetails) {
        const sheetData = detail.authSheet || detail.authDetails || [];
        renderAuthDetailsTable(sheetData);
    }

    // M6: 项目配置（初始化数据，display 由 Tab 控制）
    if (vis.showProjectConfig) {
        if (typeof renderProjectConfigSection === 'function') renderProjectConfigSection(project);
    }

    // M7: 新热预告（初始化数据，display 由 Tab 控制）
    if (vis.showNewHot) {
        if (typeof renderNewHotSection === 'function') renderNewHotSection(project);
    }
}

/**
 * 渲染项目数据区域
 */
function renderProjectDataSection(data) {
    if (!data) return;
    // M5: Full project data dashboard
    var safetyLine = data.safetyLine || 3500;
    var dailyAvg = data.dailyAvg || 0;
    var isAboveSafe = dailyAvg >= safetyLine;

    // 1. Metric cards
    var container = document.getElementById('dataMetricCards');
    if (container) {
        var catAvg = data.categoryDailyAvg || {};
        var catCards = '';
        Object.keys(catAvg).forEach(function(k) {
            catCards += '<div class="metric-card-sm"><div class="metric-card-sm-label">' + k + '</div><div class="metric-card-sm-value">' + catAvg[k] + '</div></div>';
        });
        container.innerHTML = '<div class="metric-main-row">'
            + '<div class="metric-card-total" style="border-left:4px solid ' + (isAboveSafe ? '#00b578' : '#ee3f4d') + '">'
            + '<div class="metric-total-label">\u65e5\u5747\u6388\u6743\u4f5c\u54c1\u603b\u6570</div>'
            + '<div class="metric-total-value" style="color:' + (isAboveSafe ? '#00b578' : '#ee3f4d') + '">' + dailyAvg + '</div>'
            + '<div class="metric-total-unit">\u90e8/\u65e5\u5747\uff08\u5b89\u5168\u7ebf ' + safetyLine + '\uff09</div>'
            + '</div></div>'
            + '<div class="metric-category-label">\u5206\u54c1\u7c7b\u65e5\u5747\u6388\u6743\u6570</div>'
            + '<div class="metric-cards-grid">' + catCards + '</div>';
    }

    // 2. Monthly trend chart
    var chartM = document.getElementById('chartMonthly');
    if (chartM && data.monthlyTrend && data.monthlyTrend.length > 0) {
        var maxM = 0;
        data.monthlyTrend.forEach(function(d) { if (d.actual > maxM) maxM = d.actual; if (d.newHot > maxM) maxM = d.newHot; });
        maxM = Math.max(maxM, safetyLine) * 1.1;
        var safePos = ((safetyLine / maxM) * 100).toFixed(1);
        var barsM = '';
        data.monthlyTrend.forEach(function(d) {
            var hA = ((d.actual / maxM) * 100).toFixed(1);
            var hN = ((d.newHot / maxM) * 100).toFixed(1);
            barsM += '<div class="m5-bar-group">'
                + '<div class="m5-bar-pair" style="height:200px">'
                + '<div class="m5-bar actual" style="height:' + hA + '%" title="\u5b9e\u9645 ' + d.actual + '"><span class="m5-bar-val">' + d.actual + '</span></div>'
                + '<div class="m5-bar newhot" style="height:' + hN + '%" title="\u9884\u4f30\u65b0\u70ed ' + d.newHot + '"><span class="m5-bar-val">' + d.newHot + '</span></div>'
                + '</div>'
                + '<div class="m5-bar-label">' + d.month + '</div></div>';
        });
        chartM.innerHTML = '<div class="m5-chart-legend"><span class="m5-legend-item"><span class="m5-legend-dot" style="background:#3b82f6"></span>\u5b9e\u9645</span>'
            + '<span class="m5-legend-item"><span class="m5-legend-dot" style="background:#93c5fd"></span>\u9884\u4f30\u65b0\u70ed</span>'
            + '<span class="m5-legend-item"><span class="m5-legend-dot" style="background:transparent;border:1px dashed #ee3f4d"></span>\u5b89\u5168\u7ebf ' + safetyLine + '</span></div>'
            + '<div class="m5-chart-area" style="position:relative">'
            + '<div class="m5-safety-line" style="bottom:' + safePos + '%"><span>' + safetyLine + '</span></div>'
            + '<div class="m5-bars-row">' + barsM + '</div></div>';
    }

    // 3. Quarterly trend chart
    var chartQ = document.getElementById('chartQuarterly');
    var legendQ = document.getElementById('chartQuarterlyLegend');
    if (chartQ && data.quarterlyTrend && data.quarterlyTrend.length > 0) {
        var maxQ = 0;
        data.quarterlyTrend.forEach(function(d) { if (d.daily > maxQ) maxQ = d.daily; });
        maxQ = maxQ * 1.15;
        if (legendQ) {
            legendQ.innerHTML = '<div class="m5-chart-legend"><span class="m5-legend-item"><span class="m5-legend-dot" style="background:#3b82f6"></span>\u5b9e\u9645</span>'
                + '<span class="m5-legend-item"><span class="m5-legend-dot" style="background:#60a5fa"></span>\u9884\u8ba1</span>'
                + '<span class="m5-legend-item"><span class="m5-legend-dot" style="background:#bfdbfe"></span>\u9884\u4f30</span></div>';
        }
        var typeCls = { actual: 'actual', estimated: 'estimated', forecast: 'forecast' };
        var barsQ = '';
        data.quarterlyTrend.forEach(function(d) {
            var h = ((d.daily / maxQ) * 100).toFixed(1);
            barsQ += '<div class="m5-bar-group"><div class="m5-bar-pair" style="height:180px">'
                + '<div class="m5-bar ' + (typeCls[d.type] || 'actual') + '" style="height:' + h + '%"><span class="m5-bar-val">' + d.daily + '</span></div>'
                + '</div><div class="m5-bar-label">' + d.quarter + '</div></div>';
        });
        chartQ.innerHTML = '<div class="m5-bars-row">' + barsQ + '</div>';
    }

    // 4. Inventory stacked bar chart + 5. Pie charts (below quarterly)
    // Add a new container after quarterly chart
    var parentSection = document.getElementById('sectionProjectData');
    if (parentSection && data.inventory) {
        // Remove old inventory/pie containers if any
        var oldInv = document.getElementById('m5InventoryArea');
        if (oldInv) oldInv.remove();

        var invHtml = '<div id="m5InventoryArea" style="margin-top:20px">';
        // Inventory stacked bar
        invHtml += '<div class="chart-container"><h4 class="chart-title">\u7248\u6743\u5e93\u5b58\u603b\u89c8</h4>';
        invHtml += '<div class="m5-chart-legend"><span class="m5-legend-item"><span class="m5-legend-dot" style="background:#3b82f6"></span>\u5df2\u6388\u6743</span>'
            + '<span class="m5-legend-item"><span class="m5-legend-dot" style="background:#d1d5db"></span>\u672a\u6388\u6743\u50a8\u5907</span>'
            + '<span class="m5-legend-item"><span class="m5-legend-dot" style="background:transparent;border:1px dashed #ee3f4d"></span>\u5b89\u5168\u7ebf ' + safetyLine + '</span></div>';
        var maxInv = 0;
        data.inventory.forEach(function(d) { var t = d.authorized + d.reserve; if (t > maxInv) maxInv = t; });
        maxInv = Math.max(maxInv, safetyLine) * 1.15;
        var safeInvPos = ((safetyLine / maxInv) * 100).toFixed(1);
        invHtml += '<div class="m5-chart-area" style="position:relative">'
            + '<div class="m5-safety-line" style="bottom:' + safeInvPos + '%"><span>' + safetyLine + '</span></div>'
            + '<div class="m5-bars-row">';
        data.inventory.forEach(function(d) {
            var hAuth = ((d.authorized / maxInv) * 100).toFixed(1);
            var hRes = ((d.reserve / maxInv) * 100).toFixed(1);
            invHtml += '<div class="m5-bar-group"><div class="m5-stacked-bar" style="height:200px">'
                + '<div class="m5-stack reserve" style="height:' + hRes + '%"><span class="m5-bar-val" style="color:#666">' + d.reserve + '</span></div>'
                + '<div class="m5-stack auth" style="height:' + hAuth + '%"><span class="m5-bar-val">' + d.authorized + '</span></div>'
                + '</div><div class="m5-bar-label">' + d.category + '</div></div>';
        });
        invHtml += '</div></div></div>';

        // Pie charts row
        invHtml += '<div style="display:flex;gap:24px;margin-top:20px">';
        // Pie 1: Authorized breakdown
        var ab = data.authorizedBreakdown || {};
        var abTotal = (ab.authorized || 0) + (ab.newHot || 0) + (ab.needSupplement || 0);
        if (abTotal > 0) {
            var p1 = ((ab.authorized / abTotal) * 100).toFixed(1);
            var p2 = ((ab.newHot / abTotal) * 100).toFixed(1);
            var p3 = ((ab.needSupplement / abTotal) * 100).toFixed(1);
            var grad1 = 'conic-gradient(#3b82f6 0% ' + p1 + '%, #93c5fd ' + p1 + '% ' + (parseFloat(p1) + parseFloat(p2)).toFixed(1) + '%, #f59e0b ' + (parseFloat(p1) + parseFloat(p2)).toFixed(1) + '% 100%)';
            invHtml += '<div class="chart-container" style="flex:1"><h4 class="chart-title">\u5df2\u6388\u6743\u6784\u6210</h4>'
                + '<div style="display:flex;align-items:center;gap:24px;padding:16px">'
                + '<div style="width:120px;height:120px;border-radius:50%;background:' + grad1 + '"></div>'
                + '<div style="font-size:12px;display:flex;flex-direction:column;gap:6px">'
                + '<div><span class="m5-legend-dot" style="background:#3b82f6"></span> \u5df2\u6388\u6743 ' + ab.authorized + ' (' + p1 + '%)</div>'
                + '<div><span class="m5-legend-dot" style="background:#93c5fd"></span> \u65b0\u70ed ' + ab.newHot + ' (' + p2 + '%)</div>'
                + '<div><span class="m5-legend-dot" style="background:#f59e0b"></span> \u9700\u8865\u51fd ' + ab.needSupplement + ' (' + p3 + '%)</div>'
                + '</div></div></div>';
        }
        // Pie 2: Reserve breakdown
        var rb = data.reserveBreakdown || {};
        var rbTotal = (rb.reviewed || 0) + (rb.needSupplement || 0) + (rb.available || 0) + (rb.defect || 0);
        if (rbTotal > 0) {
            var rp1 = ((rb.reviewed / rbTotal) * 100).toFixed(1);
            var rp2 = ((rb.needSupplement / rbTotal) * 100).toFixed(1);
            var rp3 = ((rb.available / rbTotal) * 100).toFixed(1);
            var rp4 = ((rb.defect / rbTotal) * 100).toFixed(1);
            var c1 = parseFloat(rp1);
            var c2 = c1 + parseFloat(rp2);
            var c3 = c2 + parseFloat(rp3);
            var grad2 = 'conic-gradient(#22c55e 0% ' + c1.toFixed(1) + '%, #f59e0b ' + c1.toFixed(1) + '% ' + c2.toFixed(1) + '%, #a855f7 ' + c2.toFixed(1) + '% ' + c3.toFixed(1) + '%, #ef4444 ' + c3.toFixed(1) + '% 100%)';
            invHtml += '<div class="chart-container" style="flex:1"><h4 class="chart-title">\u672a\u6388\u6743\u50a8\u5907\u6784\u6210</h4>'
                + '<div style="display:flex;align-items:center;gap:24px;padding:16px">'
                + '<div style="width:120px;height:120px;border-radius:50%;background:' + grad2 + '"></div>'
                + '<div style="font-size:12px;display:flex;flex-direction:column;gap:6px">'
                + '<div><span class="m5-legend-dot" style="background:#22c55e"></span> \u5df2\u590d\u6838 ' + rb.reviewed + ' (' + rp1 + '%)</div>'
                + '<div><span class="m5-legend-dot" style="background:#f59e0b"></span> \u9700\u8865\u51fd ' + rb.needSupplement + ' (' + rp2 + '%)</div>'
                + '<div><span class="m5-legend-dot" style="background:#a855f7"></span> \u53ef\u7528 ' + rb.available + ' (' + rp3 + '%)</div>'
                + '<div><span class="m5-legend-dot" style="background:#ef4444"></span> \u6743\u5229\u7455\u75b5 ' + rb.defect + ' (' + rp4 + '%)</div>'
                + '</div></div></div>';
        }
        invHtml += '</div></div>';
        parentSection.insertAdjacentHTML('beforeend', invHtml);
    }
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
 * 授权明细 - M4 Tab A 状态
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
    tabAFilters = { ks_auth_id: '', cid: '', copyright_id: '', play_name: '', play_category: '', auth_start: '', auth_end: '', hot_level: '', xwq_status: '', keyword: '' };
    authDetailCurrentPage = 1;
    renderTabAContent();
}

// ── M4 Tab A 授权片单 ──────────────────────────────────────

const COPYRIGHT_STATUS_MAP = {
  'authorized': '已授权',
  'authorized_new_hot': '已授权-新热',
  'authorized_need_supplement': '已授权-需补确认函',
  'reviewed': '已复核',
  'need_supplement': '需补确认函',
  'available': '可用',
  'defect': '权利瑕疵'
};

let tabAFilters = { ks_auth_id: '', cid: '', copyright_id: '', play_name: '', play_category: '', auth_start: '', auth_end: '', hot_level: '', xwq_status: '', keyword: '' };

function filterTabAItems() {
  return currentAuthDetails.filter(item => {
    // 文本字段：支持多条逗号分隔，OR 逻辑（匹配任一条即命中）
    if (tabAFilters.ks_auth_id) {
      const terms = tabAFilters.ks_auth_id.split(/[,，]/).map(s => s.trim().toLowerCase()).filter(Boolean);
      if (!terms.some(t => (item.ks_auth_id || '').toLowerCase().includes(t))) return false;
    }
    if (tabAFilters.cid) {
      const terms = tabAFilters.cid.split(/[,，]/).map(s => s.trim().toLowerCase()).filter(Boolean);
      if (!terms.some(t => (item.main_cid || '').toLowerCase().includes(t))) return false;
    }
    if (tabAFilters.copyright_id) {
      const terms = tabAFilters.copyright_id.split(/[,，]/).map(s => s.trim().toLowerCase()).filter(Boolean);
      if (!terms.some(t => (item.copyright_id || '').toLowerCase().includes(t))) return false;
    }
    if (tabAFilters.play_name) {
      const terms = tabAFilters.play_name.split(/[,，]/).map(s => s.trim().toLowerCase()).filter(Boolean);
      if (!terms.some(t => (item.play_name || '').toLowerCase().includes(t) || (item.play_name_alias || '').toLowerCase().includes(t))) return false;
    }
    if (tabAFilters.play_category && getPlayCategoryLabel(item.play_category) !== tabAFilters.play_category) return false;
    if (tabAFilters.hot_level && (item.hot_level || '') !== tabAFilters.hot_level) return false;
    if (tabAFilters.xwq_status && (item.xwq_status || '') !== tabAFilters.xwq_status) return false;
    if (tabAFilters.auth_start && item.auth_start_date < tabAFilters.auth_start) return false;
    if (tabAFilters.auth_end && item.auth_end_date > tabAFilters.auth_end) return false;
    return true;
  });
}

function renderTabAContent() {
  const container = document.getElementById('authDetailTable');
  if (!container) return;

  const filtered = filterTabAItems();
  const totalPages = Math.max(1, Math.ceil(filtered.length / AUTH_DETAIL_PAGE_SIZE));
  if (authDetailCurrentPage > totalPages) authDetailCurrentPage = totalPages;
  if (authDetailCurrentPage < 1) authDetailCurrentPage = 1;
  const startIdx = (authDetailCurrentPage - 1) * AUTH_DETAIL_PAGE_SIZE;
  const pageData = filtered.slice(startIdx, startIdx + AUTH_DETAIL_PAGE_SIZE);

  container.innerHTML = `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:16px">
      <div style="display:flex;flex-wrap:wrap;gap:12px 16px">
        <div class="rr-filter-group-v2">
          <label>快手ID</label>
          <input type="text" class="rr-filter-sel" id="tabAFilterKsId" placeholder="多条用逗号分隔" value="${tabAFilters.ks_auth_id}" style="width:140px">
        </div>
        <div class="rr-filter-group-v2">
          <label>CID</label>
          <input type="text" class="rr-filter-sel" id="tabAFilterCid" placeholder="多条用逗号分隔" value="${tabAFilters.cid}" style="width:140px">
        </div>
        <div class="rr-filter-group-v2">
          <label>版权ID</label>
          <input type="text" class="rr-filter-sel" id="tabAFilterBqid" placeholder="多条用逗号分隔" value="${tabAFilters.copyright_id}" style="width:140px">
        </div>
        <div class="rr-filter-group-v2">
          <label>作品名称</label>
          <input type="text" class="rr-filter-sel" id="tabAFilterName" placeholder="输入名称或别名搜索" value="${tabAFilters.play_name}" style="width:160px">
        </div>
        <div class="rr-filter-group-v2">
          <label>作品类型</label>
          <select class="rr-filter-sel" id="tabAFilterCategory">
            <option value="">全部</option>
            ${CATEGORY_FILTER_OPTIONS.map(c => `<option value="${c}" ${tabAFilters.play_category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="rr-filter-group-v2" style="min-width:300px">
          <label>授权起止时间</label>
          <div class="date-range-inline">
            <input type="date" class="rr-filter-sel" id="tabAFilterStart" value="${tabAFilters.auth_start}" min="${(currentDetailProject||{}).auth_window_start||''}" max="${(currentDetailProject||{}).auth_window_end||''}" style="width:130px">
            <span style="color:#999;font-size:12px">至</span>
            <input type="date" class="rr-filter-sel" id="tabAFilterEnd" value="${tabAFilters.auth_end}" min="${(currentDetailProject||{}).auth_window_start||''}" max="${(currentDetailProject||{}).auth_window_end||''}" style="width:130px">
          </div>
        </div>
        <div class="rr-filter-group-v2">
          <label>IP等级</label>
          <select class="rr-filter-sel" id="tabAFilterHot">
            <option value="">全部</option>
            <option value="S" ${tabAFilters.hot_level==='S'?'selected':''}>S</option>
            <option value="A" ${tabAFilters.hot_level==='A'?'selected':''}>A</option>
            <option value="B" ${tabAFilters.hot_level==='B'?'selected':''}>B</option>
            <option value="C" ${tabAFilters.hot_level==='C'?'selected':''}>C</option>
          </select>
        </div>
        <div class="rr-filter-group-v2">
          <label>二创信网权状态</label>
          <select class="rr-filter-sel" id="tabAFilterXwq">
            <option value="">全部</option>
            <option value="生效中" ${tabAFilters.xwq_status==='生效中'?'selected':''}>生效中</option>
            <option value="已失效" ${tabAFilters.xwq_status==='已失效'?'selected':''}>已失效</option>
            <option value="未知" ${tabAFilters.xwq_status==='未知'?'selected':''}>未知</option>
          </select>
        </div>
      </div>
    </div>
    ${filtered.length === 0 ? `
      <div class="auth-detail-empty" style="padding:60px 0;text-align:center;color:#999">
        <p>${currentAuthDetails.length === 0 ? '暂无授权记录' : '暂无匹配数据'}</p>
      </div>
    ` : `
    <div class="rr-table-wrap" style="overflow-x:auto">
      <table class="rr-table" style="min-width:1600px">
        <thead>
          <tr>
            <th>快手ID</th>
            <th>作品名称</th>
            <th>别名</th>
            <th>版权ID</th>
            <th>二创权益ID</th>
            <th>品类</th>
            <th>授权开始</th>
            <th>授权结束</th>
            <th>二创信网权状态</th>
            <th>正片在线状态</th>
            <th>首正片上架时间</th>
            <th>OTT</th>
            <th>IP等级</th>
            <th>回收状态</th>
            <th>回收原因</th>
            <th>最新操作</th>
            <th>授权详情</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${pageData.map(item => {
            const isRecovered = item.recovery_status === 'recovered';
            const hotColors = {'S':'#fef2f2','A':'#fff7ed','B':'#f0fdf4','C':'#f5f3ff'};
            const hotTextColors = {'S':'#991b1b','A':'#9a3412','B':'#166534','C':'#5b21b6'};
            return `
              <tr>
                <td class="rr-td-mono">${item.ks_auth_id || '-'}</td>
                <td><div class="rr-td-name">${item.play_name}</div></td>
                <td style="font-size:11px;color:#666">${item.play_name_alias || '-'}</td>
                <td class="rr-td-mono">${item.copyright_id}</td>
                <td><a href="javascript:void(0)" onclick="showRightsIdModal('${item.rights_id || 'RID-' + item.copyright_id}')" style="color:#2563eb;cursor:pointer;font-size:11px;text-decoration:underline">${item.rights_id || 'RID-' + item.copyright_id}</a></td>
                <td>${getPlayCategoryLabel(item.play_category)}</td>
                <td style="font-size:11px">${item.auth_start_date || '-'}</td>
                <td style="font-size:11px">${item.auth_end_date || '-'}</td>
                <td style="font-size:11px">${item.xwq_status || '-'}</td>
                <td style="font-size:11px">${item.online_status || '-'}</td>
                <td style="font-size:11px">${item.first_online_date || '-'}</td>
                <td style="font-size:11px">${item.ott_available || '-'}</td>
                <td><span style="background:${hotColors[item.hot_level]||'#f9fafb'};color:${hotTextColors[item.hot_level]||'#666'};padding:1px 6px;border-radius:4px;font-weight:500;font-size:11px">${item.hot_level || '-'}</span></td>
                <td style="font-size:11px">${isRecovered ? '已回收' : '-'}</td>
                <td style="font-size:11px">${item.recovery_reason || '-'}</td>
                <td style="font-size:11px">${item.updated_at || '-'}</td>
                <td>${(function(){
                  var rd = (currentDetailProject && currentDetailProject.detail && currentDetailProject.detail.reauthData) ? currentDetailProject.detail.reauthData[item.copyright_id] : null;
                  var reauthDone = rd && rd.currentStatus === 'authorized';
                  if (reauthDone) {
                    return '<button class="rr-btn-view" onclick="openReauthFromTabA(\'' + item.copyright_id + '\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> \u67e5\u770b\u8be6\u60c5</button>';
                  } else {
                    return '<button class="rr-btn-view" onclick="showAuthDetailModal(\'' + (item.audit_id || 'AUD-' + item.copyright_id) + '\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> \u67e5\u770b\u8be6\u60c5</button>';
                  }
                }())}</td>
                <td>${(function(){
                  var rd = (currentDetailProject && currentDetailProject.detail && currentDetailProject.detail.reauthData) ? currentDetailProject.detail.reauthData[item.copyright_id] : null;
                  var reauthDone = rd && rd.currentStatus === 'authorized';
                  var reauthInProgress = rd && (rd.currentStatus === 'group_confirm' || rd.currentStatus === 'pending_supplement');
                  if (reauthDone) return '';
                  if (reauthInProgress) return '<button class="rr-btn-view" style="color:#006eff" onclick="openReauthFromTabA(\'' + item.copyright_id + '\')">' + '\u7ee7\u7eed\u91cd\u6388\u6743' + '</button>';
                  if (isRecovered) return '<button class="rr-btn-view" onclick="openReauthFromTabA(\'' + item.copyright_id + '\')">' + '\u53d1\u8d77\u91cd\u65b0\u6388\u6743' + '</button>';
                  return '';
                }())}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    ${totalPages > 1 ? `
      <div class="rr-pagination-v2">
        <button class="rr-page-btn" ${authDetailCurrentPage <= 1 ? 'disabled' : ''} onclick="tabAPage(${authDetailCurrentPage - 1})">${SVG.chevronLeft}</button>
        ${Array.from({length: totalPages}, (_, i) => `<button class="rr-page-btn ${i + 1 === authDetailCurrentPage ? 'active' : ''}" onclick="tabAPage(${i + 1})">${i + 1}</button>`).join('')}
        <button class="rr-page-btn" ${authDetailCurrentPage >= totalPages ? 'disabled' : ''} onclick="tabAPage(${authDetailCurrentPage + 1})">${SVG.chevronRight}</button>
        <span class="rr-page-info-v2">共 ${filtered.length} 条</span>
      </div>
    ` : `<div class="rr-pagination-info">共 ${filtered.length} 条</div>`}
    `}
  `;

  // 绑定筛选事件
  bindTabAFilterEvents();

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function showRightsIdModal(rightsId) {
  showSystemModal('跳转提示', '将跳转至琅琊阁权益信息详情页\n\n路径：琅琊阁 → 权益管理 → 权益详情 → ' + rightsId, 'info');
}

function showAuthDetailModal(auditId) {
  showSystemModal('授权详情跳转', '将跳转至该作品的授权审查单详情页\n\n审核ID：' + auditId + '\n路径：授权管理 → 授权审查 → 审查详情', 'info');
}

function tabAPage(page) {
  authDetailCurrentPage = page;
  renderTabAContent();
}

function bindTabAFilterEvents() {
  const bind = (id, key, isInput) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (isInput) {
      let d; el.oninput = function() { clearTimeout(d); d = setTimeout(() => { tabAFilters[key] = this.value; authDetailCurrentPage = 1; renderTabAContent(); }, 300); };
    } else {
      el.onchange = function() { tabAFilters[key] = this.value; authDetailCurrentPage = 1; renderTabAContent(); };
    }
  };
  bind('tabAFilterKsId', 'ks_auth_id', true);
  bind('tabAFilterCid', 'cid', true);
  bind('tabAFilterBqid', 'copyright_id', true);
  bind('tabAFilterName', 'play_name', true);
  bind('tabAFilterCategory', 'play_category', false);
  bind('tabAFilterStart', 'auth_start', false);
  bind('tabAFilterEnd', 'auth_end', false);
  bind('tabAFilterHot', 'hot_level', false);
  bind('tabAFilterXwq', 'xwq_status', false);
  bind('tabAFilterKeyword', 'keyword', true);
}

// ========== M4 Tab A: Export dropdown & custom export modal ==========
// NOTE(backend): \u5bfc\u51fa\u5b57\u6bb5\u914d\u7f6e\u9009\u62e9\u8303\u56f4\u6765\u6e90\u63a5\u7405\u7430\u9601\u5b57\u6bb5\u5e93

var _multiSelectState = {};

var COPYRIGHT_EXPORT_FIELDS = [
  '\u4e0b\u7ebf\u65b9\u5f0f', '\u540c\u4e3bCID\u4e0b\u8fc7\u671f\u7684\u7248\u6743', '\u540c\u4e3bCID\u4e0b\u5168\u90e8\u547d\u4e2d\u7684\u5c01\u88c5\u6743\u76ca',
  '\u5bfc\u6f14', '\u7248\u6743\u5728\u67b6\u72b6\u6001', '\u6700\u5927\u6388\u6743\u7ed3\u675f\u65f6\u95f4', '\u7248\u6743\u65b9', '\u7248\u6743\u65b9-\u81ea\u52a8\u8ba1\u7b97',
  '\u9996\u6b63\u7247\u4e0a\u67b6\u65f6\u95f4', '\u6b63\u7247\u4e0a\u67b6\u6570\u91cf', '\u5206\u9500\u72b6\u6001', '\u6b63\u7247\u4e0b\u67b6\u65f6\u95f4'
];
var RIGHTS_EXPORT_FIELDS = [
  '\u6743\u76ca\u72b6\u6001', '\u6743\u76ca\u751f\u6548\u65f6\u95f4', '\u6743\u76ca\u5931\u6548\u65f6\u95f4', '\u6388\u6743\u5e73\u53f0',
  '\u6392\u9664\u5e73\u53f0', '\u662f\u5426\u72ec\u5bb6', '\u4fe1\u7f51\u6743\u72b6\u6001', '\u4e8c\u521b\u5408\u540c\u53f7',
  '\u6743\u76ca\u521b\u5efa\u65f6\u95f4', '\u6743\u76ca\u66f4\u65b0\u65f6\u95f4', '\u5f15\u5165\u6743\u76ca\u6765\u6e90', '\u6743\u76ca\u5907\u6ce8'
];

function toggleExportDropdown() {
  var menu = document.getElementById('tabAExportDropdownMenu');
  if (!menu) return;
  var isVisible = menu.style.display !== 'none';
  menu.style.display = isVisible ? 'none' : 'block';
  if (!isVisible) {
    setTimeout(function() {
      document.addEventListener('click', _closeExportDropdown, { once: true });
    }, 0);
  }
}
function _closeExportDropdown(e) {
  var dd = document.getElementById('tabAExportDropdown');
  if (dd && !dd.contains(e.target)) {
    var menu = document.getElementById('tabAExportDropdownMenu');
    if (menu) menu.style.display = 'none';
  } else {
    var menu = document.getElementById('tabAExportDropdownMenu');
    if (menu) menu.style.display = 'none';
  }
}

function doExport(type) {
  var menu = document.getElementById('tabAExportDropdownMenu');
  if (menu) menu.style.display = 'none';
  var taskName = '';
  if (type === 'reconciliation') {
    taskName = '\u4e8c\u521b\u6388\u6743-\u5bf9\u8d26\u660e\u7ec6\u8868\u5bfc\u51fa';
  } else if (type === 'rights_import') {
    taskName = '\u4e8c\u521b\u6388\u6743-\u5f15\u5165\u6743\u76ca\u4fe1\u606f\u5bfc\u51fa';
  }
  if (typeof addExportTask === 'function') {
    addExportTask(taskName, '\u4e8c\u521b\u6388\u6743\u7247\u5355');
    showSystemModal('\u5bfc\u51fa\u4efb\u52a1\u5df2\u63d0\u4ea4', '\u8bf7\u524d\u5f80\u5bfc\u51fa\u4e2d\u5fc3\u67e5\u770b', 'info');
  } else {
    showSystemModal('\u5bfc\u51fa\u6210\u529f', '\u5df2\u6210\u529f\u5bfc\u51fa\u300c' + taskName + '\u300d\uff08mock\uff09', 'success');
  }
}

function _buildMultiSelectHtml(id, options, label) {
  _multiSelectState[id] = _multiSelectState[id] || [];
  var selVals = _multiSelectState[id];
  var tags = selVals.map(function(v) {
    return '<span class="multi-select-tag">' + v + ' <span class="tag-remove" onclick="removeMultiTag(event,\'' + id + '\',\'' + v.replace(/'/g,"\\'") + '\')">\u00d7</span></span>';
  }).join('');
  var opts = options.map(function(o) {
    var sel = selVals.indexOf(o) >= 0 ? ' selected' : '';
    return '<div class="multi-select-option' + sel + '" onclick="toggleMultiOption(\'' + id + '\',\'' + o.replace(/'/g,"\\'") + '\')">'
      + '<span>' + o + '</span>'
      + '<svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
      + '</div>';
  }).join('');
  return '<div class="custom-export-label">' + label + '</div>'
    + '<div class="multi-select-dropdown" id="' + id + '">'
    + '<div class="multi-select-input" onclick="toggleMultiSelect(\'' + id + '\')">'
    + tags
    + '<input class="multi-select-search" placeholder="\u9009\u62e9\u5b57\u6bb5..." readonly>'
    + '</div>'
    + '<div class="multi-select-list" style="display:none">'
    + opts
    + '</div>'
    + '</div>';
}

function toggleMultiSelect(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  var list = container.querySelector('.multi-select-list');
  if (!list) return;
  var isOpen = list.style.display !== 'none';
  list.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    setTimeout(function() {
      document.addEventListener('click', function handler(e) {
        if (!container.contains(e.target)) {
          list.style.display = 'none';
          document.removeEventListener('click', handler);
        }
      });
    }, 0);
  }
}

function toggleMultiOption(containerId, value) {
  var arr = _multiSelectState[containerId] || [];
  var idx = arr.indexOf(value);
  if (idx >= 0) { arr.splice(idx, 1); } else { arr.push(value); }
  _multiSelectState[containerId] = arr;
  _refreshMultiSelect(containerId);
}

function removeMultiTag(event, containerId, value) {
  event.stopPropagation();
  var arr = _multiSelectState[containerId] || [];
  var idx = arr.indexOf(value);
  if (idx >= 0) arr.splice(idx, 1);
  _multiSelectState[containerId] = arr;
  _refreshMultiSelect(containerId);
}

function _refreshMultiSelect(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  var selVals = _multiSelectState[containerId] || [];
  var inputDiv = container.querySelector('.multi-select-input');
  if (inputDiv) {
    var tags = selVals.map(function(v) {
      return '<span class="multi-select-tag">' + v + ' <span class="tag-remove" onclick="removeMultiTag(event,\'' + containerId + '\',\'' + v.replace(/'/g,"\\'") + '\')">\u00d7</span></span>';
    }).join('');
    inputDiv.innerHTML = tags + '<input class="multi-select-search" placeholder="\u9009\u62e9\u5b57\u6bb5..." readonly>';
  }
  container.querySelectorAll('.multi-select-option').forEach(function(opt) {
    var text = opt.querySelector('span').textContent;
    if (selVals.indexOf(text) >= 0) { opt.classList.add('selected'); } else { opt.classList.remove('selected'); }
  });
}

function getMultiSelectValues(containerId) {
  return (_multiSelectState[containerId] || []).slice();
}

function openCustomExportModal() {
  var menu = document.getElementById('tabAExportDropdownMenu');
  if (menu) menu.style.display = 'none';
  _multiSelectState = {};
  var overlay = document.createElement('div');
  overlay.className = 'custom-export-overlay';
  overlay.id = 'customExportOverlay';

  var modeAFields = _buildMultiSelectHtml('ceFieldCopyrightA', COPYRIGHT_EXPORT_FIELDS, '\u7248\u6743\u8f93\u51fa\u5b57\u6bb5\uff1a')
    + _buildMultiSelectHtml('ceFieldRightsA', RIGHTS_EXPORT_FIELDS, '\u6743\u76ca\u8f93\u51fa\u5b57\u6bb5\uff1a');

  var modeBFields = '<div class="custom-export-sub-row">'
    + '<span style="font-size:13px;white-space:nowrap">\u9009\u62e9\u67e5\u8be2\u8f93\u5165\u5b57\u6bb5\uff1a</span>'
    + '<select id="ceQueryField" onchange="onCeQueryFieldChange()" style="flex:1">'
    + '<option value="">\u8bf7\u9009\u62e9</option>'
    + '<option value="copyright_id">\u7248\u6743ID</option>'
    + '<option value="ks_auth_id">\u5feb\u624bID</option>'
    + '<option value="rights_id">\u4e8c\u521b\u6743\u76caID</option>'
    + '<option value="contract_no">\u4e8c\u521b\u6743\u76ca\u5408\u540c\u53f7</option>'
    + '</select>'
    + '</div>'
    + '<div class="custom-export-sub-row">'
    + '<button class="custom-export-btn-upload" onclick="showSystemModal(\'\u4e0a\u4f20\u67e5\u8be2\u6a21\u677f\',\'\u5df2\u4e0a\u4f20\u67e5\u8be2\u6a21\u677f\uff08mock\uff09\',\'success\')">\u4e0a\u4f20\u67e5\u8be2\u6a21\u677f</button>'
    + '<button class="custom-export-btn-download" id="ceBtnDownloadTpl" disabled onclick="showSystemModal(\'\u4e0b\u8f7d\u6a21\u677f\',\'\u5df2\u4e0b\u8f7d\u67e5\u8be2\u6a21\u677f\uff08mock\uff09\',\'success\')">\u4e0b\u8f7d\u67e5\u8be2\u6a21\u677f</button>'
    + '</div>'
    + _buildMultiSelectHtml('ceFieldCopyrightB', COPYRIGHT_EXPORT_FIELDS, '\u7248\u6743\u8f93\u51fa\u5b57\u6bb5\uff1a')
    + _buildMultiSelectHtml('ceFieldRightsB', RIGHTS_EXPORT_FIELDS, '\u6743\u76ca\u8f93\u51fa\u5b57\u6bb5\uff1a');

  overlay.innerHTML = '<div class="custom-export-modal">'
    + '<div class="custom-export-header">'
    + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#006eff" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
    + '\u6388\u6743\u7247\u5355\u81ea\u5b9a\u4e49\u5bfc\u51fa'
    + '</div>'
    + '<div class="custom-export-body">'
    + '<div class="custom-export-section">'
    + '<div class="custom-export-label">\u5bfc\u51fa\u65b9\u5f0f</div>'
    + '<div class="custom-export-radio-group">'
    + '<label class="custom-export-radio-item active" onclick="switchCeMode(\'filter\')">'
    + '<input type="radio" name="ceMode" value="filter" checked> \u5bfc\u51fa\u7b5b\u9009\u8303\u56f4\u6570\u636e'
    + '</label>'
    + '<label class="custom-export-radio-item" onclick="switchCeMode(\'query\')">'
    + '<input type="radio" name="ceMode" value="query"> \u6839\u636e\u5bfc\u5165\u5b57\u6bb5\u67e5\u627e\u5bfc\u51fa'
    + '</label>'
    + '</div>'
    + '</div>'
    + '<div id="ceModeFilterArea" class="custom-export-sub-area">' + modeAFields + '</div>'
    + '<div id="ceModeQueryArea" class="custom-export-sub-area" style="display:none">' + modeBFields + '</div>'
    + '</div>'
    + '<div class="custom-export-footer">'
    + '<button class="system-modal-btn" onclick="document.getElementById(\'customExportOverlay\').remove()">\u53d6\u6d88</button>'
    + '<button class="system-modal-btn system-modal-btn-primary" onclick="confirmCustomExport()">\u786e\u8ba4\u5bfc\u51fa</button>'
    + '</div>'
    + '</div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
}

function switchCeMode(mode) {
  var filterArea = document.getElementById('ceModeFilterArea');
  var queryArea = document.getElementById('ceModeQueryArea');
  if (filterArea) filterArea.style.display = mode === 'filter' ? 'block' : 'none';
  if (queryArea) queryArea.style.display = mode === 'query' ? 'block' : 'none';
  document.querySelectorAll('.custom-export-radio-item').forEach(function(el) {
    var radio = el.querySelector('input[type="radio"]');
    if (radio && radio.value === mode) { el.classList.add('active'); radio.checked = true; }
    else { el.classList.remove('active'); }
  });
}

function onCeQueryFieldChange() {
  var sel = document.getElementById('ceQueryField');
  var btn = document.getElementById('ceBtnDownloadTpl');
  if (btn) btn.disabled = !(sel && sel.value);
}

function confirmCustomExport() {
  var modeRadio = document.querySelector('input[name="ceMode"]:checked');
  var mode = modeRadio ? modeRadio.value : 'filter';
  var copyrightFields, rightsFields;
  if (mode === 'filter') {
    copyrightFields = getMultiSelectValues('ceFieldCopyrightA');
    rightsFields = getMultiSelectValues('ceFieldRightsA');
  } else {
    copyrightFields = getMultiSelectValues('ceFieldCopyrightB');
    rightsFields = getMultiSelectValues('ceFieldRightsB');
  }
  var overlay = document.getElementById('customExportOverlay');
  if (overlay) overlay.remove();
  var taskName = '\u4e8c\u521b\u6388\u6743-\u6388\u6743\u7247\u5355\u81ea\u5b9a\u4e49\u5bfc\u51fa';
  if (typeof addExportTask === 'function') {
    addExportTask(taskName, '\u4e8c\u521b\u6388\u6743\u7247\u5355');
    showSystemModal('\u5bfc\u51fa\u4efb\u52a1\u5df2\u63d0\u4ea4', '\u8bf7\u524d\u5f80\u5bfc\u51fa\u4e2d\u5fc3\u67e5\u770b', 'info');
  } else {
    var msg = '\u5bfc\u51fa\u65b9\u5f0f\uff1a' + (mode === 'filter' ? '\u7b5b\u9009\u8303\u56f4\u6570\u636e' : '\u5bfc\u5165\u5b57\u6bb5\u67e5\u627e') + '\n'
      + '\u7248\u6743\u5b57\u6bb5\uff1a' + (copyrightFields.length > 0 ? copyrightFields.join('\u3001') : '\u672a\u9009\u62e9') + '\n'
      + '\u6743\u76ca\u5b57\u6bb5\uff1a' + (rightsFields.length > 0 ? rightsFields.join('\u3001') : '\u672a\u9009\u62e9');
    showSystemModal('\u5bfc\u51fa\u6210\u529f', msg + '\n\n\uff08mock\uff09', 'success');
  }
}

// Legacy alias
function openTabAExportModal() { openCustomExportModal(); }

function openReauthFromTabA(copyrightId) {
  // M9 三级页：跳转至重新授权页面
  if (typeof openReauthPage === 'function') {
    openReauthPage(copyrightId);
  } else {
    showSystemModal('发起重新授权', '已为版权ID ' + copyrightId + ' 发起重新授权流程（mock）。', 'info');
  }
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
            ? `<button class="rr-btn-submit" onclick="if(createProjectStep===1&&!createProjectData.rights_type){showSystemModal('提示','请选择权利类型','warning');return;}createProjectStep++;renderCreateProjectModal()">下一步</button>`
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
  '1': '电视剧',
  '2': '电影',
  '3': '综艺',
  '4': '动漫',
  '5': '纪录片',
  '6': '少儿',
  '9': '微短剧',
  '10': '音乐'
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
  'risk_review': '风险审查'
};

const CHANGE_TYPE_MAP = {
  'null': '暂无变动',
  'defect_reaudit': '新增瑕疵重审',
  'distribution_conflict': '已授权分销冲突',
  'new_defect': '已授权新增瑕疵'
};

// 任务类型显示名（仅 task_type）
function getTaskTypeLabel(taskType, changeType) {
  return TASK_TYPE_MAP[taskType] || taskType || '-';
}

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
function getFlowStepsByTaskType(taskType, changeType) {
  // 正交化：risk_review 都是 2 步，authorization_review 都是 3 步
  if (taskType === 'risk_review') {
    return [
      { key: 'rights_first_review', label: '初审', reviewByField: 'rights_first_review_by', reviewAtField: 'rights_first_review_at' },
      { key: 'rights_second_review', label: '法务判定', reviewByField: 'rights_second_review_by', reviewAtField: 'rights_second_review_at' }
    ]; // 2步
  }
  // authorization_review（含 defect_reaudit）都走 3 步
  return FLOW_STEPS; // 初审→复审→终审（3步）
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
    case 'risk_review': return 'rr-badge-risk';
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
  change_type: '',
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
    // 任务类型筛选（独立维度）
    if (rrFilters.task_type && item.task_type !== rrFilters.task_type) return false;
    // 变动类型筛选（独立维度）
    if (rrFilters.change_type && (item.change_type || 'null') !== rrFilters.change_type) return false;
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
      const allContracts = (item.rights_infos || []).map(r => r.contract_codes || '').join(' ').toLowerCase();
      // 多条合同号用逗号分隔，AND逻辑：必须同时包含所有输入的合同号
      const inputNos = rrFilters.rights_contract_no.split(/[,，]/).map(s => s.trim().toLowerCase()).filter(Boolean);
      if (!inputNos.every(no => allContracts.includes(no))) return false;
    }
    if (rrFilters.keyword) {
      const kw = rrFilters.keyword.toLowerCase();
      const name = (item.play_name || '').toLowerCase();
      const alias = (item.play_name_alias || '').toLowerCase();
      const aid = (item.audit_id || '').toLowerCase();
      const bqid = (item.copyright_id || '').toLowerCase();
      if (!name.includes(kw) && !alias.includes(kw) && !aid.includes(kw) && !bqid.includes(kw)) return false;
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
          <label>待处理权益变动</label>
          <select class="rr-filter-sel" id="rrFilterChangeType">
            <option value="">全部</option>
            ${Object.entries(CHANGE_TYPE_MAP).map(([k,v]) => `<option value="${k}" ${rrFilters.change_type === k ? 'selected' : ''}>${v}</option>`).join('')}
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
        <!-- v1.2 新增筛选 -->
        <div class="rr-filter-group-v2">
          <label>IP等级</label>
          <select class="rr-filter-sel" id="rrFilterHotLevel">
            <option value="">全部</option>
            <option value="S" ${rrFilters.hot_level==='S'?'selected':''}>S</option>
            <option value="A" ${rrFilters.hot_level==='A'?'selected':''}>A</option>
            <option value="B" ${rrFilters.hot_level==='B'?'selected':''}>B</option>
            <option value="C" ${rrFilters.hot_level==='C'?'selected':''}>C</option>
          </select>
        </div>
        <div class="rr-filter-group-v2">
          <label>权益合同号</label>
          <input type="text" class="rr-filter-sel" id="rrFilterContractNo" placeholder="多条用逗号分隔" value="${rrFilters.rights_contract_no || ''}" style="width:180px">
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
        <div class="rr-filter-group-v2 rr-filter-search-v2">
          <label>搜索</label>
          <div class="rr-search-wrap-v2">
            <input type="text" class="rr-search-input-v2" id="rrFilterKeyword" placeholder="作品名/别名/版权ID/审核ID" value="${rrFilters.keyword}">
            <span class="rr-search-icon-v2">${SVG.search}</span>
          </div>
        </div>
      </div>
    </div>
    <!-- 批量操作栏（常显，仅终审） -->
    <div id="rrBatchBar" style="background:#f0f5ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px">
      <span style="font-size:13px;color:#1e40af" id="rrBatchCount">已选 0 条</span>
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
            <th>IP等级</th>
            <th>任务时间</th>
            <th>任务类型</th>
            <th>待处理权益变动</th>
            <th>复审结论</th>
            <th>审核进度</th>
            <th>授权判定</th>
            <th>信网权状态</th>
            <th>正片在线</th>
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
                <td style="font-size:11px">${(() => { const codes = (item.rights_infos || []).map(r => r.contract_codes).filter(Boolean); return codes.length > 0 ? codes.map(c => `<div>${c}</div>`).join('') : '-'; })()}</td>
                <td style="font-size:11px"><span style="background:${{'S':'#fef2f2','A':'#fff7ed','B':'#f0fdf4','C':'#f5f3ff'}[item.cid_info?.hot_level]||'#f9fafb'};color:${{'S':'#991b1b','A':'#9a3412','B':'#166534','C':'#5b21b6'}[item.cid_info?.hot_level]||'#666'};padding:1px 6px;border-radius:4px;font-weight:500">${item.cid_info?.hot_level || '-'}</span></td>
                <td>${formatDate(item.task_time)}</td>
                <td><span class="rr-badge ${getTaskTypeBadgeClass(item.task_type)}">${getTaskTypeLabel(item.task_type, item.change_type)}</span></td>
                <td style="font-size:11px">${CHANGE_TYPE_MAP[item.change_type || 'null'] || '-'}</td>
                <td>${getReviewResultLabel(item.rights_second_review_result) || '-'}</td>
                <td><span class="rr-badge ${getProgressBadgeClass(item.audit_progress)}">${getAuditProgressLabel(item.audit_progress)}</span></td>
                <td>${getAuthJudgment(item)}</td>
                <td style="font-size:11px">${item.xwq_status || '-'}</td>
                <td style="font-size:11px">${item.online_status || '-'}</td>
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
  const selChangeType = document.getElementById('rrFilterChangeType');
  const selProg = document.getElementById('rrFilterProgress');
  const selRes = document.getElementById('rrFilterResult');
  const inputKw = document.getElementById('rrFilterKeyword');

  if (selCat) selCat.onchange = function() { rrFilters.play_category = this.value; rrCurrentPage = 1; renderRightsReviewV2(); };
  if (selType) selType.onchange = function() { rrFilters.task_type = this.value; rrCurrentPage = 1; renderRightsReviewV2(); };
  if (selChangeType) selChangeType.onchange = function() { rrFilters.change_type = this.value; rrCurrentPage = 1; renderRightsReviewV2(); };
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
  const selHot = document.getElementById('rrFilterHotLevel');
  const inputContract = document.getElementById('rrFilterContractNo');
  const selXwq = document.getElementById('rrFilterXwqStatus');
  const selOnline = document.getElementById('rrFilterOnlineStatus');
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
  if (rrSelectedIds.size === 0) { showSystemModal('提示','请先勾选审查单','warning'); return; }
  const selectedItems = rrItems.filter(i => rrSelectedIds.has(i.audit_id));
  const categories = new Set(selectedItems.map(i => i.play_category));
  const progresses = new Set(selectedItems.map(i => i.audit_progress));
  if (categories.size > 1 || progresses.size > 1) {
    showSystemModal('批量操作限制', '批量操作仅支持同品类同进度的审查单，请调整勾选范围。', 'warning');
    return;
  }

  // 复审校验：含多待审权益的作品不支持批量复审
  if (action === '复审') {
    const multiRightsItems = selectedItems.filter(i => (i.import_copr_rights_ids || []).length > 1);
    if (multiRightsItems.length > 0) {
      const names = multiRightsItems.map(i => i.play_name).join('、');
      showSystemModal('不支持批量复审', '以下作品含多条待审权益，授权依据无法默认勾选，不支持批量复审，请逐条审核：\n\n' + names, 'warning');
      return;
    }
  }

  // 终审校验：复审结论为权利瑕疵的作品不支持批量终审（瑕疵处置结论无法统一填写）
  if (action === '终审') {
    const defectItems = selectedItems.filter(i => i.rights_second_review_result === 'rights_defect');
    if (defectItems.length > 0) {
      const names = defectItems.map(i => i.play_name).join('、');
      showSystemModal('不支持批量终审', '以下作品的复审结论为「权利瑕疵」，终审需填写瑕疵处置结论，无法批量统一处理，请逐条审核：\n\n' + names, 'error');
      return;
    }
  }

  const platforms = Object.entries(AUTHORIZED_PLATFORM_MAP).map(([k,v]) => `<label style="display:flex;align-items:center;gap:4px;font-size:12px;${action === '复审' ? 'opacity:0.6;cursor:not-allowed' : ''}"><input type="checkbox" value="${k}" ${action === '复审' && k === 'unspecified' ? 'checked disabled' : (action === '复审' ? 'disabled' : '')}>${v}</label>`).join('');
  const excludePlatforms = Object.entries(EXCLUDED_PLATFORM_MAP).map(([k,v]) => `<label style="display:flex;align-items:center;gap:4px;font-size:12px;${action === '复审' ? 'opacity:0.6;cursor:not-allowed' : ''}"><input type="checkbox" value="${k}" ${action === '复审' && k === 'unspecified' ? 'checked disabled' : (action === '复审' ? 'disabled' : '')}>${v}</label>`).join('');
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
        批量审查将对所选作品的权益统一给出相同判断，包括人审结论、瑕疵类型、瑕疵处置方式、可授权平台、排除平台及复审备注。<strong>审核人需为审核结论承担责任</strong>。<br>批量操作下可授权平台和排除平台固定为「未约定」，不可修改。<br>含多条待审权益的作品不支持批量复审（授权依据无法默认勾选），仅限单待审权益的作品。
      </div>
      <div style="margin-bottom:12px"><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">复审结论 <span style="color:#ef4444">*</span></label>
        <select id="batchReviewResult" style="width:100%;padding:8px;border:1px solid #d0d5dd;border-radius:6px;font-size:12px" onchange="document.getElementById('batchSecondDefectArea').style.display=this.value==='rights_defect'?'':'none'">
          <option value="">请选择</option><option value="rights_available">权利可用</option><option value="rights_defect">权利瑕疵</option>
        </select></div>
      <div style="margin-bottom:12px"><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">授权依据的引入权利</label>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:8px 12px;font-size:12px;color:#166534;line-height:1.6">
          <div>系统将自动选中每条作品唯一的待审引入权益 ID 作为授权依据，无需手动选择。</div>
          <div style="margin-top:4px;color:#15803d;font-size:11px">含多条待审引入权益的作品不支持批量复审，已在前置校验中拦截。</div>
        </div></div>
      <div style="margin-bottom:12px"><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">可授权平台 <span style="color:#ef4444">*</span></label>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:6px 10px;margin-bottom:6px;font-size:11px;color:#1e40af">批量复审模式下，可授权平台和排除平台固定为「未约定」，不可修改。如需指定具体平台，请在单条详情页中逐条审核。</div>
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
      </div>
      <div><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">备注</label>
        <textarea style="width:100%;padding:8px;border:1px solid #d0d5dd;border-radius:6px;font-size:12px;resize:vertical" rows="2" placeholder="可选"></textarea></div>`;
  } else {
    formHTML = `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:#991b1b;line-height:1.6">
        <div style="font-weight:600;margin-bottom:4px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#991b1b" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          批量终审注意事项
        </div>
        批量审查将对所选作品统一给出相同授权判断。<strong>授权起止时间将默认采用系统计算时间，不支持单独修改。</strong>若有特殊授权时间要求，请在单条详情页逐条处理。<br>含复审结论为「权利瑕疵」的作品不支持批量终审（瑕疵处置结论无法统一填写），已在前置校验中拦截。
      </div>
      <div style="margin-bottom:12px"><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">授权判断 <span style="color:#ef4444">*</span></label>
        <select id="batchReviewResult" style="width:100%;padding:8px;border:1px solid #d0d5dd;border-radius:6px;font-size:12px" onchange="document.getElementById('batchThirdPlatformSection').style.display=this.value==='can_authorized'?'':'none'">
          <option value="">请选择</option><option value="can_authorized">可授权</option><option value="not_authorized">不授权</option>
        </select></div>
      <div id="batchThirdPlatformSection" style="display:none">
        <div style="margin-bottom:12px"><label style="font-size:12px;font-weight:500;display:block;margin-bottom:4px">可授权平台 <span style="color:#ef4444">*</span></label>
          <div style="display:flex;gap:12px">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="checkbox" id="batchThirdKs"> 快手</label>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="checkbox" id="batchThirdDy"> 抖音</label>
          </div>
        </div>
      </div>`;
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
  if (!result) { showSystemModal('提示','请选择' + action + '结论','warning'); return; }
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
          <span class="rr-badge ${getTaskTypeBadgeClass(item.task_type)}">${getTaskTypeLabel(item.task_type, item.change_type)}</span>
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
  const isRisk = item.task_type === 'risk_review';

  // ========== 当前流程区（左右分栏） ==========
  let flowHTML = '';
  if (isConfirmed) {
    // 已完成——纵向展示所有节点回显，根据 task_type 动态决定步骤数
    const isRiskFlow = item.task_type === 'risk_review';
    const confirmedNodes = isRiskFlow
      ? [
          renderNodeSummary('版权运营初审', buildFirstReviewDisplay(item, isRisk), item.rights_first_review_by, item.rights_first_review_at),
          renderNodeSummary('法务判定', buildSecondReviewDisplay(item, isRisk), item.rights_second_review_by, item.rights_second_review_at)
        ]
      : [
          renderNodeSummary('版权运营初审', buildFirstReviewDisplay(item, isRisk), item.rights_first_review_by, item.rights_first_review_at),
          renderNodeSummary('法务复审', buildSecondReviewDisplay(item, isRisk), item.rights_second_review_by, item.rights_second_review_at),
          renderNodeSummary('品类运营授权评估', buildThirdReviewDisplay(item), item.rights_third_review_by, item.rights_third_review_at)
        ];
    flowHTML = `
      <div class="rrd-section-card">
        <div class="rrd-section-title">当前流程</div>
        <div style="display:flex;flex-direction:column;gap:16px;padding:16px 20px">
          ${confirmedNodes.join('')}
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
            <span class="rr-form-label">授权判断</span>
            <span class="rr-form-value">${isEditable ? `
              <select class="rr-form-select" id="rrThirdResult">
                <option value="">请选择</option>
                <option value="can_authorized">可授权</option>
                <option value="not_authorized">不授权</option>
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
  if (!result) { showSystemModal('提示','请选择初审结论','warning'); return; }

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

  showSystemModal('提交成功', '初审提交成功，已流转至复审', 'success');
  renderRRDetailV2(rrCurrentDetailItem);
}

function submitSecondReviewV2() {
  if (!rrCurrentDetailItem) return;
  const result = document.getElementById('rrSecondResult')?.value;
  if (!result) { showSystemModal('提示','请选择复审结论','warning'); return; }

  const platforms = Array.from(document.querySelectorAll('.rrSecondPlatform:checked')).map(c => c.value);
  const excludePlatforms = Array.from(document.querySelectorAll('.rrSecondExclude:checked')).map(c => c.value);
  const disposal = document.querySelector('input[name="rrSecondDisposal"]:checked')?.value || '';
  const remark = document.getElementById('rrSecondRemark')?.value || '';
  const importRightsId = document.querySelector('input[name="rrSecondImportRightsId"]:checked')?.value || '';
  const defectTypes = Array.from(document.querySelectorAll('.rrSecondDefect:checked')).map(c => c.value);

  if (!importRightsId) { showSystemModal('提示','请选择授权依据的引入权利','warning'); return; }

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

  showSystemModal('提交成功', '复审提交成功，已流转至运营授权评估', 'success');
  renderRRDetailV2(rrCurrentDetailItem);
}

function submitThirdReviewV2() {
  if (!rrCurrentDetailItem) return;
  const result = document.getElementById('rrThirdResult')?.value;
  if (!result) { showSystemModal('提示','请选择授权判断','warning'); return; }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  if (result === 'can_authorized') {
    const ks = document.getElementById('rrThirdKs')?.checked;
    const dy = document.getElementById('rrThirdDy')?.checked;
    if (!ks && !dy) { showSystemModal('提示','授权时至少选择一个平台','warning'); return; }

    if (ks) {
      const start = document.getElementById('rrThirdKsStart')?.value;
      const end = document.getElementById('rrThirdKsEnd')?.value;
      if (!start || !end) { showSystemModal('提示','请填写快手授权日期','warning'); return; }
      rrCurrentDetailItem.rights_third_review_authorized_platform_kuaishou = 'Y';
      rrCurrentDetailItem.rights_third_review_authorized_platform_kuaishou_start_date = start;
      rrCurrentDetailItem.rights_third_review_authorized_platform_kuaishou_end_date = end;
      rrCurrentDetailItem.export_copr_rights_id_kuaishou = rrCurrentDetailItem.copyright_id + '-exp-ks-' + Date.now();
    }
    if (dy) {
      const start = document.getElementById('rrThirdDyStart')?.value;
      const end = document.getElementById('rrThirdDyEnd')?.value;
      if (!start || !end) { showSystemModal('提示','请填写抖音授权日期','warning'); return; }
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

  showSystemModal('提交成功', result === 'can_authorized' ? '三审提交成功，权益已确认授权' : '三审提交成功，判定为不授权', 'success');
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
              <td><span class="rr-badge ${getTaskTypeBadgeClass(r.task_type)}">${getTaskTypeLabel(r.task_type, r.change_type)}</span></td>
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

// ============================================================
// 自定义系统弹窗（替代 alert）
// ============================================================

function showSystemModal(title, message, type) {
  // type: 'warning'(橙) / 'error'(红) / 'success'(绿) / 'info'(蓝)
  const colors = {
    warning: { bg: '#fffbeb', border: '#fbbf24', icon: '#d97706', title: '#92400e' },
    error: { bg: '#fef2f2', border: '#f87171', icon: '#dc2626', title: '#991b1b' },
    success: { bg: '#f0fdf4', border: '#4ade80', icon: '#16a34a', title: '#166534' },
    info: { bg: '#eff6ff', border: '#60a5fa', icon: '#2563eb', title: '#1e40af' }
  };
  const c = colors[type] || colors.warning;
  const iconSvg = type === 'success'
    ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="' + c.icon + '" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="' + c.icon + '" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

  const existing = document.getElementById('systemModal');
  if (existing) existing.remove();

  const html = `
    <div id="systemModal" style="position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:2000;display:flex;align-items:center;justify-content:center;animation:fadeIn .15s" onclick="if(event.target===this)this.remove()">
      <div style="background:#fff;border-radius:12px;width:420px;max-width:90vw;max-height:70vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.15)" onclick="event.stopPropagation()">
        <div style="padding:20px 24px 0;display:flex;gap:12px;align-items:flex-start">
          <div style="flex-shrink:0;margin-top:2px">${iconSvg}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:15px;font-weight:600;color:${c.title};margin-bottom:8px">${title}</div>
            <div style="font-size:13px;color:#555;line-height:1.7;white-space:pre-wrap">${message}</div>
          </div>
        </div>
        <div style="padding:16px 24px;display:flex;justify-content:flex-end">
          <button onclick="document.getElementById('systemModal').remove()" style="background:${c.icon};color:#fff;border:none;padding:8px 24px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer">知道了</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

// ==================== M9 重新授权三级页 ====================

let currentReauthWork = null;
let currentReauthData = null;
let reauthHistory = [];

// 模拟登录用户角色信息（实际由权限系统控制）
const REAUTH_MOCK_USERS = {
    step1: { name: '\u5f20\u4e09', role: '\u5916\u5faa\u73af\u8fd0\u8425' },
    step2: { name: '\u674e\u56db', role: '\u54c1\u7c7b\u8fd0\u8425' },
    step3: { name: '\u738b\u4e94', role: '\u54c1\u7c7b\u8fd0\u8425' }
};

function getReauthCurrentUser(step) {
    return REAUTH_MOCK_USERS[step] || { name: '\u5f53\u524d\u7528\u6237', role: '-' };
}

/**
 * 从 Tab A 「重新授权」按钮进入 M9 三级页
 */
function openReauthPage(copyrightId) {
    if (!currentDetailProject || !currentDetailProject.detail) return;
    const detail = currentDetailProject.detail;
    const work = (detail.authSheet || detail.authDetails || []).find(d => d.copyright_id === copyrightId);
    if (!work) { showToast('\u672a\u627e\u5230\u5bf9\u5e94\u4f5c\u54c1\u4fe1\u606f'); return; }
    currentReauthWork = work;
    if (!detail.reauthData) detail.reauthData = {};
    if (!detail.reauthData[copyrightId]) {
        detail.reauthData[copyrightId] = {
            currentStatus: 'pending',
            history: [],
            qwGroup: null,
            supplementConclusion: null,
            supplementRemark: '',
            recoveredAt: null,
            rejectRemark: '',
            rejectSource: ''
        };
    }
    currentReauthData = detail.reauthData[copyrightId];
    reauthHistory = currentReauthData.history || [];

    const detailPage = document.getElementById('projectDetailPage');
    const reauthPage = document.getElementById('reauthPage');
    if (detailPage) detailPage.style.display = 'none';
    if (reauthPage) reauthPage.style.display = 'block';

    const titleEl = document.getElementById('reauthPageTitle');
    if (titleEl) titleEl.textContent = '\u300a' + (work.play_name || copyrightId) + '\u300b\u91cd\u65b0\u6388\u6743';

    renderReauthWorkCard(work);
    renderReauthSteps(currentReauthData.currentStatus);
    renderReauthActionArea(currentReauthData.currentStatus, currentReauthData);
    renderReauthHistory(reauthHistory);

    if (typeof lucide !== 'undefined') lucide.createIcons();
    if (reauthPage) reauthPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderReauthWorkCard(work) {
    const card = document.getElementById('reauthWorkCard');
    if (!card) return;
    const CATEGORY_LABEL = { '1':'\u7535\u89c6\u5267', '2':'\u7535\u5f71', '3':'\u7efc\u827a', '4':'\u52a8\u6f2b', '5':'\u7eaa\u5f55\u7247', '6':'\u5c11\u513f', '7':'\u6a2a\u5c4f\u77ed\u5267' };
    card.innerHTML = '<div class="work-card-title"><i data-lucide="film"></i> ' + (work.play_name||'-') + '</div>'
        + '<div class="work-info-grid">'
        + '<div class="work-info-item"><span class="work-info-label">\u7248\u6743ID</span><span class="work-info-value mono">' + (work.copyright_id||'-') + '</span></div>'
        + '<div class="work-info-item"><span class="work-info-label">\u54c1\u7c7b</span><span class="work-info-value">' + (CATEGORY_LABEL[work.play_category]||work.play_category||'-') + '</span></div>'
        + '<div class="work-info-item"><span class="work-info-label">\u5feb\u624bID</span><span class="work-info-value mono">' + (work.ks_auth_id||'-') + '</span></div>'
        + '<div class="work-info-item"><span class="work-info-label">\u4e8c\u521b\u6743\u76caID</span><span class="work-info-value link" onclick="showRightsIdModal(\x27' + (work.rights_id||'RID-'+work.copyright_id) + '\x27)">' + (work.rights_id||'RID-'+work.copyright_id) + '</span></div>'
        + '<div class="work-info-item"><span class="work-info-label">\u56de\u6536\u539f\u56e0</span><span class="work-info-value">' + (work.recovery_reason||'-') + '</span></div>'
        + '<div class="work-info-item"><span class="work-info-label">\u56de\u6536\u65f6\u95f4</span><span class="work-info-value">' + (work.recovery_date||'-') + '</span></div>'
        + '<div class="work-info-item"><span class="work-info-label">\u5173\u8054\u5ba1\u67e5\u5355</span><span class="work-info-value link" onclick="showAuthDetailModal(\x27' + (work.audit_id||'AUD-'+work.copyright_id) + '\x27)">' + (work.audit_id||'AUD-'+work.copyright_id) + '</span></div>'
        + '</div>';
}

function renderReauthSteps(status) {
    const container = document.getElementById('reauthSteps');
    if (!container) return;
    const stepConfig = [
        { key:'pending', label:'\u53d1\u8d77\u91cd\u6388\u6743', role:'\u5916\u5faa\u73af\u8fd0\u8425', icon:'send' },
        { key:'group_confirm', label:'\u5224\u65ad\u662f\u5426\u53ef\u8865\u51fd', role:'\u54c1\u7c7b\u8fd0\u8425', icon:'file-edit' },
        { key:'pending_supplement', label:'\u786e\u8ba4\u8865\u51fd\u7ed3\u679c', role:'\u54c1\u7c7b\u8fd0\u8425', icon:'check-circle' }
    ];
    const statusOrder = ['pending','group_confirm','pending_supplement','authorized'];
    const isRejected = status === 'rejected';
    const rejectedAtStep3 = isRejected && currentReauthData && currentReauthData.rejectSource === 'step3';
    const currentIdx = statusOrder.indexOf(status);
    let html = '';
    stepConfig.forEach((step, idx) => {
        let cls = '';
        if (isRejected) {
            if (rejectedAtStep3) {
                if (idx < 2) cls = 'completed';
                else if (idx === 2) cls = 'rejected';
            } else {
                if (idx === 0) cls = 'completed';
                else if (idx === 1) cls = 'rejected';
            }
        } else if (currentIdx === idx) { cls = 'active'; }
        else if (currentIdx > idx) { cls = 'completed'; }
        let lineCls = '';
        if (idx < stepConfig.length - 1) {
            if (isRejected) {
                if (rejectedAtStep3) { lineCls = idx < 2 ? 'done' : ''; }
                else { lineCls = idx === 0 ? 'done' : (idx === 1 ? 'rejected-line' : ''); }
            } else if (currentIdx > idx + 1) lineCls = 'done';
            else if (currentIdx === idx + 1) lineCls = 'active-line';
        }
        html += '<div class="reauth-step ' + cls + '">'
            + '<div class="reauth-step-icon"><i data-lucide="' + step.icon + '"></i></div>'
            + '<div class="reauth-step-label">' + step.label + '</div>'
            + '<div class="reauth-step-role" style="font-size:11px;color:#999;margin-top:2px">' + step.role + '</div>'
            + '</div>';
        if (idx < stepConfig.length - 1) {
            html += '<div class="reauth-step-line ' + lineCls + '"></div>';
        }
    });
    if (status === 'authorized') {
        html = html.replace(/class="reauth-step "/g, 'class="reauth-step completed "');
        html = html.replace(/class="reauth-step-line "/g, 'class="reauth-step-line done "');
    }
    container.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderReauthActionArea(status, data) {
    var body = document.getElementById('reauthFlowBody');
    if (!body) return;
    var rec = (data.history && data.history.length > 0) ? data.history[data.history.length - 1] : null;

    // Helper: build a conclusion column HTML
    function buildConclusionCol(title, operator, operatorRole, operatorTime, conclusion, conclusionTagCls, remark, isPending) {
        var pendingCls = isPending ? ' is-pending' : '';
        var html = '<div class="reauth-conclusion-col' + pendingCls + '">';
        html += '<div class="conclusion-title">' + title + '</div>';
        if (!isPending && operator && operator !== '-') {
            html += '<div class="conclusion-meta">' + operator + '\uff08' + operatorRole + '\uff09' + (operatorTime ? ' \u4e8e ' + operatorTime + ' \u64cd\u4f5c' : '') + '</div>';
        } else if (isPending) {
            html += '<div class="conclusion-meta">\u5f85\u5904\u7406</div>';
        }
        if (!isPending && conclusion && conclusion !== '-') {
            html += '<div class="conclusion-item"><span class="conclusion-label">\u7ed3\u8bba\uff1a</span><span class="conclusion-value ' + (conclusionTagCls || '') + '">' + conclusion + '</span></div>';
        } else if (isPending) {
            html += '<div class="conclusion-item"><span class="conclusion-label">\u7ed3\u8bba\uff1a</span><span class="conclusion-value tag-pending">\u6682\u65e0\u7ed3\u8bba</span></div>';
        }
        if (!isPending && remark) {
            html += '<div class="conclusion-item"><span class="conclusion-label">\u5907\u6ce8\uff1a</span><span class="conclusion-value">' + remark + '</span></div>';
        }
        html += '</div>';
        return html;
    }

    // Helper: get step1 conclusion col
    function getStep1Col(isPending) {
        if (!rec || isPending) return buildConclusionCol('\u53d1\u8d77\u91cd\u6388\u6743', '-', '-', '', '-', '', '', true);
        return buildConclusionCol('\u53d1\u8d77\u91cd\u6388\u6743', rec.step1Operator, rec.step1OperatorRole, rec.startTime, '\u5df2\u53d1\u8d77', 'tag-success', '', false);
    }

    // Helper: get step2 conclusion col
    function getStep2Col(isPending) {
        if (!rec || isPending || rec.step2Conclusion === '-') return buildConclusionCol('\u5224\u65ad\u662f\u5426\u53ef\u8865\u51fd', '-', '-', '', '-', '', '', true);
        var tagCls = rec.step2Conclusion === '\u53ef\u8865\u51fd' ? 'tag-success' : 'tag-error';
        var remarkParts = (rec.remark || '').split('\uff1b');
        var step2Remark = remarkParts.length > 1 ? remarkParts[1] : (remarkParts[0] || '');
        return buildConclusionCol('\u5224\u65ad\u662f\u5426\u53ef\u8865\u51fd', rec.step2Operator, rec.step2OperatorRole, '', rec.step2Conclusion, tagCls, '', false);
    }

    // Helper: get step3 conclusion col
    function getStep3Col(isPending) {
        if (!rec || isPending || rec.step3Conclusion === '-') return buildConclusionCol('\u786e\u8ba4\u8865\u51fd\u7ed3\u679c', '-', '-', '', '-', '', '', true);
        var tagCls = rec.step3Conclusion === '\u786e\u8ba4\u8865\u51fd\u5b8c\u6210' ? 'tag-success' : 'tag-error';
        return buildConclusionCol('\u786e\u8ba4\u8865\u51fd\u7ed3\u679c', rec.step3Operator, rec.step3OperatorRole, '', rec.step3Conclusion, tagCls, '', false);
    }

    // Helper: build action form for step2
    function buildStep2Form() {
        var gName = data.qwGroup || '';
        return '<div class="action-form-title">\u5224\u65ad\u662f\u5426\u53ef\u8865\u51fd</div>'
            + '<div class="action-qw-group"><div class="action-qw-label">\u4f01\u5fae\u6c9f\u4fe1\u7fa4\uff08mock\uff09</div><div class="action-qw-value">' + gName + '</div></div>'
            + '<div class="action-form-group"><label class="action-form-label">\u786e\u8ba4\u7ed3\u8bba <span style="color:var(--error-color)">*</span></label>'
            + '<div class="action-radio-group" id="reauthConclusionGroup">'
            + '<div class="action-radio-option" onclick="selectReauthConclusion(this)"><input type="radio" name="reauthConclusion" value="can_supplement"><span>\u53ef\u8865\u786e\u8ba4\u51fd</span></div>'
            + '<div class="action-radio-option" onclick="selectReauthConclusion(this)"><input type="radio" name="reauthConclusion" value="cannot_supplement"><span>\u4e0d\u53ef\u8865\u786e\u8ba4\u51fd</span></div>'
            + '</div></div>'
            + '<div class="action-form-group"><label class="action-form-label">\u5907\u6ce8\uff08\u53ef\u9009\uff09</label>'
            + '<textarea class="action-remark-textarea" id="reauthStep2Remark" placeholder="\u9009\u586b\uff0c\u53ef\u8865\u5145\u8bf4\u660e..." rows="2" style="width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;resize:vertical;font-family:inherit"></textarea></div>'
            + '<div class="action-btn-row"><button class="btn-reauth-cancel" onclick="cancelReauthAction()">\u53d6\u6d88</button> <button class="btn-reauth-action" id="btnSubmitConclusion" disabled onclick="submitReauthConclusion()">\u63d0\u4ea4</button></div>';
    }

    // Helper: build action form for step3
    function buildStep3Form() {
        return '<div class="action-form-title">\u786e\u8ba4\u8865\u51fd\u7ed3\u679c</div>'
            + '<div class="action-qw-group"><div class="action-qw-label">\u8865\u51fd\u8fdb\u5ea6</div><div class="action-qw-value">\u7b49\u5f85\u5bf9\u65b9\u8865\u5145\u786e\u8ba4\u51fd\uff0c\u9884\u8ba1 3-5 \u4e2a\u5de5\u4f5c\u65e5</div></div>'
            + '<div class="action-form-group"><label class="action-form-label">\u786e\u8ba4\u7ed3\u8bba <span style="color:var(--error-color)">*</span></label>'
            + '<div class="action-radio-group" id="reauthStep3Group">'
            + '<div class="action-radio-option" onclick="selectReauthStep3(this)"><input type="radio" name="reauthStep3" value="supplement_done"><span>\u786e\u8ba4\u8865\u51fd\u5b8c\u6210</span></div>'
            + '<div class="action-radio-option" onclick="selectReauthStep3(this)"><input type="radio" name="reauthStep3" value="cannot_supplement"><span>\u7ecf\u786e\u8ba4\u65e0\u6cd5\u8865\u51fd</span></div>'
            + '</div></div>'
            + '<div class="action-form-group"><label class="action-form-label">\u5907\u6ce8\uff08\u53ef\u9009\uff09</label>'
            + '<textarea class="action-remark-textarea" id="reauthStep3Remark" placeholder="\u9009\u586b\uff0c\u53ef\u8865\u5145\u8bf4\u660e..." rows="2" style="width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;resize:vertical;font-family:inherit"></textarea></div>'
            + '<div class="action-btn-row"><button class="btn-reauth-cancel" onclick="cancelReauthAction()">\u53d6\u6d88</button> <button class="btn-reauth-action" id="btnSubmitStep3" disabled onclick="submitReauthStep3()">\u63d0\u4ea4</button></div>';
    }

    var html = '';

    if (status === 'authorized') {
        // Full flow done: 3 columns of conclusions + centered success result
        html += '<div class="reauth-conclusions-row">';
        html += getStep1Col(false);
        html += getStep2Col(false);
        html += getStep3Col(false);
        html += '</div>';
        html += '<div class="reauth-final-result"><div class="result-icon success"><i data-lucide="check-circle"></i></div><div class="result-text">\u6388\u6743\u5df2\u6062\u590d</div><div class="result-detail">\u6062\u590d\u65f6\u95f4\uff1a' + (data.recoveredAt || '-') + '</div></div>';
    } else if (status === 'rejected') {
        // Rejected: show completed columns + centered rejected result
        var rejectLabel = data.rejectSource === 'step3' ? '\u7ecf\u786e\u8ba4\u65e0\u6cd5\u8865\u51fd' : '\u4e0d\u53ef\u8865\u786e\u8ba4\u51fd';
        html += '<div class="reauth-conclusions-row">';
        html += getStep1Col(false);
        html += getStep2Col(false);
        if (data.rejectSource === 'step3') {
            html += getStep3Col(false);
        } else {
            html += getStep3Col(true);
        }
        html += '</div>';
        html += '<div class="reauth-final-result"><div class="result-icon rejected"><i data-lucide="x-circle"></i></div><div class="result-text">\u672c\u6b21\u5df2\u5173\u95ed</div><div class="result-detail">\u7ed3\u8bba\uff1a' + rejectLabel + (data.rejectRemark ? ' \uff0c\u5907\u6ce8\uff1a' + data.rejectRemark : '') + '</div></div>';
    } else if (status === 'pending') {
        // Not started: left = all 3 nodes (all pending), right = action button + remark
        html += '<div class="reauth-flow-columns">';
        html += '<div class="reauth-flow-left">' + getStep1Col(true) + getStep2Col(true) + getStep3Col(true) + '</div>';
        html += '<div class="reauth-flow-right">';
        html += '<div class="action-form-title">\u53d1\u8d77\u91cd\u6388\u6743</div>'
            + '<div class="action-form-group"><label class="action-form-label">\u5907\u6ce8\uff08\u53ef\u9009\uff09</label>'
            + '<textarea class="action-remark-textarea" id="reauthStep1Remark" placeholder="\u9009\u586b\uff0c\u53ef\u8865\u5145\u8bf4\u660e..." rows="2" style="width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;resize:vertical;font-family:inherit"></textarea></div>'
            + '<div class="action-btn-row" style="justify-content:flex-end"><button class="btn-reauth-action" onclick="startReauthGroupConfirm()"><i data-lucide="send" style="width:14px;height:14px"></i> \u53d1\u8d77\u91cd\u6388\u6743</button></div>';
        html += '</div>';
        html += '</div>';
    } else if (status === 'group_confirm') {
        // Step 2 active: left = all 3 nodes (step1 done, step2+3 pending), right = Step2 form
        html += '<div class="reauth-flow-columns">';
        html += '<div class="reauth-flow-left">' + getStep1Col(false) + getStep2Col(true) + getStep3Col(true) + '</div>';
        html += '<div class="reauth-flow-right">' + buildStep2Form() + '</div>';
        html += '</div>';
    } else if (status === 'pending_supplement') {
        // Step 3 active: left = all 3 nodes (step1+2 done, step3 pending), right = Step3 form
        html += '<div class="reauth-flow-columns">';
        html += '<div class="reauth-flow-left">' + getStep1Col(false) + getStep2Col(false) + getStep3Col(true) + '</div>';
        html += '<div class="reauth-flow-right">' + buildStep3Form() + '</div>';
        html += '</div>';
    }

    body.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function selectReauthConclusion(el) {
    var group = document.getElementById('reauthConclusionGroup');
    if (!group) return;
    group.querySelectorAll('.action-radio-option').forEach(function(o) { o.classList.remove('selected'); });
    el.classList.add('selected');
    var radio = el.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
    var btn = document.getElementById('btnSubmitConclusion');
    if (btn) btn.disabled = false;
}

function selectReauthStep3(el) {
    var group = document.getElementById('reauthStep3Group');
    if (!group) return;
    group.querySelectorAll('.action-radio-option').forEach(function(o) { o.classList.remove('selected'); });
    el.classList.add('selected');
    var radio = el.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
    var btn = document.getElementById('btnSubmitStep3');
    if (btn) btn.disabled = false;
}

function startReauthGroupConfirm() {
    if (!currentReauthWork || !currentReauthData) return;
    var groupName = '\u91cd\u65b0\u6388\u6743-' + currentReauthWork.copyright_id;
    var now = new Date().toLocaleString('zh-CN');
    var remark = (document.getElementById('reauthStep1Remark') || {}).value || '';
    var user1 = getReauthCurrentUser('step1');
    showSystemModal('\u53d1\u8d77\u91cd\u6388\u6743', '\u5df2\u521b\u5efa\u4f01\u5fae\u6c9f\u4fe1\u7fa4\uff1a\n\u7fa4\u540d\uff1a' + groupName + '\n\u6210\u5458\uff1a\u7248\u6743\u8fd0\u8425\u3001\u6cd5\u52a1\u3001\u54c1\u7c7b\u8fd0\u8425\n\n\u7cfb\u7edf\u5c06\u7b49\u5f85\u786e\u8ba4\u7ed3\u8bba\u56de\u586b', 'info');
    currentReauthData.currentStatus = 'group_confirm';
    currentReauthData.qwGroup = groupName;
    currentReauthData.statusUpdatedAt = now;
    var reauthTaskId = 'REAUTH-' + currentReauthWork.copyright_id + '-' + Date.now();
    var record = {
        attempt: reauthHistory.length + 1,
        reauthTaskId: reauthTaskId,
        startTime: now,
        step1Operator: user1.name,
        step1OperatorRole: user1.role,
        step2Conclusion: '-',
        step2Operator: '-',
        step2OperatorRole: '-',
        step3Conclusion: '-',
        step3Operator: '-',
        step3OperatorRole: '-',
        remark: remark
    };
    currentReauthData.history.push(record);
    reauthHistory = currentReauthData.history;
    renderReauthSteps(currentReauthData.currentStatus);
    renderReauthActionArea(currentReauthData.currentStatus, currentReauthData);
    renderReauthHistory(reauthHistory);
}

function submitReauthConclusion() {
    if (!currentReauthData) return;
    var selected = document.querySelector('#reauthConclusionGroup .action-radio-option.selected');
    if (!selected) return;
    var radio = selected.querySelector('input[type="radio"]');
    var conclusion = radio ? radio.value : '';
    var now = new Date().toLocaleString('zh-CN');
    var remark = (document.getElementById('reauthStep2Remark') || {}).value || '';
    var user2 = getReauthCurrentUser('step2');
    var rec = currentReauthData.history[currentReauthData.history.length - 1];
    if (conclusion === 'can_supplement') {
        currentReauthData.currentStatus = 'pending_supplement';
        currentReauthData.supplementConclusion = '\u53ef\u8865\u51fd';
        if (rec) {
            rec.step2Conclusion = '\u53ef\u8865\u51fd';
            rec.step2Operator = user2.name;
            rec.step2OperatorRole = user2.role;
            if (remark) rec.remark = (rec.remark ? rec.remark + '\uff1b' : '') + remark;
        }
    } else {
        currentReauthData.currentStatus = 'rejected';
        currentReauthData.supplementConclusion = '\u4e0d\u53ef\u8865\u786e\u8ba4\u51fd';
        currentReauthData.rejectRemark = remark;
        currentReauthData.rejectSource = 'step2';
        if (rec) {
            rec.step2Conclusion = '\u4e0d\u53ef\u8865\u786e\u8ba4\u51fd';
            rec.step2Operator = user2.name;
            rec.step2OperatorRole = user2.role;
            if (remark) rec.remark = (rec.remark ? rec.remark + '\uff1b' : '') + remark;
        }
    }
    currentReauthData.statusUpdatedAt = now;
    reauthHistory = currentReauthData.history;
    renderReauthSteps(currentReauthData.currentStatus);
    renderReauthActionArea(currentReauthData.currentStatus, currentReauthData);
    renderReauthHistory(reauthHistory);
}

function submitReauthStep3() {
    if (!currentReauthWork || !currentReauthData) return;
    var selected = document.querySelector('#reauthStep3Group .action-radio-option.selected');
    if (!selected) return;
    var radio = selected.querySelector('input[type="radio"]');
    var conclusion = radio ? radio.value : '';
    var now = new Date().toLocaleString('zh-CN');
    var remark = (document.getElementById('reauthStep3Remark') || {}).value || '';
    var user3 = getReauthCurrentUser('step3');
    var rec = currentReauthData.history[currentReauthData.history.length - 1];
    if (conclusion === 'supplement_done') {
        showSystemModal('\u786e\u8ba4\u8865\u51fd\u5b8c\u6210', '\u5df2\u786e\u8ba4\u8865\u51fd\u5b8c\u6210\uff0c\u6388\u6743\u5df2\u6062\u590d\u3002\n\n\u7248\u6743ID\uff1a' + currentReauthWork.copyright_id + '\n\u6062\u590d\u65f6\u95f4\uff1a' + now, 'success');
        if (currentDetailProject && currentDetailProject.detail) {
            var detail = currentDetailProject.detail;
            var work = (detail.authSheet || detail.authDetails || []).find(function(d) { return d.copyright_id === currentReauthWork.copyright_id; });
            if (work) {
                work.recovery_status = null;
                work.recovery_reason = '';
                work.recovery_date = '';
                work.xwq_status = '\u751f\u6548\u4e2d';
                var newRightsId = 'RID-' + work.copyright_id + '-R' + (currentReauthData.history.length || 1);
                work.rights_id = newRightsId;
                currentReauthData.newRightsId = newRightsId;
            }
        }
        currentReauthData.currentStatus = 'authorized';
        currentReauthData.recoveredAt = now;
        if (rec) {
            rec.step3Conclusion = '\u786e\u8ba4\u8865\u51fd\u5b8c\u6210';
            rec.step3Operator = user3.name;
            rec.step3OperatorRole = user3.role;
            if (remark) rec.remark = (rec.remark ? rec.remark + '\uff1b' : '') + remark;
        }
        if (typeof renderFilteredAuthTable === 'function') renderFilteredAuthTable();
    } else {
        currentReauthData.currentStatus = 'rejected';
        currentReauthData.rejectRemark = remark;
        currentReauthData.rejectSource = 'step3';
        if (rec) {
            rec.step3Conclusion = '\u7ecf\u786e\u8ba4\u65e0\u6cd5\u8865\u51fd';
            rec.step3Operator = user3.name;
            rec.step3OperatorRole = user3.role;
            if (remark) rec.remark = (rec.remark ? rec.remark + '\uff1b' : '') + remark;
        }
    }
    currentReauthData.statusUpdatedAt = now;
    reauthHistory = currentReauthData.history;
    renderReauthSteps(currentReauthData.currentStatus);
    renderReauthActionArea(currentReauthData.currentStatus, currentReauthData);
    renderReauthHistory(reauthHistory);
}

function cancelReauthAction() {
    if (!currentReauthData) return;
    renderReauthActionArea(currentReauthData.currentStatus, currentReauthData);
}

function renderReauthHistory(history) {
    var container = document.getElementById('reauthHistoryTable');
    if (!container) return;
    if (!history || history.length === 0) {
        container.innerHTML = '<div class="reauth-history-empty">\u6682\u65e0\u5386\u53f2\u8bb0\u5f55</div>';
        return;
    }
    var sorted = history.slice().reverse();
    var tableHtml = '<table class="reauth-history-table"><thead><tr>'
        + '<th>\u6b21\u6570</th><th>\u4efb\u52a1ID</th><th>\u53d1\u8d77\u65f6\u95f4</th><th>\u5916\u5faa\u73af\u64cd\u4f5c\u4eba</th><th>\u8865\u51fd\u7ed3\u8bba</th><th>\u8865\u51fd\u7ed3\u8bba\u64cd\u4f5c\u4eba</th><th>\u8865\u51fd\u786e\u8ba4\u7ed3\u679c</th><th>\u8865\u51fd\u786e\u8ba4\u64cd\u4f5c\u4eba</th><th>\u5907\u6ce8</th>'
        + '</tr></thead><tbody>';
    sorted.forEach(function(rec) {
        var s2cls = '';
        if (rec.step2Conclusion === '\u53ef\u8865\u51fd') s2cls = 'canSupplement';
        else if (rec.step2Conclusion === '\u4e0d\u53ef\u8865\u786e\u8ba4\u51fd') s2cls = 'closed';
        var s3cls = '';
        if (rec.step3Conclusion === '\u786e\u8ba4\u8865\u51fd\u5b8c\u6210') s3cls = 'recovered';
        else if (rec.step3Conclusion === '\u7ecf\u786e\u8ba4\u65e0\u6cd5\u8865\u51fd') s3cls = 'closed';
        var remarkDisplay = rec.remark || '-';
        var remarkTruncated = remarkDisplay.length > 15 ? remarkDisplay.substring(0, 15) + '...' : remarkDisplay;
        tableHtml += '<tr>'
            + '<td>\u7b2c ' + rec.attempt + ' \u6b21</td>'
            + '<td style="font-size:11px;font-family:monospace;color:#666">' + (rec.reauthTaskId || '-') + '</td>'
            + '<td style="font-size:12px">' + (rec.startTime || '-') + '</td>'
            + '<td style="font-size:12px">' + (rec.step1Operator || '-') + (rec.step1OperatorRole && rec.step1OperatorRole !== '-' ? '\uff08' + rec.step1OperatorRole + '\uff09' : '') + '</td>'
            + '<td><span class="history-status ' + s2cls + '">' + (rec.step2Conclusion || '-') + '</span></td>'
            + '<td style="font-size:12px">' + (rec.step2Operator || '-') + (rec.step2OperatorRole && rec.step2OperatorRole !== '-' ? '\uff08' + rec.step2OperatorRole + '\uff09' : '') + '</td>'
            + '<td><span class="history-status ' + s3cls + '">' + (rec.step3Conclusion || '-') + '</span></td>'
            + '<td style="font-size:12px">' + (rec.step3Operator || '-') + (rec.step3OperatorRole && rec.step3OperatorRole !== '-' ? '\uff08' + rec.step3OperatorRole + '\uff09' : '') + '</td>'
            + '<td style="font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + (rec.remark || '') + '">' + remarkTruncated + '</td>'
            + '</tr>';
    });
    tableHtml += '</tbody></table>';
    container.innerHTML = tableHtml;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ==================== M6 项目配置 ====================

function renderProjectConfigSection(project) {
    var container = document.getElementById('projectConfigContent');
    if (!container) return;
    var st = project.status || 'running';
    var RIGHTS_TYPE_MAP = { secondary_creation: '\u4e8c\u521b\u6743', distribution: '\u5206\u9500\u6743', adaptation: '\u6539\u7f16\u6743' };
    var AUDIT_MODE_MAP = { rolling: '\u591a\u8f6e\u6eda\u52a8\u5ba1\u6838', one_time: '\u5355\u6b21\u6279\u91cf\u5ba1\u6838', batch: '\u6279\u91cf\u5ba1\u6838' };
    var rightsType = RIGHTS_TYPE_MAP[project.rights_type] || project.rights_type || '-';
    var auditMode = AUDIT_MODE_MAP[project.audit_mode] || project.audit_mode || '-';
    var cats = (project.category_scope || []).map(function(c) { return '<span class="config-tag">' + c + '</span>'; }).join('');

    // Status-dependent operation buttons
    var opsHtml = '';
    if (st === 'configuring') {
        opsHtml = '<button class="config-op-btn config-op-success" onclick="showSystemModal(\'\\u542f\\u52a8\\u9879\\u76ee\',\'\\u786e\\u8ba4\\u542f\\u52a8\\u8be5\\u9879\\u76ee\\uff1f\\u542f\\u52a8\\u540e\\u5c06\\u8fdb\\u5165\\u6b63\\u5f0f\\u8fd0\\u884c\\u72b6\\u6001\\u3002\',\'info\')">\u542f\u52a8</button>'
            + '<button class="config-op-btn config-op-danger" onclick="showSystemModal(\'\\u5220\\u9664\\u9879\\u76ee\',\'\\u786e\\u8ba4\\u5220\\u9664\\u8be5\\u9879\\u76ee\\uff1f\\u6b64\\u64cd\\u4f5c\\u4e0d\\u53ef\\u64a4\\u56de\\u3002\',\'error\')">\u5220\u9664</button>';
    } else if (st === 'running') {
        opsHtml = '<button class="config-op-btn config-op-warning" onclick="showSystemModal(\'\\u6682\\u505c\\u9879\\u76ee\',\'\\u786e\\u8ba4\\u6682\\u505c\\u8be5\\u9879\\u76ee\\uff1f\\u6682\\u505c\\u540e\\u53ef\\u968f\\u65f6\\u6062\\u590d\\u3002\',\'info\')">\u6682\u505c</button>'
            + '<button class="config-op-btn config-op-gray" onclick="showSystemModal(\'\\u5f52\\u6863\\u9879\\u76ee\',\'\\u786e\\u8ba4\\u5f52\\u6863\\u8be5\\u9879\\u76ee\\uff1f\\u5f52\\u6863\\u540e\\u4e0d\\u53ef\\u7f16\\u8f91\\u3002\',\'info\')">\u5f52\u6863</button>';
    } else if (st === 'suspended') {
        opsHtml = '<button class="config-op-btn config-op-success" onclick="showSystemModal(\'\\u6062\\u590d\\u9879\\u76ee\',\'\\u786e\\u8ba4\\u6062\\u590d\\u8be5\\u9879\\u76ee\\uff1f\',\'info\')">\u6062\u590d</button>';
    } else if (st === 'expired') {
        opsHtml = '<button class="config-op-btn config-op-primary" onclick="showSystemModal(\'\\u7eed\\u671f\\u9879\\u76ee\',\'\\u8bf7\\u7f16\\u8f91\\u65b0\\u7684\\u6388\\u6743\\u65f6\\u95f4\\u7a97\\u53e3\\u540e\\u786e\\u8ba4\\u3002\',\'info\')">\u7eed\u671f</button>'
            + '<button class="config-op-btn config-op-gray" onclick="showSystemModal(\'\\u5f52\\u6863\\u9879\\u76ee\',\'\\u786e\\u8ba4\\u5f52\\u6863\\u8be5\\u9879\\u76ee\\uff1f\',\'info\')">\u5f52\u6863</button>';
    }

    var isArchived = st === 'archived';
    var lockIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>';

    container.innerHTML = '<div class="config-grid">'
        // 1. 项目身份
        + '<div class="config-card"><div class="config-card-title">\u9879\u76ee\u8eab\u4efd</div>'
        + '<div class="config-row"><span class="config-label">\u6743\u5229\u7c7b\u578b ' + lockIcon + '</span><span class="config-value">' + rightsType + '</span></div>'
        + '<div class="config-row"><span class="config-label">\u5ba1\u6838\u65b9\u5f0f ' + lockIcon + '</span><span class="config-value">' + auditMode + '</span></div>'
        + '<div class="config-row"><span class="config-label">\u9879\u76ee\u540d\u79f0</span><span class="config-value' + (isArchived ? '' : ' config-editable') + '">' + (project.name || '-') + '</span></div>'
        + '</div>'
        // 2. 合作方信息
        + '<div class="config-card"><div class="config-card-title">\u5408\u4f5c\u65b9\u4fe1\u606f</div>'
        + '<div class="config-row"><span class="config-label">\u5408\u4f5c\u65b9\u540d\u79f0</span><span class="config-value' + (isArchived ? '' : ' config-editable') + '">' + (project.partner_name || '-') + '</span></div>'
        + '<div class="config-row"><span class="config-label">\u5408\u540c\u7f16\u53f7</span><span class="config-value' + (isArchived ? '' : ' config-editable') + '">' + (project.partner_contract_no || '-') + '</span></div>'
        + '<div class="config-row"><span class="config-label">\u8054\u7cfb\u4eba</span><span class="config-value' + (isArchived ? '' : ' config-editable') + '">' + (project.partner_contact || '-') + '</span></div>'
        + '</div>'
        // 3. 品类与时间
        + '<div class="config-card"><div class="config-card-title">\u54c1\u7c7b\u4e0e\u65f6\u95f4</div>'
        + '<div class="config-row"><span class="config-label">\u54c1\u7c7b\u8303\u56f4</span><span class="config-value">' + (cats || '-') + '</span></div>'
        + '<div class="config-row"><span class="config-label">\u6388\u6743\u65f6\u95f4\u7a97\u53e3</span><span class="config-value">' + (project.auth_window_start || '-') + ' ~ ' + (project.auth_window_end || '-') + '</span></div>'
        + '</div>'
        // 4. 权益规则
        + '<div class="config-card"><div class="config-card-title">\u6743\u76ca\u89c4\u5219</div>'
        + '<div class="config-row"><span class="config-label">\u9009\u7247\u6761\u4ef6</span><span class="config-value">\u7248\u6743\u6709\u6548\u671f\u5185\u3001\u4fe1\u7f51\u6743\u53ef\u8f6c\u6388\u3001\u65e0\u7248\u6743\u7ea0\u7eb7</span></div>'
        + '</div>'
        // 5. 审核流程详情
        + '<div class="config-card"><div class="config-card-title">\u5ba1\u6838\u6d41\u7a0b\u8be6\u60c5 ' + lockIcon + '</div>'
        + '<div class="config-flow-steps">'
        + '<div class="config-flow-step"><span class="config-flow-num">1</span>\u7248\u6743\u8fd0\u8425\u521d\u5ba1</div>'
        + '<div class="config-flow-arrow">\u2192</div>'
        + '<div class="config-flow-step"><span class="config-flow-num">2</span>\u6cd5\u52a1\u590d\u5ba1</div>'
        + '<div class="config-flow-arrow">\u2192</div>'
        + '<div class="config-flow-step"><span class="config-flow-num">3</span>\u54c1\u7c7b\u8fd0\u8425\u8bc4\u4f30</div>'
        + '</div></div>'
        // 6. 交付设置
        + '<div class="config-card"><div class="config-card-title">\u4ea4\u4ed8\u8bbe\u7f6e</div>'
        + '<div class="config-row"><span class="config-label">\u6743\u76ca\u521b\u5efa\u6a21\u677f</span><span class="config-value">\u9ed8\u8ba4\u6a21\u677f</span></div>'
        + '<div class="config-row"><span class="config-label">\u901a\u77e5\u89c4\u5219</span><span class="config-value">\u5ba1\u6838\u5b8c\u6210\u540e\u81ea\u52a8\u901a\u77e5\u5408\u4f5c\u65b9</span></div>'
        + '</div>'
        + '</div>'
        // 7. 项目操作
        + (opsHtml ? '<div class="config-ops-area"><div class="config-card-title">\u9879\u76ee\u64cd\u4f5c</div><div class="config-ops-btns">' + opsHtml + '</div></div>' : '');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ==================== M7 新热预告 ====================

function renderNewHotSection(project) {
    var container = document.getElementById('newHotContent');
    if (!container) return;

    var newHotData = [
        { category: '\u7535\u89c6\u5267', ipName: '\u5e86\u4f59\u5e74\u7b2c\u56db\u5b63', level: 'S', planDate: '2026-05-15', cid: 'mzc002004abc', matchStatus: '\u5df2\u5339\u914d', copyrightId: 'bq3012001', judgment: '\u53ef\u7528', taskCreated: 'AUD-NH-001' },
        { category: '\u52a8\u6f2b', ipName: '\u6597\u7834\u82cd\u7a79\u5e74\u756a', level: 'A', planDate: '2026-06-01', cid: '', matchStatus: '\u6309\u540d\u79f0\u5339\u914d', copyrightId: 'bq4015002', judgment: '\u6743\u5229\u7455\u75b5', taskCreated: 'AUD-NH-002' },
        { category: '\u7efc\u827a', ipName: '\u521b\u9020\u84252027', level: 'B', planDate: '2026-07-10', cid: '', matchStatus: '\u65e0\u5408\u540c', copyrightId: '-', judgment: '\u65e0\u5408\u540c\u4e0d\u53ef\u7528', taskCreated: '-' }
    ];

    var warnSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

    var html = '<div class="nh-toolbar">'
        + '<button class="nh-btn-import" onclick="showSystemModal(\'\\u5bfc\\u5165\\u6392\\u64ad\\u8868\',\'\\u6392\\u64ad\\u8868\\u5bfc\\u5165\\u6210\\u529f\\uff08mock\\uff09\\u3002\\n\\n\\u5bfc\\u5165\\u6a21\\u677f\\u5b57\\u6bb5\\uff1a\\u54c1\\u7c7b\\u3001IP\\u540d\\u79f0\\u3001\\u7ea7\\u522b\\u3001\\u9884\\u8ba1\\u5f00\\u64ad\\u65e5\\u671f\\u3001CID\\u3001\\u5907\\u6ce8\',\'success\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> \u5bfc\u5165\u6392\u64ad\u8868</button>'
        + '<button class="nh-btn-export" onclick="showSystemModal(\'\\u5bfc\\u51fa\\u9884\\u544a\\u6e05\\u5355\',\'\\u5df2\\u5bfc\\u51fa\\u300a\\u65b0\\u7247\\u4f5c\\u54c1\\u9884\\u544a\\u6e05\\u5355\\u300b\\uff0814\\u5b57\\u6bb5\\uff09\\uff08mock\\uff09\',\'success\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> \u5bfc\u51fa\u9884\u544a\u6e05\u5355</button>'
        + '</div>';

    html += '<div class="nh-notice">' + warnSvg + ' <strong>\u6ce8\u610f\uff1a</strong>\u4e0d\u80fd\u5728\u6b64\u9875\u9762\u5ba1\u6838\u4f5c\u54c1\u3002\u5ba1\u6838\u8bf7\u524d\u5f80\u6388\u6743\u5ba1\u67e5\u3002</div>';

    // Table
    var judgCls = function(j) {
        if (j === '\u53ef\u7528') return 'nh-tag-success';
        if (j === '\u6743\u5229\u7455\u75b5') return 'nh-tag-warning';
        return 'nh-tag-error';
    };
    html += '<div class="nh-table-wrap"><table class="nh-table"><thead><tr>'
        + '<th>\u54c1\u7c7b</th><th>IP\u540d\u79f0</th><th>\u7ea7\u522b</th><th>\u9884\u8ba1\u5f00\u64ad</th><th>CID</th><th>\u5339\u914d\u72b6\u6001</th><th>\u7248\u6743ID</th><th>\u7cfb\u7edf\u5224\u5b9a</th><th>\u5ba1\u67e5\u4efb\u52a1</th>'
        + '</tr></thead><tbody>';
    newHotData.forEach(function(d) {
        html += '<tr>'
            + '<td>' + d.category + '</td>'
            + '<td style="font-weight:500">' + d.ipName + '</td>'
            + '<td><span class="nh-level-badge">' + d.level + '</span></td>'
            + '<td style="font-size:12px">' + d.planDate + '</td>'
            + '<td style="font-size:11px;font-family:monospace;color:#666">' + (d.cid || '-') + '</td>'
            + '<td style="font-size:12px">' + d.matchStatus + '</td>'
            + '<td style="font-size:11px;font-family:monospace">' + d.copyrightId + '</td>'
            + '<td><span class="' + judgCls(d.judgment) + '">' + d.judgment + '</span></td>'
            + '<td style="font-size:11px;font-family:monospace">' + d.taskCreated + '</td>'
            + '</tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function closeReauthPage() {
    const reauthPage = document.getElementById('reauthPage');
    const detailPage = document.getElementById('projectDetailPage');
    if (reauthPage) reauthPage.style.display = 'none';
    if (detailPage) detailPage.style.display = 'block';
    if (typeof renderFilteredAuthTable === 'function') renderFilteredAuthTable();
    currentReauthWork = null;
    currentReauthData = null;
}

function initReauthPageEvents() {
    const btnBack = document.getElementById('btnBackFromReauth');
    if (btnBack) btnBack.onclick = function() { closeReauthPage(); if (typeof closeProjectDetail === 'function') closeProjectDetail(); };
    const btnBackDetail = document.getElementById('btnBackToDetailFromReauth');
    if (btnBackDetail) btnBackDetail.onclick = function() {
        const rp = document.getElementById('reauthPage');
        const dp = document.getElementById('projectDetailPage');
        if (rp) rp.style.display = 'none';
        if (dp) dp.style.display = 'block';
        if (typeof renderFilteredAuthTable === 'function') renderFilteredAuthTable();
        currentReauthWork = null;
        currentReauthData = null;
    };
}

if (typeof initAuthManagementModule === 'function') {
    const _origInit = initAuthManagementModule;
    initAuthManagementModule = function() {
        _origInit();
        initReauthPageEvents();
    };
}
