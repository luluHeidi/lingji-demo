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
function renderProjectList() {
    const container = document.getElementById('projectListContainer');
    if (!container || !authData) return;

    const projects = authData.projects;

    if (!projects || projects.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="folder-open"></i>
                <p>暂无项目</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    container.innerHTML = projects.map(project => {
        return `
            <div class="project-card" data-project-id="${project.id}">
                <div class="project-card-inner">
                    <div class="project-status-bar ${project.status}"></div>
                    <div class="project-card-body">
                        <div class="project-card-top">
                            <div class="project-name-group">
                                <i data-lucide="layers" class="project-title-icon"></i>
                                <span class="project-name">${project.name}</span>
                                <span class="project-id-text">ID: ${project.id}</span>
                            </div>
                            <div class="project-status-tag ${project.status}">
                                <span class="status-dot"></span>
                                <span>${project.statusLabel}</span>
                            </div>
                        </div>
                        <div class="project-info-row">
                            <div class="project-info-item">
                                <span>授权时间：</span>
                                <span class="project-info-value">${project.authPeriod}</span>
                            </div>
                            <div class="project-info-item">
                                <span>项目类型：</span>
                                <span class="project-info-value">${project.type}</span>
                            </div>
                        </div>
                        <div class="project-card-bottom">
                            <button class="btn-view-detail" data-action="view-detail" data-project="${project.id}">
                                查看详情
                                <i data-lucide="arrow-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
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
            showBlankPage('创建项目', '创建项目页面正在开发中，敬请期待');
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

    // 授权审查tab中渲染数据
    if (tabKey === 'rightsReview') {
        renderRightsReview();
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

// ==================== 授权审查 ====================

let rrUgcCurrentPage = 1;
const RR_PAGE_SIZE = 10;

// 筛选状态
const rrFilters = {
    progress: '',          // 审核进度下拉
    taskType: '',          // 任务类型下拉
    category: '',          // 品类下拉
    extAuth: '',           // 法务复审结论下拉
    searchText: ''         // 作品名称搜索
};

/**
 * 获取任务类型（替代原来的榜单字段）
 * 规则：
 *  - 法务复审结论为"权利瑕疵"或"不可用" → 风险审查
 *  - listType 为"新热" → 新热确权
 *  - 其他 → 增补确权
 */
function getTaskType(item) {
    if (item.externalAuthRights === '权利瑕疵' || item.externalAuthRights === '不可用') {
        return '风险审查';
    }
    if (item.listType === '新热') {
        return '新热确权';
    }
    return '增补确权';
}

/**
 * 获取任务类型对应的CSS类名
 */
function getTaskTypeClass(taskType) {
    switch (taskType) {
        case '风险审查': return 'rr-task-type-risk';
        case '新热确权': return 'rr-task-type-hot';
        case '增补确权': return 'rr-task-type-supplement';
        default: return 'rr-task-type-supplement';
    }
}

/**
 * 对items按任务类型排序：风险审查优先
 */
function sortByTaskType(items) {
    const typeOrder = { '风险审查': 0, '新热确权': 1, '增补确权': 2 };
    return [...items].sort((a, b) => {
        const typeA = getTaskType(a);
        const typeB = getTaskType(b);
        return (typeOrder[typeA] ?? 3) - (typeOrder[typeB] ?? 3);
    });
}

/**
 * 根据筛选条件过滤items
 */
function filterRRItems(items) {
    return items.filter(item => {
        // 审核进度下拉筛选
        if (rrFilters.progress) {
            const reviewProgressMap = {
                '权益初审待审': '待初审',
                '权益复审待审': '待复审',
                '运营授权评估待审': '待终审',
                '已确权': '已确权'
            };
            const reviewStatusInfo = getItemReviewStatusDisplay(item);
            const progressText = reviewProgressMap[item.reviewStatus] || (reviewStatusInfo.isConfirmed ? '已确权' : '待初审');
            if (progressText !== rrFilters.progress) return false;
        }
        // 任务类型筛选
        if (rrFilters.taskType) {
            const itemTaskType = getTaskType(item);
            if (itemTaskType !== rrFilters.taskType) return false;
        }
        // 品类筛选
        if (rrFilters.category && item.category !== rrFilters.category) return false;
        // 法务复审结论筛选
        if (rrFilters.extAuth && item.externalAuthRights !== rrFilters.extAuth) return false;
        // 作品名称/任务ID搜索（模糊匹配）
        if (rrFilters.searchText) {
            const keyword = rrFilters.searchText.toLowerCase();
            const name = (item.workName || '').toLowerCase();
            const alias = (item.alias || '').toLowerCase();
            const taskId = (item.taskId || '').toLowerCase();
            if (!name.includes(keyword) && !alias.includes(keyword) && !taskId.includes(keyword)) return false;
        }
        return true;
    });
}

/**
 * 获取卡片的审核状态显示信息
 * 根据item.reviewStatus字段判断：
 *  - "已确权" => 绿色已确权
 *  - "xx待审" => 橙色xx待审
 *  - 无字段时，从全局reviewNodes推算当前待审节点
 */
function getItemReviewStatusDisplay(item) {
    // 优先使用item自身的reviewStatus字段
    if (item.reviewStatus) {
        if (item.reviewStatus === '已确权') {
            return { text: '已确权', className: 'rr-status-confirmed', isConfirmed: true };
        }
        return { text: item.reviewStatus, className: 'rr-status-node-pending', isConfirmed: false };
    }

    // 回退：从全局reviewNodes推算
    const nodes = authData.rightsReviewDetail?.reviewNodes || [];
    if (nodes.length > 0) {
        const allReviewed = nodes.every(n => n.status === 'reviewed');
        if (allReviewed) {
            return { text: '已确权', className: 'rr-status-confirmed', isConfirmed: true };
        }
        const pendingNode = nodes.find(n => n.status === 'pending');
        if (pendingNode) {
            return { text: `${pendingNode.name}待审`, className: 'rr-status-node-pending', isConfirmed: false };
        }
    }

    return { text: '综控初审待审', className: 'rr-status-node-pending', isConfirmed: false };
}

/**
 * 渲染授权审查页面
 */
function renderRightsReview() {
    const container = document.getElementById('rightsReviewContainer');
    if (!container || !authData || !authData.rightsReviewData) return;

    const categories = authData.rightsReviewData.categories || [];
    if (categories.length === 0) {
        container.innerHTML = `
            <div class="approval-empty-state">
                <i data-lucide="shield-check" style="width:32px;height:32px;color:var(--text-placeholder,#999);"></i>
                <p>暂无待审确权任务</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    // 收集所有品类（去重）
    const allCategories = [];
    categories.forEach(cat => {
        cat.items.forEach(item => {
            if (item.category && !allCategories.includes(item.category)) {
                allCategories.push(item.category);
            }
        });
    });

    const progressOptions = ['待初审', '待复审', '待终审', '已确权'];
    const taskTypeOptions = ['风险审查', '新热确权', '增补确权'];
    const extAuthOptions = ['可用', '不可用', '权利瑕疵'];

    container.innerHTML = categories.map(cat => {
        const typeClass = cat.type;
        return `
            <div class="rr-category-section ${typeClass}">
                <div class="rr-category-header">
                    <div class="rr-category-title-group">
                        <span class="rr-category-title">${cat.label}</span>
                    </div>
                    ${cat.type === 'ugc' ? `
                    <button class="btn-add-auth-ip" id="btnAddAuthIP" onclick="openAddAuthIPModal()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        <span>添加审查IP</span>
                    </button>` : ''}
                </div>
                <div class="rr-filter-bar" data-rr-filter-type="${cat.type}">
                    <div class="rr-filter-row rr-filter-row-selects">
                        <div class="rr-filter-select-group">
                            <label class="rr-filter-label">审核进度</label>
                            <select class="rr-filter-select" data-rr-filter="progress">
                                <option value="">全部进度</option>
                                ${progressOptions.map(o => `<option value="${o}" ${rrFilters.progress === o ? 'selected' : ''}>${o}</option>`).join('')}
                            </select>
                        </div>
                        <div class="rr-filter-select-group">
                            <label class="rr-filter-label">任务类型</label>
                            <select class="rr-filter-select" data-rr-filter="taskType">
                                <option value="">全部类型</option>
                                ${taskTypeOptions.map(o => `<option value="${o}" ${rrFilters.taskType === o ? 'selected' : ''}>${o}</option>`).join('')}
                            </select>
                        </div>
                        <div class="rr-filter-select-group">
                            <label class="rr-filter-label">品类</label>
                            <select class="rr-filter-select" data-rr-filter="category">
                                <option value="">全部品类</option>
                                ${allCategories.map(c => `<option value="${c}" ${rrFilters.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                            </select>
                        </div>
                        <div class="rr-filter-select-group">
                            <label class="rr-filter-label">法务复审结论</label>
                            <select class="rr-filter-select" data-rr-filter="extAuth">
                                <option value="">全部结论</option>
                                ${extAuthOptions.map(o => `<option value="${o}" ${rrFilters.extAuth === o ? 'selected' : ''}>${o}</option>`).join('')}
                            </select>
                        </div>
                        <div class="rr-filter-right">
                            <div class="rr-filter-search">
                                <input type="text" class="rr-search-input" placeholder="搜索作品名称/任务ID..." value="${rrFilters.searchText}" data-rr-filter="search">
                                <span class="rr-search-icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="rr-cards-grid" id="rrCardsGrid_${cat.type}">
                </div>
                <div class="rr-pagination-wrap" id="rrPagination_${cat.type}"></div>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // 绑定筛选事件
    bindRRFilterEvents();

    // 渲染各分类的卡片
    categories.forEach(cat => {
        const filteredItems = filterRRItems(cat.items);
        if (cat.type === 'ugc') {
            renderRRCards(cat.type, filteredItems, 1);
        } else {
            renderRRCards(cat.type, filteredItems, 1);
        }
    });
}

/**
 * 绑定筛选栏事件
 */
function bindRRFilterEvents() {
    // 审核进度下拉
    document.querySelectorAll('.rr-filter-select[data-rr-filter="progress"]').forEach(sel => {
        sel.addEventListener('change', function() {
            rrFilters.progress = this.value;
            rrUgcCurrentPage = 1;
            refreshRRWithFilters();
        });
    });

    // 任务类型下拉
    document.querySelectorAll('.rr-filter-select[data-rr-filter="taskType"]').forEach(sel => {
        sel.addEventListener('change', function() {
            rrFilters.taskType = this.value;
            rrUgcCurrentPage = 1;
            refreshRRWithFilters();
        });
    });

    // 品类下拉
    document.querySelectorAll('.rr-filter-select[data-rr-filter="category"]').forEach(sel => {
        sel.addEventListener('change', function() {
            rrFilters.category = this.value;
            rrUgcCurrentPage = 1;
            refreshRRWithFilters();
        });
    });

    // 法务复审结论下拉
    document.querySelectorAll('.rr-filter-select[data-rr-filter="extAuth"]').forEach(sel => {
        sel.addEventListener('change', function() {
            rrFilters.extAuth = this.value;
            rrUgcCurrentPage = 1;
            refreshRRWithFilters();
        });
    });

    // 作品名称搜索框输入（防抖）
    let searchTimer = null;
    document.querySelectorAll('.rr-search-input[data-rr-filter="search"]').forEach(input => {
        input.addEventListener('input', function() {
            clearTimeout(searchTimer);
            const val = this.value;
            searchTimer = setTimeout(() => {
                rrFilters.searchText = val;
                rrUgcCurrentPage = 1;
                refreshRRWithFilters();
            }, 300);
        });
    });

}

/**
 * 根据筛选条件刷新表格
 */
function refreshRRWithFilters() {
    const categories = authData.rightsReviewData?.categories || [];
    categories.forEach(cat => {
        const filteredItems = filterRRItems(cat.items);
        if (cat.type === 'ugc') {
            renderRRCards(cat.type, filteredItems, rrUgcCurrentPage);
        } else {
            renderRRCards(cat.type, filteredItems, 1);
        }
    });
}

/**
 * 渲染某一类别的待审卡片（含分页）
 */
function renderRRCards(type, items, page) {
    const grid = document.getElementById('rrCardsGrid_' + type);
    const paginationWrap = document.getElementById('rrPagination_' + type);
    if (!grid) return;

    // 按任务类型排序：风险审查优先展示
    items = sortByTaskType(items);

    // 分页计算
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / RR_PAGE_SIZE);
    const currentPage = Math.min(Math.max(page, 1), totalPages || 1);

    if (type === 'ugc') rrUgcCurrentPage = currentPage;

    const startIdx = (currentPage - 1) * RR_PAGE_SIZE;
    const pageItems = items.slice(startIdx, startIdx + RR_PAGE_SIZE);

    // 渲染表格
    const extAuthClassMap = { '可用': 'ext-auth-available', '不可用': 'ext-auth-unavailable', '权利瑕疵': 'ext-auth-defect' };

    // 审核进度映射
    const reviewProgressMap = {
        '权益初审待审': '待初审',
        '权益复审待审': '待复审',
        '运营授权评估待审': '待终审',
        '已确权': '已确权'
    };
    const reviewProgressClassMap = {
        '待初审': 'rr-progress-initial',
        '待复审': 'rr-progress-review',
        '待终审': 'rr-progress-final',
        '已确权': 'rr-progress-confirmed'
    };

    grid.innerHTML = `
        <div class="rr-table-wrap">
            <table class="rr-table">
                <thead>
                    <tr>
                        <th class="rr-th-taskid">审核任务ID</th>
                        <th>作品名称</th>
                        <th>别名</th>
                        <th>品类</th>
                        <th>版权ID</th>
                        <th class="rr-th-inittime">任务发起时间</th>
                        <th>任务类型</th>
                        <th>法务复审结论</th>
                        <th>审核进度</th>
                        <th class="rr-th-action">操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${pageItems.map((item, idx) => {
                        const extAuthClass = extAuthClassMap[item.externalAuthRights] || '';
                        const reviewStatusInfo = getItemReviewStatusDisplay(item);
                        const progressText = reviewProgressMap[item.reviewStatus] || (reviewStatusInfo.isConfirmed ? '已确权' : '待初审');
                        const progressClass = reviewProgressClassMap[progressText] || 'rr-progress-initial';

                        const rowTaskType = getTaskType(item);
                        const riskRowClass = rowTaskType === '风险审查' ? 'rr-row-risk' : '';

                        return `
                            <tr class="${reviewStatusInfo.isConfirmed ? 'rr-row-confirmed' : ''} ${riskRowClass}" data-rr-id="${item.id}">
                                <td class="rr-td-taskid" title="${item.taskId || ''}">${item.taskId || '-'}</td>
                                <td class="rr-td-name" title="${item.workName}">${item.workName}</td>
                                <td class="rr-td-alias" title="${item.alias || '-'}">${item.alias || '-'}</td>
                                <td>${item.category}</td>
                                <td class="rr-td-mono" title="${item.bqid || ''}">${item.bqid || ''}</td>
                                <td class="rr-td-inittime" title="${item.taskInitTime || ''}">${item.taskInitTime || '-'}</td>
                                <td><span class="rr-task-type-tag ${getTaskTypeClass(getTaskType(item))}">${getTaskType(item)}${getTaskType(item) === '风险审查' ? '<svg class="rr-risk-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' : ''}</span></td>
                                <td><span class="rr-bar-ext-auth ${extAuthClass}">${item.externalAuthRights || ''}</span></td>
                                <td><span class="rr-progress-tag ${progressClass}">${progressText}</span></td>
                                <td class="rr-td-action">
                                    <button class="rr-card-btn-review ${reviewStatusInfo.isConfirmed ? 'rr-card-btn-confirmed' : ''}" data-action="go-review" data-id="${item.id}" data-work="${item.workName}">${reviewStatusInfo.isConfirmed ? '查看详情' : '去审核'}</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // 渲染分页（只有二创权益需要分页）
    if (paginationWrap && totalPages > 1) {
        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push(`<button class="rr-page-btn ${i === currentPage ? 'active' : ''}" data-rr-page="${i}" data-rr-type="${type}">${i}</button>`);
        }
        paginationWrap.innerHTML = `
            <div class="rr-pagination">
                <button class="rr-page-btn rr-page-prev" ${currentPage <= 1 ? 'disabled' : ''} data-rr-page="${currentPage - 1}" data-rr-type="${type}">
                    <i data-lucide="chevron-left" style="width:14px;height:14px;"></i>
                </button>
                ${pages.join('')}
                <button class="rr-page-btn rr-page-next" ${currentPage >= totalPages ? 'disabled' : ''} data-rr-page="${currentPage + 1}" data-rr-type="${type}">
                    <i data-lucide="chevron-right" style="width:14px;height:14px;"></i>
                </button>
                <span class="rr-page-info">共 ${totalItems} 条</span>
            </div>
        `;

        if (typeof lucide !== 'undefined') lucide.createIcons();

        // 绑定分页事件
        paginationWrap.querySelectorAll('.rr-page-btn[data-rr-page]').forEach(btn => {
            btn.addEventListener('click', function() {
                if (this.disabled) return;
                const targetPage = parseInt(this.dataset.rrPage);
                const targetType = this.dataset.rrType;
                const categories = authData.rightsReviewData.categories || [];
                const cat = categories.find(c => c.type === targetType);
                if (cat) {
                    const filteredItems = filterRRItems(cat.items);
                    renderRRCards(targetType, filteredItems, targetPage);
                }
            });
        });
    } else if (paginationWrap) {
        paginationWrap.innerHTML = '';
    }
}

// ==================== 授权审查二级页 ====================

let currentReviewItem = null;

/**
 * 打开授权审查详情页
 */
function openRightsReviewDetail(itemId) {
    // 从所有分类中查找该item
    const categories = authData.rightsReviewData?.categories || [];
    let item = null;
    for (const cat of categories) {
        item = cat.items.find(i => i.id === itemId);
        if (item) break;
    }
    if (!item) return;

    currentReviewItem = item;

    // 隐藏首页内容
    const listSections = document.querySelectorAll(
        '.auth-management-page > .page-breadcrumb, .auth-management-page > .category-tabs, .auth-management-page > .auth-tab-content'
    );
    listSections.forEach(el => el.style.display = 'none');

    // 也隐藏项目详情页（如果从授权片单进入）
    const projectDetailPage = document.getElementById('projectDetailPage');
    if (projectDetailPage) projectDetailPage.style.display = 'none';

    // 显示授权审查详情页
    const page = document.getElementById('rightsReviewDetailPage');
    if (page) {
        page.style.display = 'block';
        page.style.animation = 'none';
        page.offsetHeight;
        page.style.animation = '';
    }

    document.getElementById('rrDetailPageTitle').textContent = `${item.workName} - 授权详情`;

    renderRRDetailInfo(item);
    renderRRReviewNodes();
    renderRRRightsList(item);

    if (typeof lucide !== 'undefined') lucide.createIcons();

    page.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * 关闭授权审查详情页
 */
function closeRightsReviewDetail() {
    currentReviewItem = null;

    const page = document.getElementById('rightsReviewDetailPage');
    if (page) page.style.display = 'none';

    // 恢复首页内容
    const breadcrumb = document.querySelector('.auth-management-page > .page-breadcrumb');
    const tabBar = document.querySelector('.auth-management-page > .category-tabs');
    if (breadcrumb) breadcrumb.style.display = '';
    if (tabBar) tabBar.style.display = '';

    const activeTab = document.querySelector('.auth-management-page .category-tab.active');
    if (activeTab) {
        showAuthTab(activeTab.dataset.authTab);
    } else {
        showAuthTab('rightsReview');
    }
}

/**
 * 从项目详情页跳转到授权审查详情页
 */
function openRightsReviewFromProject(itemId) {
    currentReviewItem = null;
    // 查找对应的授权审查项
    const categories = authData.rightsReviewData?.categories || [];
    let item = null;
    for (const cat of categories) {
        item = cat.items.find(i => i.bqid === itemId || i.id === itemId);
        if (item) break;
    }
    if (!item) {
        showBlankPage('确权信息', '未找到该作品的授权审查信息');
        return;
    }

    currentReviewItem = item;

    // 隐藏所有内容
    const listSections = document.querySelectorAll(
        '.auth-management-page > .page-breadcrumb, .auth-management-page > .category-tabs, .auth-management-page > .auth-tab-content'
    );
    listSections.forEach(el => el.style.display = 'none');
    const projectDetailPage = document.getElementById('projectDetailPage');
    if (projectDetailPage) projectDetailPage.style.display = 'none';

    const page = document.getElementById('rightsReviewDetailPage');
    if (page) {
        page.style.display = 'block';
        page.style.animation = 'none';
        page.offsetHeight;
        page.style.animation = '';
    }

    // 修改面包屑为从项目详情来的路径
    document.getElementById('rrDetailPageTitle').textContent = `${item.workName} - 授权详情`;
    const backBtn = document.getElementById('btnBackToRightsReview');
    if (backBtn) {
        backBtn.textContent = '返回';
        backBtn._fromProject = true;
    }

    renderRRDetailInfo(item);
    renderRRReviewNodes();
    renderRRRightsList(item);

    if (typeof lucide !== 'undefined') lucide.createIcons();
    page.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * 渲染作品基础信息
 */
function renderRRDetailInfo(item) {
    const container = document.getElementById('rrdInfoCard');
    if (!container) return;

    const infoNetClass = item.infoNetStatus === '生效中' ? 'info-net-active' : 'info-net-expired';
    const taskType = getTaskType(item);
    const taskTypeClass = getTaskTypeClass(taskType);

    container.innerHTML = `
        <div class="rrd-info-header">
            <div class="rrd-info-title-row">
                <div class="rrd-info-title-left">
                    <h2 class="rrd-info-name">${item.workName}</h2>
                </div>
                <button class="rrd-auth-history-btn" id="btnOpenAuthHistory" data-work-name="${item.workName}" data-bqid="${item.bqid || ''}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    授权历史
                </button>
            </div>
            <div class="rrd-info-tags">
                ${item.alias ? `<span class="rrd-tag-alias">别名：${item.alias}</span>` : ''}
                <span class="rrd-tag-category">${item.category}</span>
                <span class="rr-task-type-tag ${taskTypeClass}">${taskType}${taskType === '风险审查' ? '<svg class="rr-risk-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' : ''}</span>
            </div>
        </div>
        <div class="rrd-info-grid">
            <div class="rrd-info-field"><span class="rrd-info-label">审查任务ID</span><span class="rrd-info-value mono">${item.taskId || ''}</span></div>
            <div class="rrd-info-field"><span class="rrd-info-label">任务发起时间</span><span class="rrd-info-value">${item.taskInitTime || ''}</span></div>
            <div class="rrd-info-field"><span class="rrd-info-label">版权ID</span><span class="rrd-info-value mono">${item.bqid || ''}</span></div>
            <div class="rrd-info-field"><span class="rrd-info-label">CID</span><span class="rrd-info-value mono">${item.cid || ''}</span></div>
            <div class="rrd-info-field"><span class="rrd-info-label">权益ID</span><span class="rrd-info-value mono">${item.rightsId || ''}</span></div>
            <div class="rrd-info-field"><span class="rrd-info-label">合同号</span><span class="rrd-info-value mono">${item.contractNo || ''}</span></div>
            <div class="rrd-info-field"><span class="rrd-info-label">导演</span><span class="rrd-info-value">${item.director || ''}</span></div>
            <div class="rrd-info-field"><span class="rrd-info-label">主演</span><span class="rrd-info-value">${item.starring || ''}</span></div>
            <div class="rrd-info-field"><span class="rrd-info-label">出品年份</span><span class="rrd-info-value">${item.productionYear || ''}</span></div>
            <div class="rrd-info-field"><span class="rrd-info-label">制片地区</span><span class="rrd-info-value">${item.productionRegion || ''}</span></div>
            <div class="rrd-info-field"><span class="rrd-info-label">集数/期数</span><span class="rrd-info-value">${item.episodeCount || ''}</span></div>
            <div class="rrd-info-field"><span class="rrd-info-label">脱口秀品类</span><span class="rrd-info-value">${item.isTalkShow ? '是' : '否'}</span></div>
            <div class="rrd-info-field"><span class="rrd-info-label">信网权状态</span><span class="rrd-info-value"><span class="rr-bar-info-net ${infoNetClass}">${item.infoNetStatus || ''}</span></span></div>
        </div>
    `;

    // 绑定授权历史按钮事件
    const historyBtn = document.getElementById('btnOpenAuthHistory');
    if (historyBtn) {
        historyBtn.addEventListener('click', function() {
            openAuthHistoryDrawer(item);
        });
    }
}

/**
 * 获取节点状态标签的文本和CSS类名
 */
function getNodeStatusInfo(status) {
    switch (status) {
        case 'reviewed':
            return { text: '已审核', className: 'status-reviewed' };
        case 'terminated':
            return { text: '已终止', className: 'status-terminated' };
        case 'pending':
        default:
            return { text: '待审核', className: 'status-pending' };
    }
}

/**
 * 判断已审核节点是否可修改（下一节点为待审核时可修改）
 */
function canModifyReviewedNode(nodes, idx) {
    if (nodes[idx].status !== 'reviewed') return false;
    const nextNode = nodes[idx + 1];
    if (!nextNode) return false;
    return nextNode.status === 'pending';
}

/**
 * 找到当前活跃节点索引（第一个pending的节点，若全部reviewed则为最后一个）
 */
function findActiveNodeIndex(nodes) {
    const pendingIdx = nodes.findIndex(n => n.status === 'pending');
    if (pendingIdx >= 0) return pendingIdx;
    return nodes.length - 1;
}

/**
 * 获取当前IP下所有待审权益的 rightsId 列表
 */
function getPendingRightsIds() {
    if (!currentReviewItem) return [];
    const detailData = authData.rightsReviewDetail?.sampleRightsDetail || {};
    const rightsItems = detailData[currentReviewItem.id] || [];
    // 返回所有权益的 rightsId（即当前IP下方审核权利的权益ID）
    return rightsItems.map(ri => ri.rightsId).filter(Boolean);
}

/**
 * 初始化单个平台日期行的默认值和约束
 * 开始日期默认 = max(今天, 权利中authStartDate)
 * 两个日期的 min 都设为今天
 */
function initPlatformDateDefaults(dateRow) {
    const startInput = dateRow.querySelector('.node3-date-input-start');
    const endInput = dateRow.querySelector('.node3-date-input-end');
    if (!startInput || !endInput) return;

    // 今天的 YYYY-MM-DD
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // 获取权利数据中最晚的 authStartDate（格式 "2026.03.01"）
    let rightsEffectiveDate = null;
    if (currentReviewItem) {
        const detailData = authData.rightsReviewDetail?.sampleRightsDetail || {};
        const rightsItems = detailData[currentReviewItem.id] || [];
        rightsItems.forEach(ri => {
            if (ri.authStartDate) {
                const parts = ri.authStartDate.replace(/\./g, '-');
                const d = new Date(parts);
                if (!isNaN(d.getTime())) {
                    if (!rightsEffectiveDate || d > rightsEffectiveDate) {
                        rightsEffectiveDate = d;
                    }
                }
            }
        });
    }

    // 设置 min 为今天（过去时间不可选）
    startInput.min = todayStr;
    endInput.min = todayStr;

    // 默认开始日期 = max(今天, 权利可生效时间)
    if (!startInput.value) {
        let defaultStart = today;
        if (rightsEffectiveDate && rightsEffectiveDate > today) {
            defaultStart = rightsEffectiveDate;
        }
        startInput.value = defaultStart.toISOString().slice(0, 10);
    }

    // 开始日期变化时，结束日期的 min 需跟随
    startInput.addEventListener('change', function() {
        if (this.value) {
            endInput.min = this.value;
            if (endInput.value && endInput.value < this.value) {
                endInput.value = '';
            }
        }
    });

    // 立即同步一次：结束日期的 min 至少 = 开始日期
    if (startInput.value) {
        endInput.min = startInput.value;
    }
}

/**
 * 根据已勾选的平台动态渲染/销毁各平台对应的授权起止时间行
 */
function updatePlatformDateFields(container) {
    const dateContainer = container.querySelector('.node3-platform-date-container');
    if (!dateContainer) return;

    // 获取当前已勾选的平台
    const checkedPlatforms = Array.from(container.querySelectorAll('input[name="node3_authPlatform"]:checked')).map(cb => cb.value);

    // 获取当前已存在的日期行，保留已有值
    const existingRows = {};
    dateContainer.querySelectorAll('.node3-platform-date-row').forEach(row => {
        const platform = row.dataset.platform;
        const startVal = row.querySelector('.node3-date-input-start')?.value || '';
        const endVal = row.querySelector('.node3-date-input-end')?.value || '';
        existingRows[platform] = { startVal, endVal };
    });

    // 清空容器重新渲染
    dateContainer.innerHTML = '';

    // 按勾选顺序渲染
    checkedPlatforms.forEach(platform => {
        const row = document.createElement('div');
        row.className = 'node3-platform-date-row rrd-panel-row';
        row.dataset.platform = platform;
        row.innerHTML = `
            <label class="rrd-panel-label rrd-panel-label-required">${platform}授权起止时间</label>
            <div class="node3-date-range-wrap">
                <input type="date" class="node3-date-input node3-date-input-start" data-platform="${platform}" title="${platform}授权开始日期">
                <span class="node3-date-separator">—</span>
                <input type="date" class="node3-date-input node3-date-input-end" data-platform="${platform}" title="${platform}授权结束日期">
            </div>
        `;
        dateContainer.appendChild(row);

        // 恢复之前已有的值
        if (existingRows[platform]) {
            const startInput = row.querySelector('.node3-date-input-start');
            const endInput = row.querySelector('.node3-date-input-end');
            if (startInput && existingRows[platform].startVal) startInput.value = existingRows[platform].startVal;
            if (endInput && existingRows[platform].endVal) endInput.value = existingRows[platform].endVal;
        }

        // 初始化默认值和约束
        initPlatformDateDefaults(row);
    });
}

/**
 * 渲染审核节点条
 */
function renderRRReviewNodes() {
    const container = document.getElementById('rrdReviewNodes');
    if (!container || !authData.rightsReviewDetail) return;

    const nodes = authData.rightsReviewDetail.reviewNodes || [];
    const activeIdx = findActiveNodeIndex(nodes);

    // 生成左侧审核流程时间轴节点
    function renderTimelineNode(node, idx) {
        const isReviewed = node.status === 'reviewed';
        const isTerminated = node.status === 'terminated';
        const isPending = node.status === 'pending';
        const isActive = idx === activeIdx;
        const isClickable = isReviewed || isActive;
        // 颜色状态：已结束=浅蓝，进行中=深蓝，未到达=灰色
        let dotClass = 'tl-dot-gray';
        if (isReviewed || isTerminated) dotClass = 'tl-dot-light-blue';
        if (isActive) dotClass = 'tl-dot-dark-blue';

        // 审核结果信息（已审核才展示）
        let resultHtml = '';
        if (isReviewed) {
            resultHtml = renderTimelineResult(node);
        } else if (isTerminated) {
            resultHtml = `<div class="tl-result"><span class="tl-result-tag tl-tag-terminated">已终止</span></div>`;
        }

        return `
        <div class="tl-node ${isActive ? 'tl-node-active' : ''} ${isReviewed ? 'tl-node-reviewed' : ''} ${!isClickable ? 'tl-node-disabled' : ''}" data-node-id="${node.id}" data-node-idx="${idx}">
            <div class="tl-dot-wrap">
                <div class="tl-dot ${dotClass}">
                    ${isReviewed ? '<span class="tl-dot-check">✓</span>' : `<span class="tl-dot-num">${idx + 1}</span>`}
                </div>
                ${idx < nodes.length - 1 ? '<div class="tl-line"></div>' : ''}
            </div>
            <div class="tl-content">
                <div class="tl-header">
                    <span class="tl-name">${node.name}</span>
                    <span class="tl-role">${node.role}</span>
                </div>
                ${isReviewed && node.reviewTime ? `<div class="tl-time">${node.reviewTime}</div>` : ''}
                ${resultHtml}
            </div>
        </div>`;
    }

    // 根据已审核节点数据生成结果摘要
    function renderTimelineResult(node) {
        let items = [];
        if (node.id === 'node-1') {
            if (node.conclusion) {
                const cls = node.conclusion === '可用' ? 'tl-tag-available' : 'tl-tag-defect';
                items.push(`<span class="tl-result-tag ${cls}">${node.conclusion}</span>`);
            }
            if (node.conclusion === '权利瑕疵' && node.defectType) {
                items.push(`<span class="tl-result-detail">${node.defectType}</span>`);
            }
        } else if (node.id === 'node-2') {
            if (node.conclusion) {
                const cls = node.conclusion === '可用' ? 'tl-tag-available' : 'tl-tag-defect';
                items.push(`<span class="tl-result-tag ${cls}">${node.conclusion}</span>`);
            }
            if (node.authBasisRightsId) {
                items.push(`<span class="tl-result-detail">权利：${node.authBasisRightsId}</span>`);
            }
            if (node.disposal) {
                items.push(`<span class="tl-result-detail">${node.disposal}</span>`);
            }
        } else if (node.id === 'node-3') {
            if (node.authJudge) {
                const cls = node.authJudge === '可授权' ? 'tl-tag-available' : 'tl-tag-deny';
                items.push(`<span class="tl-result-tag ${cls}">${node.authJudge}</span>`);
            }
            if (node.authJudge === '不授权' && node.denyReason) {
                items.push(`<span class="tl-result-detail">${node.denyReason}</span>`);
            }
            if (node.authJudge === '可授权' && node.authPlatform) {
                items.push(`<span class="tl-result-detail">平台：${node.authPlatform}</span>`);
            }
            if (node.authJudge === '可授权' && node.platformDates) {
                Object.entries(node.platformDates).forEach(([platform, dateInfo]) => {
                    items.push(`<span class="tl-result-detail">${platform}：${dateInfo.display}</span>`);
                });
            }
        }
        if (items.length === 0) return '';
        return `<div class="tl-result">${items.join('')}</div>`;
    }

    // 确定当前展示的节点（优先活跃节点）
    const currentIdx = activeIdx >= 0 ? activeIdx : nodes.length - 1;
    const currentNode = nodes[currentIdx];
    const currentNodeName = currentNode ? currentNode.name : '审核';

    container.innerHTML = `
        <div class="rrd-split-layout">
            <div class="rrd-split-left">
                <div class="rrd-split-left-title">审核流程</div>
                <div class="rrd-timeline">
                    ${nodes.map((node, idx) => renderTimelineNode(node, idx)).join('')}
                </div>
            </div>
            <div class="rrd-split-divider"></div>
            <div class="rrd-split-right">
                <div class="rrd-split-right-title">${currentNodeName}</div>
                <div class="rrd-node-panels">
                    ${nodes.map((node, idx) => renderNodePanel(node, idx, nodes)).join('')}
                </div>
            </div>
        </div>
    `;

    // 绑定左侧时间轴节点点击事件（切换右侧面板）
    container.querySelectorAll('.tl-node').forEach(nodeEl => {
        nodeEl.addEventListener('click', function() {
            if (this.classList.contains('tl-node-disabled')) return;
            // 更新左侧选中高亮
            container.querySelectorAll('.tl-node').forEach(n => n.classList.remove('tl-node-active'));
            this.classList.add('tl-node-active');
            const nodeId = this.dataset.nodeId;
            const nodeIdx = parseInt(this.dataset.nodeIdx, 10);
            // 切换右侧面板
            container.querySelectorAll('.rrd-node-panel').forEach(p => {
                p.style.display = p.dataset.nodeId === nodeId ? 'block' : 'none';
            });
            // 更新右侧标题
            const titleEl = container.querySelector('.rrd-split-right-title');
            if (titleEl && nodes[nodeIdx]) {
                titleEl.textContent = nodes[nodeIdx].name;
            }
        });
    });

    // 绑定节点内交互事件
    bindNodeInteractions(container);
}

/**
 * 渲染已审核节点的只读面板
 */
function renderReviewedPanel(node, idx, nodes) {
    const showModifyBtn = canModifyReviewedNode(nodes, idx);
    let conclusionHtml = '';

    if (node.id === 'node-1') {
        const conclusionClass = node.conclusion === '可用' ? 'conclusion-available' : 'conclusion-defect';
        conclusionHtml = `
            <div class="rrd-reviewed-row">
                <span class="rrd-reviewed-label">人审结论</span>
                <span class="rrd-reviewed-value ${conclusionClass}">${node.conclusion || '-'}</span>
            </div>
            ${node.conclusion === '权利瑕疵' && node.defectType ? `
            <div class="rrd-reviewed-row">
                <span class="rrd-reviewed-label">瑕疵类型</span>
                <span class="rrd-reviewed-value">${node.defectType}</span>
            </div>` : ''}
            ${node.conclusion === '权利瑕疵' && node.remark ? `
            <div class="rrd-reviewed-row">
                <span class="rrd-reviewed-label">权益初审备注</span>
                <span class="rrd-reviewed-value">${node.remark}</span>
            </div>` : ''}
        `;
    } else if (node.id === 'node-2') {
        const conclusionClass = node.conclusion === '权利可用' ? 'conclusion-available' : 'conclusion-defect';
        conclusionHtml = `
            <div class="rrd-reviewed-row">
                <span class="rrd-reviewed-label">人审结论</span>
                <span class="rrd-reviewed-value ${conclusionClass}">${node.conclusion || '-'}</span>
            </div>
            ${node.authBasisRightsId ? `
            <div class="rrd-reviewed-row">
                <span class="rrd-reviewed-label">授权依据的引入权利</span>
                <span class="rrd-reviewed-value mono">${node.authBasisRightsId}</span>
            </div>` : ''}
            ${node.disposal ? `
            <div class="rrd-reviewed-row">
                <span class="rrd-reviewed-label">瑕疵处置方式</span>
                <span class="rrd-reviewed-value">${node.disposal}</span>
            </div>` : ''}
            ${node.defectReason ? `
            <div class="rrd-reviewed-row">
                <span class="rrd-reviewed-label">瑕疵原因</span>
                <span class="rrd-reviewed-value">${node.defectReason}</span>
            </div>` : ''}
        `;
    } else if (node.id === 'node-3') {
        const judgeClass = node.authJudge === '可授权' ? 'conclusion-available' : 'conclusion-deny';
        conclusionHtml = `
            <div class="rrd-reviewed-row">
                <span class="rrd-reviewed-label">授权判断</span>
                <span class="rrd-reviewed-value ${judgeClass}">${node.authJudge || '-'}</span>
            </div>
            ${node.defectDisposalConclusion ? `
            <div class="rrd-reviewed-row">
                <span class="rrd-reviewed-label">瑕疵处置结论</span>
                <span class="rrd-reviewed-value">${node.defectDisposalConclusion}</span>
            </div>` : ''}
            ${node.authJudge === '不授权' && node.denyReason ? `
            <div class="rrd-reviewed-row">
                <span class="rrd-reviewed-label">不授权原因</span>
                <span class="rrd-reviewed-value">${node.denyReason}</span>
            </div>` : ''}
            ${node.authJudge === '可授权' && node.authPlatform ? `
            <div class="rrd-reviewed-row">
                <span class="rrd-reviewed-label">可授权平台</span>
                <span class="rrd-reviewed-value">${node.authPlatform}</span>
            </div>` : ''}
            ${node.authJudge === '可授权' && node.platformDates ? Object.entries(node.platformDates).map(([platform, dateInfo]) => `
            <div class="rrd-reviewed-row">
                <span class="rrd-reviewed-label">${platform}授权起止时间</span>
                <span class="rrd-reviewed-value">${dateInfo.display}</span>
            </div>`).join('') : ''}
        `;
    }

    const activeIdx = findActiveNodeIndex(nodes);
    const isActive = idx === activeIdx;

    return `
    <div class="rrd-node-panel rrd-node-panel-reviewed" data-node-id="${node.id}" style="display:${isActive ? 'block' : 'none'};">
        <div class="rrd-reviewed-header">
            <div class="rrd-reviewed-meta">
                <span class="rrd-reviewed-meta-item"><i class="rrd-icon-user"></i> 审核人：${node.reviewer || '-'}</span>
                <span class="rrd-reviewed-meta-item"><i class="rrd-icon-time"></i> 审核时间：${node.reviewTime || '-'}</span>
            </div>
            ${showModifyBtn ? `<button class="rrd-modify-btn" data-node-id="${node.id}" data-node-idx="${idx}">修改</button>` : ''}
        </div>
        ${conclusionHtml}
    </div>`;
}

/**
 * 渲染单个审核节点面板
 */
function renderNodePanel(node, idx, nodes) {
    const activeIdx = findActiveNodeIndex(nodes);

    // 已审核节点：只读展示模式
    if (node.status === 'reviewed') {
        return renderReviewedPanel(node, idx, nodes);
    }

    // 已终止节点：只读展示（不可修改）
    if (node.status === 'terminated') {
        return renderReviewedPanel(node, idx, nodes);
    }

    // 待审核且是当前活跃节点：可编辑模式
    const isActive = idx === activeIdx;

    if (node.id === 'node-1') {
        const defectTypeOptions = node.defectTypeOptions || ['转授或剪辑需书面确认', '联合转授', '收益共享', '无剪辑权', '非独可转授'];
        return `
        <div class="rrd-node-panel" data-node-id="${node.id}" style="display:${isActive ? 'block' : 'none'};">
            <div class="rrd-panel-row">
                <label class="rrd-panel-label rrd-panel-label-required">人审结论</label>
                <div class="rrd-panel-options">
                    ${node.conclusionOptions.map(opt => `
                        <label class="rrd-radio-item">
                            <input type="radio" name="node1_conclusion" value="${opt}">
                            <span class="rrd-radio-text ${opt === '可用' ? 'opt-available' : 'opt-defect'}">${opt}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
            <div class="node1-defect-fields" style="display:none;">
                <div class="rrd-panel-row">
                    <label class="rrd-panel-label rrd-panel-label-required">瑕疵类型</label>
                    <div class="rrd-panel-options rrd-panel-options-wrap">
                        ${defectTypeOptions.map(opt => `
                            <label class="rrd-radio-item">
                                <input type="radio" name="node1_defectType" value="${opt}">
                                <span class="rrd-radio-text">${opt}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="rrd-panel-row">
                    <label class="rrd-panel-label">权益初审备注</label>
                    <div class="rrd-textarea-wrap">
                        <textarea class="rrd-textarea" name="node1_remark" placeholder="可备注关键合同原文或审查意见" rows="3" maxlength="1000">${node.remark || ''}</textarea>
                        <span class="rrd-textarea-count"><span class="rrd-textarea-current">0</span>/1000</span>
                    </div>
                </div>
            </div>
            <div class="rrd-panel-submit-row">
                <button class="rrd-submit-conclusion-btn" data-node-id="${node.id}" data-node-idx="${idx}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    提交审查结论
                </button>
            </div>
        </div>`;
    }

    if (node.id === 'node-2') {
        const defectTypeOptions = node.defectTypeOptions || ['转授或剪辑需书面确认', '联合转授', '收益共享', '无剪辑权', '非独可转授'];
        const disposalOptions = node.disposalOptions || ['需补剪辑确认函', '需补权利回收函', '需补其他文件，待沟通'];
        // 获取上一节点（node-1）的结论用于默认填充
        const prevNode = nodes.find(n => n.id === 'node-1');
        const prevConclusion = (prevNode && prevNode.status === 'reviewed') ? prevNode.conclusion : '';
        const prevDefectType = (prevNode && prevNode.status === 'reviewed') ? (prevNode.defectType || '') : '';
        const showDefect = prevConclusion === '权利瑕疵';
        // 获取当前IP下所有待审权益的 rightsId 列表
        const pendingRightsIds = getPendingRightsIds();
        const autoSelectSingle = pendingRightsIds.length === 1;
        const savedAuthBasis = node.authBasisRightsId || '';
        return `
        <div class="rrd-node-panel" data-node-id="${node.id}" style="display:${isActive ? 'block' : 'none'};"
             data-prev-conclusion="${prevConclusion}" data-prev-defect-type="${prevDefectType}">
            <div class="rrd-panel-row">
                <label class="rrd-panel-label rrd-panel-label-required">人审结论</label>
                <div class="rrd-panel-options">
                    ${node.conclusionOptions.map(opt => `
                        <label class="rrd-radio-item">
                            <input type="radio" name="node2_conclusion" value="${opt}" ${opt === prevConclusion ? 'checked' : ''}>
                            <span class="rrd-radio-text ${opt === '可用' ? 'opt-available' : 'opt-defect'}">${opt}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
            <div class="rrd-panel-row">
                <label class="rrd-panel-label rrd-panel-label-required">授权依据的引入权利</label>
                <div class="rrd-panel-options rrd-panel-options-wrap">
                    ${pendingRightsIds.map(rid => `
                        <label class="rrd-radio-item">
                            <input type="radio" name="node2_authBasisRightsId" value="${rid}" ${(savedAuthBasis === rid || (autoSelectSingle && !savedAuthBasis)) ? 'checked' : ''}>
                            <span class="rrd-radio-text">${rid}</span>
                        </label>
                    `).join('')}
                    ${pendingRightsIds.length === 0 ? '<span class="rrd-panel-hint" style="color:var(--text-placeholder);font-size:12px;">暂无待审权益</span>' : ''}
                </div>
            </div>
            <div class="node2-defect-fields" style="display:${showDefect ? '' : 'none'};">
                <div class="rrd-panel-row">
                    <label class="rrd-panel-label rrd-panel-label-required">瑕疵类型</label>
                    <div class="rrd-panel-options rrd-panel-options-wrap">
                        ${defectTypeOptions.map(opt => `
                            <label class="rrd-radio-item">
                                <input type="radio" name="node2_defectType" value="${opt}" ${opt === prevDefectType ? 'checked' : ''}>
                                <span class="rrd-radio-text">${opt}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="rrd-panel-row">
                    <label class="rrd-panel-label rrd-panel-label-required">瑕疵处置方式</label>
                    <div class="rrd-panel-options rrd-panel-options-wrap">
                        ${disposalOptions.map(opt => `
                            <label class="rrd-radio-item">
                                <input type="radio" name="node2_disposal" value="${opt}">
                                <span class="rrd-radio-text">${opt}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="rrd-panel-row">
                    <label class="rrd-panel-label">权益复审备注</label>
                    <div class="rrd-textarea-wrap">
                        <textarea class="rrd-textarea" name="node2_remark" placeholder="可备注关键合同原文或审查意见" rows="3" maxlength="1000">${node.remark || ''}</textarea>
                        <span class="rrd-textarea-count"><span class="rrd-textarea-current">0</span>/1000</span>
                    </div>
                </div>
            </div>
            <div class="rrd-panel-submit-row">
                <button class="rrd-submit-conclusion-btn" data-node-id="${node.id}" data-node-idx="${idx}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    提交审查结论
                </button>
            </div>
        </div>`;
    }

    if (node.id === 'node-3') {
        const defectDisposalConclusionOptions = node.defectDisposalConclusionOptions || ['可补确认函', '无法补确认函', '不补函'];
        const allDenyReasonOptions = node.denyReasonOptions || ['时长考量', '内容考量', '无法补确认函'];
        const authPlatformOptions = node.authPlatformOptions || ['快手', '抖音'];
        // 判断上一节点（node-2）是否为权利瑕疵且有处置方式
        const prevNode2 = nodes.find(n => n.id === 'node-2');
        const showDefectDisposal = prevNode2 && prevNode2.status === 'reviewed' && prevNode2.conclusion === '权利瑕疵' && prevNode2.disposal;
        // 复审结论为「可用」时，不授权原因中排除「无法补确认函」
        const prevNode2IsAvailable = prevNode2 && prevNode2.status === 'reviewed' && prevNode2.conclusion === '可用';
        const denyReasonOptions = prevNode2IsAvailable ? allDenyReasonOptions.filter(opt => opt !== '无法补确认函') : allDenyReasonOptions;
        return `
        <div class="rrd-node-panel" data-node-id="${node.id}" style="display:${isActive ? 'block' : 'none'};"
             data-show-defect-disposal="${showDefectDisposal ? 'true' : 'false'}">
            <div class="rrd-panel-row">
                <label class="rrd-panel-label rrd-panel-label-required">授权判断</label>
                <div class="rrd-panel-options">
                    ${node.authJudgeOptions.map(opt => `
                        <label class="rrd-radio-item">
                            <input type="radio" name="node3_authJudge" value="${opt}">
                            <span class="rrd-radio-text ${opt === '可授权' ? 'opt-available' : 'opt-deny'}">${opt}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
            <div class="node3-defect-disposal-fields" style="display:${showDefectDisposal ? '' : 'none'};">
                <div class="rrd-panel-row">
                    <label class="rrd-panel-label rrd-panel-label-required">瑕疵处置结论</label>
                    <div class="rrd-panel-options rrd-panel-options-wrap">
                        ${defectDisposalConclusionOptions.map(opt => `
                            <label class="rrd-radio-item">
                                <input type="radio" name="node3_defectDisposalConclusion" value="${opt}">
                                <span class="rrd-radio-text">${opt}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="node3-deny-fields" style="display:none;">
                <div class="rrd-panel-row">
                    <label class="rrd-panel-label rrd-panel-label-required">不授权原因</label>
                    <div class="rrd-panel-options rrd-panel-options-wrap">
                        ${denyReasonOptions.map(opt => `
                            <label class="rrd-radio-item">
                                <input type="radio" name="node3_denyReason" value="${opt}">
                                <span class="rrd-radio-text">${opt}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="node3-auth-platform-fields" style="display:none;">
                <div class="rrd-panel-row">
                    <label class="rrd-panel-label rrd-panel-label-required">可授权平台</label>
                    <div class="rrd-panel-options">
                        ${authPlatformOptions.map(opt => `
                            <label class="rrd-checkbox-item">
                                <input type="checkbox" name="node3_authPlatform" value="${opt}">
                                <span class="rrd-checkbox-text">${opt}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="node3-platform-date-container"></div>
            </div>
            <div class="rrd-panel-submit-row">
                <button class="rrd-submit-conclusion-btn" data-node-id="${node.id}" data-node-idx="${idx}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    提交审查结论
                </button>
            </div>
        </div>`;
    }

    return '';
}

/**
 * 绑定审核节点内的交互事件
 */
function bindNodeInteractions(container) {
    // 节点三：授权判断联动——选择「不授权」显示不授权原因+隐藏可授权平台，选择「可授权」显示可授权平台+隐藏不授权原因
    const node3Radios = container.querySelectorAll('input[name="node3_authJudge"]');
    node3Radios.forEach(radio => {
        radio.addEventListener('change', function() {
            const denyFields = container.querySelector('.node3-deny-fields');
            const platformFields = container.querySelector('.node3-auth-platform-fields');
            if (this.value === '不授权') {
                // 显示不授权原因
                if (denyFields) denyFields.style.display = '';
                // 隐藏并清除可授权平台及平台日期
                if (platformFields) {
                    platformFields.style.display = 'none';
                    platformFields.querySelectorAll('input[name="node3_authPlatform"]').forEach(cb => cb.checked = false);
                    const dateContainer = platformFields.querySelector('.node3-platform-date-container');
                    if (dateContainer) dateContainer.innerHTML = '';
                }
            } else {
                // 显示可授权平台
                if (platformFields) platformFields.style.display = '';
                // 隐藏并清除不授权原因
                if (denyFields) {
                    denyFields.style.display = 'none';
                    denyFields.querySelectorAll('input[name="node3_denyReason"]').forEach(r => r.checked = false);
                }
            }
        });
    });

    // 节点三：可授权平台checkbox联动——勾选/取消勾选时动态渲染对应平台的授权起止时间
    const node3PlatformCheckboxes = container.querySelectorAll('input[name="node3_authPlatform"]');
    node3PlatformCheckboxes.forEach(cb => {
        cb.addEventListener('change', function() {
            updatePlatformDateFields(container);
        });
    });

    // 修改按钮：点击后将已审核节点切换回可编辑模式
    container.querySelectorAll('.rrd-modify-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const nodeId = this.dataset.nodeId;
            const nodeIdx = parseInt(this.dataset.nodeIdx, 10);
            const nodes = authData.rightsReviewDetail.reviewNodes || [];
            const node = nodes[nodeIdx];
            if (!node) return;

            // 将节点状态临时切回pending以渲染可编辑面板
            node.status = 'pending';

            // 重新渲染整个审核节点区域
            renderRRReviewNodes();

            // 切换到该节点面板（适配新布局）
            const newContainer = document.getElementById('rrdReviewNodes');
            if (newContainer) {
                // 左侧时间轴高亮
                newContainer.querySelectorAll('.tl-node').forEach(n => n.classList.remove('tl-node-active'));
                const targetTlNode = newContainer.querySelector(`.tl-node[data-node-id="${nodeId}"]`);
                if (targetTlNode) targetTlNode.classList.add('tl-node-active');
                // 右侧面板切换
                newContainer.querySelectorAll('.rrd-node-panel').forEach(p => {
                    p.style.display = p.dataset.nodeId === nodeId ? 'block' : 'none';
                });
                // 更新右侧标题
                const titleEl = newContainer.querySelector('.rrd-split-right-title');
                if (titleEl && node) titleEl.textContent = node.name;
            }
        });
    });

    // node-1 人审结论联动：选择"权利瑕疵"时展开瑕疵类型+备注，选择"可用"时收起
    container.querySelectorAll('input[name="node1_conclusion"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const defectFields = container.querySelector('.node1-defect-fields');
            if (!defectFields) return;
            if (this.value === '权利瑕疵') {
                defectFields.style.display = '';
            } else {
                defectFields.style.display = 'none';
                // 清除已选的瑕疵类型
                defectFields.querySelectorAll('input[name="node1_defectType"]').forEach(r => r.checked = false);
                // 清除备注内容
                const textarea = defectFields.querySelector('textarea[name="node1_remark"]');
                if (textarea) {
                    textarea.value = '';
                    const countEl = defectFields.querySelector('.rrd-textarea-current');
                    if (countEl) countEl.textContent = '0';
                }
            }
        });
    });

    // node-2 人审结论联动：选择"权利瑕疵"时展开瑕疵类型+处置方式+备注，选择"可用"时收起
    container.querySelectorAll('input[name="node2_conclusion"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const defectFields = container.querySelector('.node2-defect-fields');
            if (!defectFields) return;
            if (this.value === '权利瑕疵') {
                defectFields.style.display = '';
            } else {
                defectFields.style.display = 'none';
                // 清除已选的瑕疵类型
                defectFields.querySelectorAll('input[name="node2_defectType"]').forEach(r => r.checked = false);
                // 清除已选的处置方式
                defectFields.querySelectorAll('input[name="node2_disposal"]').forEach(r => r.checked = false);
                // 清除备注内容
                const textarea = defectFields.querySelector('textarea[name="node2_remark"]');
                if (textarea) {
                    textarea.value = '';
                    const countEl = defectFields.querySelector('.rrd-textarea-current');
                    if (countEl) countEl.textContent = '0';
                }
            }
        });
    });

    // textarea 字数统计
    container.querySelectorAll('.rrd-textarea-wrap .rrd-textarea').forEach(textarea => {
        const countEl = textarea.parentElement.querySelector('.rrd-textarea-current');
        if (!countEl) return;
        const maxLen = parseInt(textarea.getAttribute('maxlength'), 10) || 1000;
        // 初始化字数
        countEl.textContent = textarea.value.length;
        if (textarea.value.length > maxLen) countEl.classList.add('over-limit');
        textarea.addEventListener('input', function() {
            countEl.textContent = this.value.length;
            countEl.classList.toggle('over-limit', this.value.length > maxLen);
        });
    });

    // 提交审查结论按钮
    container.querySelectorAll('.rrd-submit-conclusion-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const nodeId = this.dataset.nodeId;
            const nodeIdx = parseInt(this.dataset.nodeIdx, 10);
            const nodes = authData.rightsReviewDetail.reviewNodes || [];
            const node = nodes[nodeIdx];
            if (!node) return;

            const panel = container.querySelector(`.rrd-node-panel[data-node-id="${nodeId}"]`);
            if (!panel) return;

            // 根据不同节点收集表单数据并校验
            if (nodeId === 'node-1') {
                const conclusion = panel.querySelector('input[name="node1_conclusion"]:checked');
                if (!conclusion) {
                    showToast('请先选择人审结论', 'warning');
                    return;
                }
                node.conclusion = conclusion.value;
                // 选择"权利瑕疵"时，瑕疵类型必填
                if (conclusion.value === '权利瑕疵') {
                    const defectType = panel.querySelector('input[name="node1_defectType"]:checked');
                    if (!defectType) {
                        showToast('请先选择瑕疵类型', 'warning');
                        return;
                    }
                    node.defectType = defectType.value;
                    node.remark = panel.querySelector('textarea[name="node1_remark"]')?.value || '';
                } else {
                    // 选择"可用"时清空瑕疵相关字段
                    node.defectType = '';
                    node.remark = '';
                }
                node.reviewer = '当前用户';
                node.reviewTime = new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-');
            } else if (nodeId === 'node-2') {
                const conclusion = panel.querySelector('input[name="node2_conclusion"]:checked');
                if (!conclusion) {
                    showToast('请先选择人审结论', 'warning');
                    return;
                }
                // 校验授权依据的引入权利
                const authBasis = panel.querySelector('input[name="node2_authBasisRightsId"]:checked');
                if (!authBasis) {
                    showToast('请先选择授权依据的引入权利', 'warning');
                    return;
                }
                node.authBasisRightsId = authBasis.value;
                const disposal = panel.querySelector('input[name="node2_disposal"]:checked');
                node.conclusion = conclusion.value;
                node.disposal = disposal ? disposal.value : '';
                node.defectReason = panel.querySelector('.rrd-textarea')?.value || '';
                node.reviewer = '当前用户';
                node.reviewTime = new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-');
            } else if (nodeId === 'node-3') {
                const authJudge = panel.querySelector('input[name="node3_authJudge"]:checked');
                if (!authJudge) {
                    showToast('请先选择授权判断', 'warning');
                    return;
                }
                node.authJudge = authJudge.value;
                // 瑕疵处置结论：仅在上一节点为权利瑕疵且有处置方式时必填
                const showDefectDisposal = panel.dataset.showDefectDisposal === 'true';
                if (showDefectDisposal) {
                    const defectDisposalConclusion = panel.querySelector('input[name="node3_defectDisposalConclusion"]:checked');
                    if (!defectDisposalConclusion) {
                        showToast('请先选择瑕疵处置结论', 'warning');
                        return;
                    }
                    node.defectDisposalConclusion = defectDisposalConclusion.value;
                } else {
                    node.defectDisposalConclusion = '';
                }
                if (authJudge.value === '不授权') {
                    const denyReason = panel.querySelector('input[name="node3_denyReason"]:checked');
                    if (!denyReason) {
                        showToast('请先选择不授权原因', 'warning');
                        return;
                    }
                    node.denyReason = denyReason.value;
                    node.authPlatform = '';
                } else {
                    // 可授权时，校验可授权平台（多选）
                    const checkedPlatforms = panel.querySelectorAll('input[name="node3_authPlatform"]:checked');
                    if (checkedPlatforms.length === 0) {
                        showToast('请至少选择一个可授权平台', 'warning');
                        return;
                    }
                    node.authPlatform = Array.from(checkedPlatforms).map(cb => cb.value).join('、');
                    node.denyReason = '';

                    // 格式化为 xxxx年xx月xx日
                    function formatDateCN(dateStr) {
                        const d = new Date(dateStr);
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        return `${y}年${m}月${day}日`;
                    }

                    // 按平台校验授权起止时间（每个勾选平台均必填）
                    const platformDateRows = panel.querySelectorAll('.node3-platform-date-row');
                    const platformDates = {};
                    for (const row of platformDateRows) {
                        const platform = row.dataset.platform;
                        const startInput = row.querySelector('.node3-date-input-start');
                        const endInput = row.querySelector('.node3-date-input-end');
                        if (!startInput || !startInput.value) {
                            showToast(`请选择${platform}授权开始日期`, 'warning');
                            return;
                        }
                        if (!endInput || !endInput.value) {
                            showToast(`请选择${platform}授权结束日期`, 'warning');
                            return;
                        }
                        if (endInput.value <= startInput.value) {
                            showToast(`${platform}授权结束日期必须晚于开始日期`, 'warning');
                            return;
                        }
                        platformDates[platform] = {
                            start: startInput.value,
                            end: endInput.value,
                            display: `${formatDateCN(startInput.value)} - ${formatDateCN(endInput.value)}`
                        };
                    }
                    node.platformDates = platformDates;
                    // 兼容旧字段（汇总展示）
                    node.authDateDisplay = Object.entries(platformDates).map(([p, d]) => `${p}：${d.display}`).join('；');
                }
                node.reviewer = '当前用户';
                node.reviewTime = new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-');
            }

            // 更新节点状态为已审核
            node.status = 'reviewed';

            // 重新渲染审核节点区域
            renderRRReviewNodes();

            // 自动聚焦到下一个待审节点（适配新布局）
            const newContainer = document.getElementById('rrdReviewNodes');
            if (newContainer) {
                const newActiveIdx = findActiveNodeIndex(nodes);
                if (newActiveIdx >= 0) {
                    // 左侧时间轴高亮
                    newContainer.querySelectorAll('.tl-node').forEach(n => n.classList.remove('tl-node-active'));
                    const nextTlNode = newContainer.querySelector(`.tl-node[data-node-idx="${newActiveIdx}"]`);
                    if (nextTlNode) nextTlNode.classList.add('tl-node-active');
                    // 右侧面板切换
                    newContainer.querySelectorAll('.rrd-node-panel').forEach(p => {
                        p.style.display = p.dataset.nodeId === nodes[newActiveIdx].id ? 'block' : 'none';
                    });
                    // 更新右侧标题
                    const titleEl = newContainer.querySelector('.rrd-split-right-title');
                    if (titleEl) titleEl.textContent = nodes[newActiveIdx].name;
                }
            }

            showToast(`${node.name} 审查结论已提交`, 'success');
        });
    });
}

/**
 * 渲染待审权利信息列表（按权益ID归纳，含版权类型展示与排序）
 */
function renderRRRightsList(item) {
    const container = document.getElementById('rrdRightsList');
    if (!container) return;

    const detailData = authData.rightsReviewDetail?.sampleRightsDetail || {};
    let rightsItems = detailData[item.id] || [];

    // 如果没有对应的详细数据，生成一条默认的
    if (rightsItems.length === 0) {
        rightsItems = [{
            rightsId: item.rightsId || '-',
            contractNo: item.contractNo || '-',
            copyrightType: '引入版权',
            authRights: '',
            clipLimitCondition: '',
            clipOtherCondition: '',
            clipDurationRequirement: '',
            authRightsContractClause: '',
            authStartDate: '',
            authEndDate: '',
            authPeriod: '',
            authExpiryBuffer: '',
            payType: '',
            authNature: '',
            sublicenseAllowed: '',
            sublicenseLimitCondition: '',
            sublicenseOtherCondition: '',
            sublicenseDateType: '',
            sublicenseDate: '',
            authPlatformSpecialNote: '',
            authPlatformContractClause: '',
            authTerritory: '',
            authTerritoryOther: '',
            ugcRightsExist: '',
            ugcRightsExtraPay: '',
            ugcRightsExtraPayRemark: '',
            ugcRightsExclusive: '',
            ugcRightsExclusiveRemark: '',
            ugcRightsSublicense: '',
            ugcRightsSublicenseCondition: '',
            ugcOutputDuration: '',
            ugcOutputDurationRemark: '',
            ugcOutputQuantity: '',
            ugcOutputQuantityRemark: '',
            ugcSpreadChannel: '',
            ugcSpreadChannelRemark: '',
            ugcSpreadPeriod: '',
            ugcSpreadPeriodRemark: '',
            ugcSpreadTerritory: '',
            ugcSpreadTerritoryRemark: '',
            clipConfirmLetter: '',
            manualAuthExternal: '',
            rightsFirstReviewOpinion: '',
            rightsSecondReviewOpinion: '',
            copyrightAuthExternal: '',
            systemDenyReason: '',
            reviewNode: '',
            distributionPlatform: '',
            distributionTerminal: '',
            distributionPlatformSpecialNote: '',
            specialNote: '',
            specialNoteRemark: ''
        }];
    }

    // 版权类型排序优先级
    const copyrightTypeOrder = { '引入版权': 0, '引入定制': 1, '引入置换': 2, '引入自制': 3 };
    rightsItems.sort((a, b) => {
        const orderA = copyrightTypeOrder[a.copyrightType] ?? 99;
        const orderB = copyrightTypeOrder[b.copyrightType] ?? 99;
        return orderA - orderB;
    });

    // 辅助函数：生成纯文本展示字段（不可编辑）
    function rf(label, value) {
        const displayVal = value || '-';
        return `<div class="rrd-rf"><span class="rrd-rf-label">${label}</span><span class="rrd-rf-value">${displayVal}</span></div>`;
    }
    function rfMono(label, value) {
        const displayVal = value || '-';
        return `<div class="rrd-rf"><span class="rrd-rf-label">${label}</span><span class="rrd-rf-value mono">${displayVal}</span></div>`;
    }
    function rfFull(label, value) {
        const displayVal = value || '-';
        return `<div class="rrd-rf rrd-rf-full"><span class="rrd-rf-label">${label}</span><span class="rrd-rf-value">${displayVal}</span></div>`;
    }
    function rfTextarea(label, value) {
        const displayVal = value || '-';
        return `<div class="rrd-rf rrd-rf-full"><span class="rrd-rf-label">${label}</span><span class="rrd-rf-value">${displayVal}</span></div>`;
    }

    // ====== 枚举值映射表 ======
    const FIELD_ENUMS = {
        // 基本信息
        copyrightType: ['引入版权', '引入自制', '引入定制', '引入置换'],
        payType: ['免费', '分成', '固定费用'],
        // 授权基础权利
        authRights: ['信息网络传播权', '改编权', '广播权', '摄制权', '表演权'],
        authNature: ['独占', '非独占', '排他'],
        sublicenseAllowed: ['是', '否'],
        sublicenseLimitCondition: ['仅限合作MCN机构', '仅限指定平台', '无限制'],
        authTerritory: ['中国大陆', '全球', '港澳台', '海外'],
        // 二创权利
        ugcRightsExist: ['有', '无'],
        ugcRightsExtraPay: ['是', '否'],
        ugcRightsExclusive: ['独占', '非独占', '排他'],
        ugcRightsSublicense: ['是', '否'],
        // 二创创作成果
        ugcOutputDuration: ['≤3分钟', '≤5分钟', '≤15分钟', '≤30分钟', '不限'],
        ugcOutputQuantity: ['不限', '限量'],
        // 二创传播限制
        ugcSpreadPeriod: ['授权期内', '永久'],
        ugcSpreadTerritory: ['中国大陆', '全球', '港澳台', '海外'],
        // 分销相关
        distributionTerminal: ['移动端', '全终端', 'PC端', 'OTT']
    };

    /**
     * 枚举tag样式渲染：展示所有枚举值，当前值高亮选中
     * @param {string} label - 字段标签
     * @param {string} value - 当前值
     * @param {string} fieldKey - 枚举映射key（可选，自动查找）
     * @param {boolean} fullWidth - 是否占满整行
     * @param {boolean} isMono - 是否等宽字体
     */
    function rfEnum(label, value, fieldKey, fullWidth, isMono) {
        const enums = fieldKey ? FIELD_ENUMS[fieldKey] : null;
        // 如果没有枚举定义，或者值不为空且不在枚举列表中，回退到纯文本+tag混合展示
        if (!enums || enums.length === 0) {
            const displayVal = value || '-';
            const cls = fullWidth ? 'rrd-rf rrd-rf-full' : 'rrd-rf';
            const valCls = isMono ? 'rrd-rf-value mono' : 'rrd-rf-value';
            return `<div class="${cls}"><span class="rrd-rf-label">${label}</span><span class="${valCls}">${displayVal}</span></div>`;
        }
        const cls = fullWidth ? 'rrd-rf rrd-rf-full' : 'rrd-rf';
        const trimmedVal = (value || '').trim();
        // 检查值是否在枚举列表中
        const valueInEnum = enums.includes(trimmedVal);
        const tagsHtml = enums.map(opt => {
            const isSelected = trimmedVal && opt === trimmedVal;
            return `<span class="rrd-enum-tag ${isSelected ? 'rrd-enum-tag-selected' : ''}">${opt}</span>`;
        }).join('');
        // 如果值非空且不在枚举列表中，额外展示为自定义tag
        const extraTag = (trimmedVal && !valueInEnum) ? `<span class="rrd-enum-tag rrd-enum-tag-selected rrd-enum-tag-custom">${trimmedVal}</span>` : '';
        return `<div class="${cls}"><span class="rrd-rf-label">${label}</span><div class="rrd-enum-tags">${tagsHtml}${extraTag}</div></div>`;
    }

    /**
     * 自由文本枚举tag样式：无预设枚举，直接展示值为选中tag
     */
    function rfText(label, value, fullWidth, isMono) {
        const trimmedVal = (value || '').trim();
        const cls = fullWidth ? 'rrd-rf rrd-rf-full' : 'rrd-rf';
        if (!trimmedVal) {
            return `<div class="${cls}"><span class="rrd-rf-label">${label}</span><div class="rrd-enum-tags"><span class="rrd-enum-tag rrd-enum-tag-empty">-</span></div></div>`;
        }
        const valCls = isMono ? ' rrd-enum-tag-mono' : '';
        return `<div class="${cls}"><span class="rrd-rf-label">${label}</span><div class="rrd-enum-tags"><span class="rrd-enum-tag rrd-enum-tag-selected${valCls}">${trimmedVal}</span></div></div>`;
    }

    // 字段分组标题
    function sectionTitle(icon, title) {
        return `<div class="rrd-section-title"><i data-lucide="${icon}" style="width:14px;height:14px;"></i><span>${title}</span></div>`;
    }

    const cardsHtml = rightsItems.map((ri, idx) => {
        const isFirstCard = idx === 0;
        const copyrightTypeLabel = ri.copyrightType || '未知';
        let tagClass = 'rrd-copyright-tag';
        if (copyrightTypeLabel === '引入版权') tagClass += ' rrd-copyright-tag-copyright';
        else if (copyrightTypeLabel === '引入自制') tagClass += ' rrd-copyright-tag-selfmade';
        else if (copyrightTypeLabel === '引入定制') tagClass += ' rrd-copyright-tag-custom';
        else if (copyrightTypeLabel === '引入置换') tagClass += ' rrd-copyright-tag-exchange';

        // 判断是否有二创权利
        const hasUgc = ri.ugcRightsExist === '有';

        return `
        <div class="rrd-rights-group ${isFirstCard ? 'expanded' : 'collapsed'}" data-card-idx="${idx}">
            <div class="rrd-rights-group-header" data-action="toggle-rights-card" data-card-idx="${idx}">
                <div class="rrd-rights-group-title">
                    <i data-lucide="${isFirstCard ? 'chevron-down' : 'chevron-right'}" class="rrd-rights-chevron" style="width:16px;height:16px;"></i>
                    <span class="rrd-rights-id-label">权益ID：</span>
                    <span class="rrd-rights-id-value">${ri.rightsId || '-'}</span>
                    <span class="${tagClass}">${copyrightTypeLabel}</span>

                    ${!isFirstCard ? '<span class="rrd-rights-collapsed-hint">点击展开</span>' : ''}
                </div>
            </div>
            <div class="rrd-rights-group-body" style="display:${isFirstCard ? 'block' : 'none'};">
                <div class="rrd-split-layout">
                    <div class="rrd-split-left">
                        <button class="rrd-contract-toggle-btn" data-action="view-contract" data-rights-id="${ri.rightsId}" data-contract-no="${ri.contractNo || ''}" title="展开合同对照">
                            <svg class="rrd-toggle-icon rrd-toggle-icon-open" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
                            <svg class="rrd-toggle-icon rrd-toggle-icon-close" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
                            <span class="rrd-toggle-text-open">合同对照</span>
                            <span class="rrd-toggle-text-close">收起</span>
                        </button>

                ${sectionTitle('file-text', '基本信息')}
                <div class="rrd-rights-detail-grid rrd-grid-compact">
                    ${rfText('版权权益ID', ri.rightsId, false, true)}
                    ${rfText('权益合同号', ri.contractNo, false, true)}
                    ${rfEnum('版权类型', ri.copyrightType, 'copyrightType')}
                </div>

                ${sectionTitle('key', '授权基础权利')}
                <div class="rrd-rights-detail-grid rrd-grid-compact">
                    ${rfEnum('授权权利', ri.authRights, 'authRights', true)}
                    ${rfText('授权权利合同条款', ri.authRightsContractClause, true)}
                    ${rfEnum('授权性质', ri.authNature, 'authNature')}
                    ${rfEnum('转授权许可', ri.sublicenseAllowed, 'sublicenseAllowed')}
                    ${rfEnum('转授权限定条件', ri.sublicenseLimitCondition, 'sublicenseLimitCondition', true)}
                    ${rfText('转授权其他限定条件', ri.sublicenseOtherCondition)}
                    ${rfText('转授权起止日期', ri.sublicenseDate)}
                    ${rfEnum('授权区域', ri.authTerritory, 'authTerritory')}
                    ${rfText('其他授权区域', ri.authTerritoryOther)}
                    ${rfText('授权平台特殊说明', ri.authPlatformSpecialNote, true)}
                    ${rfText('授权平台合同条款', ri.authPlatformContractClause, true)}
                    ${rfText('剪辑权限定条件', ri.clipLimitCondition)}
                    ${rfText('剪辑权其他限定条件', ri.clipOtherCondition)}
                    ${rfText('剪辑时长要求', ri.clipDurationRequirement)}
                </div>

                ${sectionTitle('video', '二创权利')}
                <div class="rrd-rights-detail-grid rrd-grid-compact">
                    ${rfEnum('二创权利-权利有无', ri.ugcRightsExist, 'ugcRightsExist')}
                    ${rfEnum('二创权利-另行付费', ri.ugcRightsExtraPay, 'ugcRightsExtraPay')}
                    ${rfText('二创权利-另行付费-备注', ri.ugcRightsExtraPayRemark)}
                    ${rfEnum('二创权利性质-独占性', ri.ugcRightsExclusive, 'ugcRightsExclusive')}
                    ${rfText('二创权利性质-独占性-备注', ri.ugcRightsExclusiveRemark)}
                    ${rfEnum('二创权利性质-转授权', ri.ugcRightsSublicense, 'ugcRightsSublicense')}
                    ${rfText('二创权利性质-转授权-限定条件', ri.ugcRightsSublicenseCondition)}
                </div>

                ${hasUgc ? `
                ${sectionTitle('scissors', '二创创作成果')}
                <div class="rrd-rights-detail-grid rrd-grid-compact">
                    ${rfEnum('时长要求-授权使用', ri.ugcOutputDuration, 'ugcOutputDuration')}
                    ${rfText('时长要求-授权使用-备注', ri.ugcOutputDurationRemark)}
                    ${rfEnum('数量要求-授权使用', ri.ugcOutputQuantity, 'ugcOutputQuantity')}
                    ${rfText('数量要求-授权使用-备注', ri.ugcOutputQuantityRemark)}
                </div>

                ${sectionTitle('radio', '二创传播限制')}
                <div class="rrd-rights-detail-grid rrd-grid-compact">
                    ${rfText('传播渠道-授权使用', ri.ugcSpreadChannel)}
                    ${rfText('传播渠道-授权使用-备注', ri.ugcSpreadChannelRemark)}
                    ${rfEnum('传播期限-授权使用', ri.ugcSpreadPeriod, 'ugcSpreadPeriod')}
                    ${rfText('传播期限-授权使用-备注', ri.ugcSpreadPeriodRemark)}
                    ${rfEnum('地域-授权使用', ri.ugcSpreadTerritory, 'ugcSpreadTerritory')}
                    ${rfText('地域-授权使用-备注', ri.ugcSpreadTerritoryRemark)}
                </div>
                ` : ''}

                ${sectionTitle('send', '分销相关')}
                <div class="rrd-rights-detail-grid rrd-grid-compact">
                    ${rfText('分销平台', ri.distributionPlatform)}
                    ${rfEnum('分销终端', ri.distributionTerminal, 'distributionTerminal')}
                    ${rfText('分销平台特殊说明', ri.distributionPlatformSpecialNote, true)}
                </div>

                    </div>
                    <div class="rrd-split-right" data-rights-id="${ri.rightsId}" data-contract-no="${ri.contractNo || ''}" style="display:none;">
                        <!-- 合同内容由JS动态渲染 -->
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    container.innerHTML = cardsHtml;

    // 绑定展开/收起事件
    container.querySelectorAll('[data-action="toggle-rights-card"]').forEach(header => {
        header.addEventListener('click', function() {
            const cIdx = this.dataset.cardIdx;
            const card = container.querySelector(`.rrd-rights-group[data-card-idx="${cIdx}"]`);
            if (!card) return;
            const body = card.querySelector('.rrd-rights-group-body');
            const chevron = card.querySelector('.rrd-rights-chevron');
            const hint = card.querySelector('.rrd-rights-collapsed-hint');
            const contractPanel = card.querySelector('.rrd-split-right');
            const isExpanded = card.classList.contains('expanded');

            if (isExpanded) {
                card.classList.remove('expanded');
                card.classList.add('collapsed');
                body.style.display = 'none';
                if (chevron) chevron.setAttribute('data-lucide', 'chevron-right');
                if (!hint) {
                    const titleEl = card.querySelector('.rrd-rights-group-title');
                    if (titleEl) {
                        const hintSpan = document.createElement('span');
                        hintSpan.className = 'rrd-rights-collapsed-hint';
                        hintSpan.textContent = '点击展开';
                        titleEl.appendChild(hintSpan);
                    }
                } else {
                    hint.style.display = '';
                }
                // 收起时隐藏合同面板
                if (contractPanel) {
                    contractPanel.style.display = 'none';
                    contractPanel.innerHTML = '';
                }
                const splitLayout = card.querySelector('.rrd-split-layout');
                if (splitLayout) splitLayout.classList.remove('rrd-split-active');
                // 清除高度限制
                syncSplitHeight(card, 0);
            } else {
                card.classList.remove('collapsed');
                card.classList.add('expanded');
                body.style.display = 'block';
                if (chevron) chevron.setAttribute('data-lucide', 'chevron-down');
                if (hint) hint.style.display = 'none';
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
    });

    // 绑定「合同对照」toggle 按钮事件 —— 分屏模式
    container.querySelectorAll('[data-action="view-contract"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const rightsId = this.dataset.rightsId;
            const contractNo = this.dataset.contractNo;
            const card = this.closest('.rrd-rights-group');
            if (!card) return;
            const contractPanel = card.querySelector('.rrd-split-right');
            if (!contractPanel) return;

            const splitLayout = card.querySelector('.rrd-split-layout');

            // 如果已经显示则关闭（toggle 效果）
            if (this.classList.contains('active')) {
                contractPanel.style.display = 'none';
                contractPanel.innerHTML = '';
                this.classList.remove('active');
                if (splitLayout) splitLayout.classList.remove('rrd-split-active');
                // 清除高度限制
                syncSplitHeight(card, 0);
                return;
            }

            // 渲染合同内容到分屏右侧
            const contractTexts = authData.rightsReviewDetail?.sampleContractTexts || {};
            const contractData = contractTexts[rightsId];
            renderContractInline(contractPanel, rightsId, contractNo, contractData);
            contractPanel.style.display = 'flex';
            this.classList.add('active');
            if (splitLayout) splitLayout.classList.add('rrd-split-active');

            // 【关键】在分屏布局生效后（2列模式），测量左侧实际scrollHeight作为固定高度
            // 必须在 rrd-split-active 生效后才能拿到2列布局下的真实高度
            // 使用 requestAnimationFrame 确保浏览器已完成布局重排
            requestAnimationFrame(() => {
                const leftPanel = card.querySelector('.rrd-split-left');
                const measuredHeight = leftPanel ? leftPanel.scrollHeight : 0;
                syncSplitHeight(card, measuredHeight);
            });

            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
    });
}

/* ================================================================
   合同对照工具（分屏内嵌模式）
   ================================================================ */

/**
 * 渲染合同内容到分屏右侧面板
 */
function renderContractInline(panel, rightsId, contractNo, contractData) {
    if (!panel) return;

    if (!contractData) {
        panel.innerHTML = `
            <div class="contract-inline-wrapper">
                <div class="contract-inline-header">
                    <div class="contract-inline-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        <span>合同对照工具</span>
                    </div>
                </div>
                <div class="contract-inline-body">
                    <div class="contract-empty">
                        <i data-lucide="file-x" style="width:40px;height:40px;color:var(--text-placeholder,#999);"></i>
                        <p>未找到权益 <strong>${rightsId}</strong> 的合同原文</p>
                        <span class="contract-empty-sub">请联系版权管理部门上传合同文件</span>
                    </div>
                </div>
            </div>
        `;
        bindContractInlineClose(panel);
        return;
    }

    const paragraphs = contractData.contractText.split('\n').filter(line => line.trim());

    panel.innerHTML = `
        <div class="contract-inline-wrapper">
            <div class="contract-inline-header">
                <div class="contract-inline-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    <span>合同原文</span>
                </div>
                <div class="contract-search-bar">
                    <svg class="contract-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" class="contract-search-input" placeholder="搜索关键词" data-action="contract-search" />
                    <span class="contract-search-count" style="display:none;"></span>
                    <button class="contract-search-clear" data-action="contract-search-clear" style="display:none;" title="清除搜索">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            </div>
            <div class="contract-inline-body">
                <div class="contract-text-body contract-text-body-inline">
                    ${paragraphs.map(p => {
                        const trimmed = p.trim();
                        if (trimmed === contractData.contractTitle || trimmed === '版权引入合同') {
                            return `<div class="contract-p contract-p-title">${trimmed}</div>`;
                        }
                        if (/^第[一二三四五六七八九十百]+条/.test(trimmed)) {
                            return `<div class="contract-p contract-p-clause">${trimmed}</div>`;
                        }
                        if (/^甲方|^乙方|^签署日期/.test(trimmed)) {
                            return `<div class="contract-p contract-p-sign">${trimmed}</div>`;
                        }
                        if (/^合同编号|^版权权益ID/.test(trimmed)) {
                            return `<div class="contract-p contract-p-meta">${trimmed}</div>`;
                        }
                        return `<div class="contract-p">${trimmed}</div>`;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
    bindContractInlineClose(panel);
}

/**
 * 绑定分屏合同面板的搜索功能
 */
function bindContractInlineClose(panel) {
    // 绑定关键词搜索
    const searchInput = panel.querySelector('[data-action="contract-search"]');
    const searchClear = panel.querySelector('[data-action="contract-search-clear"]');
    const searchCount = panel.querySelector('.contract-search-count');

    if (searchInput) {
        let searchTimer = null;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                performContractSearch(panel, this.value.trim());
            }, 200);
        });

        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                this.value = '';
                performContractSearch(panel, '');
            }
        });
    }

    if (searchClear) {
        searchClear.addEventListener('click', function(e) {
            e.stopPropagation();
            if (searchInput) searchInput.value = '';
            performContractSearch(panel, '');
            searchInput?.focus();
        });
    }
}

/**
 * 在合同原文中搜索关键词并高亮
 */
function performContractSearch(panel, keyword) {
    const textBody = panel.querySelector('.contract-text-body-inline');
    if (!textBody) return;

    const searchCount = panel.querySelector('.contract-search-count');
    const searchClear = panel.querySelector('[data-action="contract-search-clear"]');

    // 清除之前的高亮
    textBody.querySelectorAll('.contract-search-highlight').forEach(el => {
        const parent = el.parentNode;
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize(); // 合并相邻文本节点
    });

    if (!keyword) {
        if (searchCount) searchCount.style.display = 'none';
        if (searchClear) searchClear.style.display = 'none';
        return;
    }

    // 遍历所有段落，对文本内容进行关键词高亮
    let totalMatches = 0;
    const walker = document.createTreeWalker(textBody, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];
    while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
    }

    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedKeyword, 'gi');

    textNodes.forEach(node => {
        const text = node.textContent;
        if (!regex.test(text)) return;
        regex.lastIndex = 0; // 重置

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
            totalMatches++;
            // 匹配前的文本
            if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
            }
            // 高亮的匹配文本
            const mark = document.createElement('span');
            mark.className = 'contract-search-highlight';
            mark.textContent = match[0];
            fragment.appendChild(mark);
            lastIndex = regex.lastIndex;
        }
        // 剩余文本
        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
        node.parentNode.replaceChild(fragment, node);
    });

    // 更新匹配计数
    if (searchCount) {
        if (totalMatches > 0) {
            searchCount.textContent = `${totalMatches}个匹配`;
            searchCount.style.display = 'inline-block';
        } else {
            searchCount.textContent = '无匹配';
            searchCount.style.display = 'inline-block';
        }
    }
    if (searchClear) searchClear.style.display = 'flex';

    // 滚动到第一个匹配项
    const firstHighlight = textBody.querySelector('.contract-search-highlight');
    if (firstHighlight) {
        firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/**
 * 同步分屏左右区域高度
 * @param {HTMLElement} card - 权利卡片容器
 * @param {number} fixedHeight - 缩宽前（全宽3列布局）的容器高度
 *
 * 设计逻辑：
 * - 在 rrd-split-layout 容器上设置固定高度（= 缩宽前的高度）
 * - 左右面板通过 flex + align-items:stretch 自动填满容器高度，实现等高
 * - 左侧内容超出通过滚动条查看
 * - 右侧合同面板白色区域与左侧完全对齐
 */
function syncSplitHeight(card, fixedHeight) {
    if (!card) return;
    const splitLayout = card.querySelector('.rrd-split-layout');
    const leftPanel = card.querySelector('.rrd-split-left');
    if (!splitLayout) return;

    if (fixedHeight && fixedHeight > 0) {
        // 在 split-layout 容器上设固定高度
        splitLayout.style.height = fixedHeight + 'px';
        splitLayout.style.overflow = 'hidden';
        // 左侧超出内容滚动查看
        if (leftPanel) {
            leftPanel.style.overflowY = 'auto';
        }
    } else {
        // 清除高度限制（关闭合同面板时）
        splitLayout.style.height = '';
        splitLayout.style.overflow = '';
        if (leftPanel) {
            leftPanel.style.overflowY = '';
        }
    }
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

/* ================================================================
   授权历史抽屉（右侧滑出面板）
   ================================================================ */

/**
 * 打开授权历史抽屉
 */
function openAuthHistoryDrawer(currentItem) {
    // 确保抽屉DOM已存在
    let drawer = document.getElementById('authHistoryDrawer');
    if (!drawer) {
        createAuthHistoryDrawerDOM();
        drawer = document.getElementById('authHistoryDrawer');
    }

    // 收集该IP（同workName）的所有历史记录
    const historyRecords = collectAuthHistory(currentItem);

    // 渲染抽屉内容
    renderAuthHistoryContent(currentItem, historyRecords);

    // 打开抽屉
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';

    // 绑定关闭事件
    bindAuthHistoryDrawerEvents();
}

/**
 * 关闭授权历史抽屉
 */
function closeAuthHistoryDrawer() {
    const drawer = document.getElementById('authHistoryDrawer');
    if (drawer) {
        drawer.classList.remove('open');
        document.body.style.overflow = '';
    }
}

/**
 * 创建抽屉DOM结构
 */
function createAuthHistoryDrawerDOM() {
    const drawerHTML = `
        <div class="auth-history-drawer" id="authHistoryDrawer">
            <div class="auth-history-drawer-mask" id="authHistoryDrawerMask"></div>
            <div class="auth-history-drawer-panel">
                <div class="auth-history-drawer-header">
                    <h3 class="auth-history-drawer-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <span id="authHistoryDrawerTitleText">授权历史</span>
                    </h3>
                    <button class="auth-history-drawer-close" id="btnCloseAuthHistory">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="auth-history-drawer-body" id="authHistoryDrawerBody">
                    <!-- JS 动态渲染 -->
                </div>
            </div>
        </div>
    `;
    document.querySelector('.auth-management-page').insertAdjacentHTML('beforeend', drawerHTML);
}

/**
 * 绑定抽屉事件
 */
function bindAuthHistoryDrawerEvents() {
    const closeBtn = document.getElementById('btnCloseAuthHistory');
    const mask = document.getElementById('authHistoryDrawerMask');

    if (closeBtn) {
        closeBtn.onclick = closeAuthHistoryDrawer;
    }
    if (mask) {
        mask.onclick = closeAuthHistoryDrawer;
    }

    // ESC 关闭
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            closeAuthHistoryDrawer();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

/**
 * 收集同一IP（workName）的所有审查历史记录
 */
function collectAuthHistory(currentItem) {
    const workName = currentItem.workName;
    const records = [];

    // 从授权审查数据中收集同名IP的全部记录
    const categories = authData.rightsReviewData?.categories || [];
    for (const cat of categories) {
        for (const item of cat.items) {
            if (item.workName === workName) {
                records.push({
                    ...item,
                    categoryLabel: cat.label,
                    isCurrent: item.id === currentItem.id
                });
            }
        }
    }

    // 从项目详情中的授权明细收集同名IP记录
    const projects = authData.projects || [];
    for (const proj of projects) {
        const authItems = proj.detail?.authItems || [];
        for (const authItem of authItems) {
            if (authItem.workName === workName) {
                records.push({
                    id: authItem.id,
                    taskId: authItem.taskId || '-',
                    taskInitTime: authItem.taskInitTime || '-',
                    workName: authItem.workName,
                    category: authItem.category,
                    bqid: authItem.bqid,
                    rightsId: authItem.rightsId,
                    contractNo: authItem.contractNo,
                    status: authItem.status,
                    authStartDate: authItem.authStartDate,
                    authEndDate: authItem.authEndDate,
                    platform: proj.name,
                    rightsType: '项目授权',
                    categoryLabel: '项目授权',
                    reviewStatus: authItem.status === '授权中' ? '已确权' : authItem.status,
                    isCurrent: false,
                    fromProject: true,
                    projectName: proj.name
                });
            }
        }
    }

    // 按时间排序（最新的在前）
    records.sort((a, b) => {
        const timeA = a.taskInitTime || a.applyTime || '';
        const timeB = b.taskInitTime || b.applyTime || '';
        return timeB.localeCompare(timeA);
    });

    return records;
}

/**
 * 渲染授权历史抽屉内容
 */
function renderAuthHistoryContent(currentItem, records) {
    const titleText = document.getElementById('authHistoryDrawerTitleText');
    const body = document.getElementById('authHistoryDrawerBody');
    if (!titleText || !body) return;

    titleText.textContent = `${currentItem.workName} - 授权审查历史`;

    if (records.length === 0) {
        body.innerHTML = `
            <div class="auth-history-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                <p>暂无该IP的授权审查历史记录</p>
            </div>
        `;
        return;
    }

    // 统计信息
    const totalCount = records.length;
    const confirmedCount = records.filter(r => {
        const reviewInfo = getItemReviewStatusDisplay(r);
        return reviewInfo.isConfirmed;
    }).length;
    const pendingCount = totalCount - confirmedCount;

    body.innerHTML = `
        <div class="auth-history-summary">
            <div class="auth-history-stat">
                <span class="auth-history-stat-num">${totalCount}</span>
                <span class="auth-history-stat-label">总记录数</span>
            </div>
            <div class="auth-history-stat auth-history-stat-confirmed">
                <span class="auth-history-stat-num">${confirmedCount}</span>
                <span class="auth-history-stat-label">已确权</span>
            </div>
            <div class="auth-history-stat auth-history-stat-pending">
                <span class="auth-history-stat-num">${pendingCount}</span>
                <span class="auth-history-stat-label">审核中</span>
            </div>
        </div>
        <div class="auth-history-list">
            ${records.map((record, idx) => {
                const reviewStatusInfo = getItemReviewStatusDisplay(record);
                const taskType = record.fromProject ? '项目授权' : getTaskType(record);
                const taskTypeClass = record.fromProject ? 'rr-task-type-project' : getTaskTypeClass(taskType);

                return `
                <div class="auth-history-item ${record.isCurrent ? 'auth-history-item-current' : ''}">
                    <div class="auth-history-item-header">
                        <div class="auth-history-item-header-left">
                            <span class="auth-history-item-seq">#${idx + 1}</span>
                            <span class="auth-history-item-id">${record.taskId || record.id}</span>
                            ${record.isCurrent ? '<span class="auth-history-current-tag">当前</span>' : ''}
                        </div>
                        <span class="rr-bar-status ${reviewStatusInfo.className}"><span class="status-dot"></span>${reviewStatusInfo.text}</span>
                    </div>
                    <div class="auth-history-item-body">
                        <div class="auth-history-item-row">
                            <span class="auth-history-item-label">权益类型</span>
                            <span class="auth-history-item-value"><span class="rr-task-type-tag ${taskTypeClass}">${taskType}</span></span>
                        </div>
                        <div class="auth-history-item-row">
                            <span class="auth-history-item-label">品类</span>
                            <span class="auth-history-item-value">${record.category || '-'}</span>
                        </div>
                        <div class="auth-history-item-row">
                            <span class="auth-history-item-label">版权ID</span>
                            <span class="auth-history-item-value mono">${record.bqid || '-'}</span>
                        </div>
                        <div class="auth-history-item-row">
                            <span class="auth-history-item-label">权益ID</span>
                            <span class="auth-history-item-value mono">${record.rightsId || '-'}</span>
                        </div>
                        <div class="auth-history-item-row">
                            <span class="auth-history-item-label">合同号</span>
                            <span class="auth-history-item-value mono">${record.contractNo || '-'}</span>
                        </div>
                        <div class="auth-history-item-row">
                            <span class="auth-history-item-label">授权范围</span>
                            <span class="auth-history-item-value">${record.rightsScope || '-'}</span>
                        </div>
                        <div class="auth-history-item-row">
                            <span class="auth-history-item-label">授权期限</span>
                            <span class="auth-history-item-value">${record.authPeriod || (record.authStartDate && record.authEndDate ? record.authStartDate + ' - ' + record.authEndDate : '-')}</span>
                        </div>
                        <div class="auth-history-item-row">
                            <span class="auth-history-item-label">发起时间</span>
                            <span class="auth-history-item-value">${record.taskInitTime || record.applyTime || '-'}</span>
                        </div>
                        ${record.fromProject ? `
                        <div class="auth-history-item-row">
                            <span class="auth-history-item-label">所属项目</span>
                            <span class="auth-history-item-value">${record.projectName || '-'}</span>
                        </div>` : ''}
                    </div>
                    <div class="auth-history-item-footer">
                        ${!record.fromProject ? `<button class="auth-history-view-btn" data-history-id="${record.id}" data-history-current="${record.isCurrent ? 'true' : 'false'}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            查看详情
                        </button>` : `<span class="auth-history-project-badge">项目授权记录</span>`}
                    </div>
                </div>`;
            }).join('')}
        </div>
    `;

    // 绑定查看详情按钮事件
    body.querySelectorAll('.auth-history-view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const historyId = this.dataset.historyId;
            const isCurrent = this.dataset.historyCurrent === 'true';

            if (isCurrent) {
                // 当前记录，直接关闭抽屉
                closeAuthHistoryDrawer();
                return;
            }

            // 切换到该历史记录的详情页
            closeAuthHistoryDrawer();
            openRightsReviewDetail(historyId);
        });
    });
}
