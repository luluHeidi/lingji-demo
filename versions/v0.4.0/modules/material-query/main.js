/**
 * 素材查询与申用模块
 */

// 模块数据
let moduleData = null;
let currentCategory = 'tvSeries';
let currentPage = 1;
const itemsPerPage = 20;

// 筛选条件
let filters = {
    status: 'all',
    level: 'all',
    searchKeyword: ''
};

/**
 * 初始化模块
 */
async function initMaterialQueryModule() {
    console.log('初始化素材查询与申用模块');
    
    // 加载数据
    await loadModuleData();
    
    // 绑定事件
    bindEvents();
    
    // 渲染初始内容
    renderIPCards();
    
    // 初始化图标
    lucide.createIcons();
}

/**
 * 加载模块数据
 */
async function loadModuleData() {
    try {
        const response = await fetch('/modules/material-query/data.json');
        moduleData = await response.json();
        console.log('模块数据加载成功', moduleData);
    } catch (error) {
        console.error('加载模块数据失败', error);
        moduleData = { tvSeries: [], animation: [], variety: [] };
    }
}

/**
 * 绑定事件
 */
function bindEvents() {
    // 品类Tab切换
    const categoryTabs = document.querySelectorAll('.category-tab');
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 移除所有激活状态
            categoryTabs.forEach(t => t.classList.remove('active'));
            
            // 激活当前Tab
            this.classList.add('active');
            
            // 切换品类
            currentCategory = this.dataset.category;
            currentPage = 1;
            
            // 重置筛选条件
            resetFilters();
            
            // 重新渲染
            renderIPCards();
        });
    });
    
    // IP状态下拉框
    const statusSelect = document.getElementById('statusSelect');
    if (statusSelect) {
        statusSelect.addEventListener('change', function() {
            filters.status = this.value;
            currentPage = 1;
            renderIPCards();
        });
    }
    
    // IP等级下拉框
    const levelSelect = document.getElementById('levelSelect');
    if (levelSelect) {
        levelSelect.addEventListener('change', function() {
            filters.level = this.value;
            currentPage = 1;
            renderIPCards();
        });
    }
    
    // 搜索框
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    
    if (searchInput) {
        // 实时搜索
        searchInput.addEventListener('input', function() {
            filters.searchKeyword = this.value.trim();
            currentPage = 1;
            
            // 显示/隐藏清除按钮
            if (searchClear) {
                searchClear.style.display = filters.searchKeyword ? 'flex' : 'none';
            }
            
            // 延迟渲染，避免频繁更新
            clearTimeout(searchInput.timer);
            searchInput.timer = setTimeout(() => {
                renderIPCards();
            }, 300);
        });
    }
    
    if (searchClear) {
        searchClear.addEventListener('click', function() {
            if (searchInput) {
                searchInput.value = '';
                filters.searchKeyword = '';
                this.style.display = 'none';
                currentPage = 1;
                renderIPCards();
            }
        });
    }
    
    // 分页按钮
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                renderIPCards();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            const totalPages = getTotalPages();
            if (currentPage < totalPages) {
                currentPage++;
                renderIPCards();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
}

/**
 * 渲染IP卡片
 */
function renderIPCards() {
    const container = document.getElementById('ipCardsContainer');
    if (!container) return;
    
    // 获取当前品类数据并应用筛选
    const data = getFilteredData();
    
    // 计算分页
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = data.slice(startIndex, endIndex);
    
    // 如果没有数据，显示空状态
    if (pageData.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <i data-lucide="inbox" style="width: 64px; height: 64px; color: var(--text-tertiary); margin-bottom: 16px;"></i>
                <p style="font-size: 14px; color: var(--text-secondary);">暂无符合条件的IP数据</p>
            </div>
        `;
        lucide.createIcons();
        updatePagination();
        return;
    }
    
    // 生成HTML
    container.innerHTML = pageData.map(ip => createIPCard(ip)).join('');
    
    // 更新分页器
    updatePagination();
    
    // 绑定卡片事件
    bindCardEvents();
    
    // 重新初始化图标
    lucide.createIcons();
}

/**
 * 创建IP卡片HTML
 */
function createIPCard(ip) {
    const levelClass = getLevelClass(ip.level);
    const statusInfo = getStatusInfo(ip.status);
    
    return `
        <div class="ip-card" data-ip-id="${ip.id}">
            <!-- 海报 -->
            <div class="ip-poster">
                ${ip.poster ? 
                    `<img src="${ip.poster}" alt="${ip.name}">` : 
                    `<div class="poster-placeholder">
                        <i data-lucide="image" class="poster-placeholder-icon"></i>
                        <span class="poster-placeholder-text">暂无海报</span>
                    </div>`
                }
            </div>
            
            <!-- 内容区 -->
            <div class="ip-card-content">
                <!-- 标题 + 等级 -->
                <div class="ip-card-header">
                    <div class="ip-name" title="${ip.name}">${ip.name}</div>
                    <div class="ip-level ${levelClass}">${ip.level}</div>
                </div>
                
                <!-- 基本信息 -->
                <div class="ip-basic-info">
                    <div class="info-item">
                        <span class="info-label">主演</span>
                        <span class="info-value" title="${ip.actors}">${ip.actors}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">导演</span>
                        <span class="info-value" title="${ip.director}">${ip.director}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">品类</span>
                        <span class="info-value">${ip.category}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">状态</span>
                        <span class="ip-status ${statusInfo.class}">
                            <span class="status-dot"></span>
                            ${statusInfo.text}
                        </span>
                    </div>
                </div>
                
                <!-- 交互字段 -->
                <div class="ip-interactive-fields">
                    <div class="interactive-item" data-action="collected" data-ip-name="${ip.name}">
                        <div class="interactive-label">
                            <i data-lucide="check-circle" class="interactive-icon"></i>
                            <span>已回收素材</span>
                        </div>
                        <div class="interactive-value collected">${ip.collectedMaterials}</div>
                    </div>
                    <div class="interactive-item" data-action="pending" data-ip-name="${ip.name}">
                        <div class="interactive-label">
                            <i data-lucide="clock" class="interactive-icon"></i>
                            <span>待回收素材</span>
                        </div>
                        <div class="interactive-value pending">${ip.pendingMaterials}</div>
                    </div>
                    <div class="interactive-item" data-action="projects" data-ip-name="${ip.name}">
                        <div class="interactive-label">
                            <i data-lucide="briefcase" class="interactive-icon"></i>
                            <span>关联项目</span>
                        </div>
                        <div class="interactive-value projects">${ip.relatedProjects}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * 绑定卡片事件
 */
function bindCardEvents() {
    const interactiveItems = document.querySelectorAll('.interactive-item');
    
    interactiveItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            
            const action = this.dataset.action;
            const ipName = this.dataset.ipName;
            
            showDetailPlaceholder(action, ipName);
        });
    });
}

/**
 * 显示二级页面占位
 */
function showDetailPlaceholder(action, ipName) {
    const mainPage = document.querySelector('.material-query-page');
    const detailPage = document.getElementById('detailPagePlaceholder');
    
    if (!mainPage || !detailPage) return;
    
    // 隐藏主页面
    mainPage.style.display = 'none';
    
    // 显示占位页面
    detailPage.style.display = 'block';
    
    // 更新面包屑
    const breadcrumbIP = document.getElementById('currentIPName');
    if (breadcrumbIP) {
        breadcrumbIP.textContent = `《${ipName}》素材明细`;
    }
    
    // 更新占位消息
    const messageMap = {
        'collected': `《${ipName}》已回收素材详情页`,
        'pending': `《${ipName}》待回收素材详情页`,
        'projects': `《${ipName}》关联项目列表页`
    };
    
    const placeholderMsg = document.getElementById('placeholderMessage');
    if (placeholderMsg) {
        placeholderMsg.textContent = messageMap[action] || '详情页';
    }
    
    // 绑定返回按钮
    bindBackButtons();
    
    // 重新初始化图标
    lucide.createIcons();
    
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 绑定返回按钮
 */
function bindBackButtons() {
    const backToList = document.getElementById('backToList');
    const backBtn = document.getElementById('backBtn');
    
    const backHandler = function() {
        const mainPage = document.querySelector('.material-query-page');
        const detailPage = document.getElementById('detailPagePlaceholder');
        
        if (mainPage && detailPage) {
            detailPage.style.display = 'none';
            mainPage.style.display = 'block';
            
            // 重新初始化图标
            lucide.createIcons();
        }
    };
    
    if (backToList) {
        backToList.removeEventListener('click', backHandler);
        backToList.addEventListener('click', backHandler);
    }
    
    if (backBtn) {
        backBtn.removeEventListener('click', backHandler);
        backBtn.addEventListener('click', backHandler);
    }
}

/**
 * 更新分页器
 */
function updatePagination() {
    const totalPages = getTotalPages();
    
    // 更新页码显示
    const currentPageSpan = document.getElementById('currentPage');
    const totalPagesSpan = document.getElementById('totalPages');
    
    if (currentPageSpan) currentPageSpan.textContent = currentPage;
    if (totalPagesSpan) totalPagesSpan.textContent = totalPages;
    
    // 更新按钮状态
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
    }
}

/**
 * 获取当前品类数据
 */
function getCurrentCategoryData() {
    if (!moduleData) return [];
    return moduleData[currentCategory] || [];
}

/**
 * 获取筛选后的数据
 */
function getFilteredData() {
    let data = getCurrentCategoryData();
    
    // 状态筛选
    if (filters.status !== 'all') {
        data = data.filter(ip => ip.status === filters.status);
    }
    
    // 等级筛选
    if (filters.level !== 'all') {
        data = data.filter(ip => ip.level === filters.level);
    }
    
    // 关键词搜索
    if (filters.searchKeyword) {
        const keyword = filters.searchKeyword.toLowerCase();
        data = data.filter(ip => 
            ip.name.toLowerCase().includes(keyword) ||
            ip.actors.toLowerCase().includes(keyword) ||
            ip.director.toLowerCase().includes(keyword)
        );
    }
    
    return data;
}

/**
 * 重置筛选条件
 */
function resetFilters() {
    filters = {
        status: 'all',
        level: 'all',
        searchKeyword: ''
    };
    
    // 重置下拉框
    const statusSelect = document.getElementById('statusSelect');
    const levelSelect = document.getElementById('levelSelect');
    if (statusSelect) statusSelect.value = 'all';
    if (levelSelect) levelSelect.value = 'all';
    
    // 清空搜索框
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    if (searchInput) searchInput.value = '';
    if (searchClear) searchClear.style.display = 'none';
}

/**
 * 获取总页数
 */
function getTotalPages() {
    const data = getFilteredData();
    return Math.max(1, Math.ceil(data.length / itemsPerPage));
}

/**
 * 获取等级样式类
 */
function getLevelClass(level) {
    const map = {
        'S+': 'level-s-plus',
        'S': 'level-s',
        'A+': 'level-a-plus',
        'A': 'level-a'
    };
    return map[level] || 'level-a';
}

/**
 * 获取状态信息
 */
function getStatusInfo(status) {
    const statusMap = {
        '已立项': { class: 'status-planned', text: '已立项' },
        '开发中': { class: 'status-developing', text: '开发中' },
        '已过审': { class: 'status-reviewed', text: '已过审' },
        '上映中': { class: 'status-releasing', text: '上映中' },
        '已完播': { class: 'status-completed', text: '已完播' }
    };
    return statusMap[status] || { class: 'status-planned', text: status };
}

// 模块加载时自动初始化
if (typeof window !== 'undefined') {
    // 延迟初始化，确保DOM已加载
    setTimeout(() => {
        initMaterialQueryModule();
    }, 100);
}
