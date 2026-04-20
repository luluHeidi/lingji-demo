/**
 * 素材查询与申用模块
 */

// 模块数据
let moduleData = null;
let materialsData = null;
let currentCategory = 'tvSeries';
let currentPage = 1;
const itemsPerPage = 20;

// 筛选条件
let filters = {
    status: 'all',
    level: 'all',
    searchKeyword: ''
};

// 素材详情页数据
let currentIPName = '';
let currentMaterials = [];
let selectedMaterials = new Set();
let materialFilters = {
    materialType: 'all',
    elementTag: 'all',
    format: 'all',
    projectFile: 'all',
    purpose: 'all',
    searchKeyword: ''
};

/**
 * 初始化模块
 */
async function initMaterialQueryModule() {
    console.log('初始化素材查询与申用模块');
    
    // 重置模块状态
    currentCategory = 'tvSeries';
    currentPage = 1;
    filters = {
        status: 'all',
        level: 'all',
        searchKeyword: ''
    };
    
    // 加载数据（如果还未加载）
    if (!moduleData) {
        await loadModuleData();
    }
    
    if (!materialsData) {
        await loadMaterialsData();
    }
    
    // 绑定事件
    bindEvents();
    
    // 渲染初始内容
    renderIPCards();
    
    // 初始化图标
    lucide.createIcons();
}

/**
 * 加载素材数据
 */
async function loadMaterialsData() {
    try {
        const response = await fetch('./modules/material-query/material-detail-data.json');
        materialsData = await response.json();
        console.log('[素材查询] 素材数据加载成功');
    } catch (error) {
        console.error('[素材查询] 素材数据加载失败:', error);
        materialsData = {};
    }
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
    // 申用记录按钮
    const applicationRecordsBtn = document.getElementById('applicationRecordsBtn');
    if (applicationRecordsBtn && !applicationRecordsBtn.dataset.eventBound) {
        applicationRecordsBtn.dataset.eventBound = 'true';
        applicationRecordsBtn.addEventListener('click', function() {
            loadApplicationRecordsPage();
        });
    }
    
    // 品类Tab切换
    const categoryTabs = document.querySelectorAll('.category-tab');
    categoryTabs.forEach(tab => {
        // 避免重复绑定
        if (tab.dataset.eventBound) return;
        tab.dataset.eventBound = 'true';
        
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
    if (statusSelect && !statusSelect.dataset.eventBound) {
        statusSelect.dataset.eventBound = 'true';
        statusSelect.addEventListener('change', function() {
            filters.status = this.value;
            currentPage = 1;
            renderIPCards();
        });
    }
    
    // IP等级下拉框
    const levelSelect = document.getElementById('levelSelect');
    if (levelSelect && !levelSelect.dataset.eventBound) {
        levelSelect.dataset.eventBound = 'true';
        levelSelect.addEventListener('change', function() {
            filters.level = this.value;
            currentPage = 1;
            renderIPCards();
        });
    }
    
    // 搜索框
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    
    if (searchInput && !searchInput.dataset.eventBound) {
        searchInput.dataset.eventBound = 'true';
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
    
    if (searchClear && !searchClear.dataset.eventBound) {
        searchClear.dataset.eventBound = 'true';
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
    
    if (prevBtn && !prevBtn.dataset.eventBound) {
        prevBtn.dataset.eventBound = 'true';
        prevBtn.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                renderIPCards();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
    
    if (nextBtn && !nextBtn.dataset.eventBound) {
        nextBtn.dataset.eventBound = 'true';
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
    console.log('[素材查询] renderIPCards - 容器元素:', container);
    console.log('[素材查询] renderIPCards - 当前品类:', currentCategory);
    console.log('[素材查询] renderIPCards - 模块数据:', moduleData);
    
    if (!container) {
        console.error('[素材查询] 未找到ipCardsContainer容器');
        return;
    }
    
    // 获取当前品类数据并应用筛选
    const data = getFilteredData();
    console.log('[素材查询] 筛选后数据数量:', data.length);
    
    // 计算分页
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = data.slice(startIndex, endIndex);
    console.log('[素材查询] 当前页数据数量:', pageData.length);
    
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
                            <span>关联商业化项目</span>
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
            
            // 如果是"已回收素材"，打开素材详情页
            if (action === 'collected') {
                showMaterialDetailPage(ipName);
            } else {
                // 其他功能显示占位页
                showDetailPlaceholder(action, ipName);
            }
        });
    });
}

/**
 * 显示素材详情页
 */
/**
 * 显示素材详情页
 */
function showMaterialDetailPage(ipName) {
    console.log(`[素材查询] 显示素材详情页，IP: ${ipName}`);
    
    const mainPage = document.querySelector('.material-query-page');
    const detailPage = document.querySelector('.material-detail-page');
    
    if (!mainPage || !detailPage) {
        console.error('[素材查询] 页面元素未找到');
        return;
    }
    
    // 切换页面显示
    mainPage.style.display = 'none';
    detailPage.style.display = 'block';
    
    // 初始化素材详情页
    initMaterialDetailPage(ipName);
}

/**
 * 初始化素材详情页
 */
function initMaterialDetailPage(ipName) {
    currentIPName = ipName;
    selectedMaterials.clear();
    
    // 更新面包屑
    const breadcrumbElement = document.getElementById('detailIPName');
    if (breadcrumbElement) {
        breadcrumbElement.textContent = `《${ipName}》已回收素材详情`;
    }
    
    // 加载该IP的素材数据
    currentMaterials = materialsData[ipName] || [];
    console.log(`[素材详情] 已加载 ${currentMaterials.length} 个素材`);
    
    // 重置筛选条件
    materialFilters = {
        materialType: 'all',
        elementTag: 'all',
        format: 'all',
        projectFile: 'all',
        purpose: 'all',
        searchKeyword: ''
    };
    
    // 默认关闭AI模式
    const aiToggle = document.getElementById('aiSearchToggle');
    if (aiToggle) aiToggle.checked = false;
    
    const aiResult = document.getElementById('aiAnalysisResult');
    if (aiResult) aiResult.style.display = 'none';
    
    // 绑定素材详情页事件
    bindMaterialDetailEvents();
    
    // 渲染素材卡片
    renderMaterialCards();
    
    // 初始化图标
    lucide.createIcons();
}

/**
 * 绑定素材详情页事件
 */
function bindMaterialDetailEvents() {
    // 返回按钮
    const backBtn = document.getElementById('backToQueryList');
    if (backBtn) {
        backBtn.onclick = backToMaterialQuery;
    }
    
    // AI搜索切换
    const aiToggle = document.getElementById('aiSearchToggle');
    if (aiToggle) {
        aiToggle.onchange = handleAIToggle;
    }
    
    // 搜索按钮
    const searchBtn = document.getElementById('doMaterialSearch');
    if (searchBtn) {
        searchBtn.onclick = handleMaterialSearch;
    }
    
    // 筛选器变化
    ['filterMaterialType', 'filterElementTag', 'filterFormat', 'filterProjectFile', 'filterPurpose'].forEach(id => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.onchange = handleFilterChange;
        }
    });
    
    // 批量操作
    const cancelBtn = document.getElementById('cancelBatchBtn');
    if (cancelBtn) {
        cancelBtn.onclick = cancelBatchSelection;
    }
    
    const applyBtn = document.getElementById('applyBatchBtn');
    if (applyBtn) {
        applyBtn.onclick = applyBatch;
    }
    
    // 一键全选按钮
    const selectAllBtn = document.getElementById('selectAllMaterials');
    if (selectAllBtn) {
        selectAllBtn.onclick = selectAllMaterials;
    }
    
    // AI分析结果中的一键全选按钮
    const aiSelectAllBtn = document.getElementById('aiSelectAllBtn');
    if (aiSelectAllBtn) {
        aiSelectAllBtn.onclick = selectAllMaterials;
    }
}

/**
 * 返回素材查询列表
 */
/**
 * 返回素材查询列表页
 */
async function backToMaterialQuery() {
    const mainPage = document.querySelector('.material-query-page');
    const detailPage = document.querySelector('.material-detail-page');
    
    // 如果页面元素存在，直接切换显示
    if (mainPage && detailPage) {
        detailPage.style.display = 'none';
        mainPage.style.display = 'block';
        
        // 🔧 修复：恢复筛选器显示，隐藏AI分析结果
        const filters = document.getElementById('materialFilters');
        const aiResult = document.getElementById('aiAnalysisResult');
        const aiSelectAllBtn = document.getElementById('aiSelectAllBtn');
        
        if (filters) filters.style.display = 'flex';
        if (aiResult) aiResult.style.display = 'none';
        if (aiSelectAllBtn) aiSelectAllBtn.classList.remove('show');
        
        // 检查一级页面是否有内容，如果没有则重新渲染
        const ipCardsContainer = document.getElementById('ipCardsContainer');
        if (ipCardsContainer && ipCardsContainer.children.length === 0) {
            console.log('[导航] 检测到一级页面内容为空，重新渲染');
            
            // 确保数据已加载
            if (!moduleData) {
                await loadModuleData();
            }
            
            // 恢复筛选器和分页状态
            const statusSelect = document.getElementById('statusSelect');
            const levelSelect = document.getElementById('levelSelect');
            const searchInput = document.getElementById('searchInput');
            
            if (statusSelect) statusSelect.value = filters.status;
            if (levelSelect) levelSelect.value = filters.level;
            if (searchInput) searchInput.value = filters.searchKeyword;
            
            // 重新渲染IP卡片
            renderIPCards();
        }
        
        lucide.createIcons();
    } else {
        // 如果页面元素不存在（从申用确认页返回），需要重新加载
        const contentArea = document.querySelector('#monetization-content .page-content');
        if (!contentArea) return;
        
        console.log('[导航] 重新加载素材查询模块');
        
        try {
            const response = await fetch('./modules/material-query/index.html');
            const htmlContent = await response.text();
            contentArea.innerHTML = htmlContent;
            
            // 重新初始化模块
            await initMaterialQueryModule();
            lucide.createIcons();
        } catch (error) {
            console.error('[导航] 加载素材查询模块失败:', error);
        }
    }
}

/**
 * AI模式切换
 */
function handleAIToggle(e) {
    // 仅切换开关状态，不改变界面
    // 界面变化将在实际搜索时触发
    console.log(`[AI开关] ${e.target.checked ? '已开启' : '已关闭'}，等待搜索操作...`);
}

/**
 * 素材搜索
 */
async function handleMaterialSearch() {
    const searchInput = document.getElementById('materialSearch');
    const keyword = searchInput ? searchInput.value.trim() : '';
    const aiToggle = document.getElementById('aiSearchToggle');
    const isAIMode = aiToggle ? aiToggle.checked : false;
    
    if (!keyword) {
        materialFilters.searchKeyword = '';
        materialFilters.elementTag = 'all';
        renderMaterialCards();
        return;
    }
    
    if (isAIMode) {
        // AI模式：显示加载 -> 打字机效果 -> 显示结果
        await performAISearch(keyword);
    } else {
        // 普通模式：判断是素材ID还是名称关键词
        await performNormalSearch(keyword);
    }
}

/**
 * 执行普通搜索（非AI模式）
 */
async function performNormalSearch(keyword) {
    const aiResult = document.getElementById('aiAnalysisResult');
    const filters = document.getElementById('materialFilters');
    const aiSelectAllBtn = document.getElementById('aiSelectAllBtn');
    
    // 隐藏AI分析结果和AI全选按钮，显示筛选器
    if (aiResult) aiResult.style.display = 'none';
    if (aiSelectAllBtn) aiSelectAllBtn.classList.remove('show');
    if (filters) filters.style.display = 'block';
    
    // 判断是否为素材ID格式（SC开头+14位）
    const isIDSearch = /^SC\d{14}$/.test(keyword);
    
    if (isIDSearch) {
        // 场景2：精准ID搜索
        console.log(`[普通搜索] ID精准匹配: ${keyword}`);
        materialFilters.searchKeyword = '';
        materialFilters.elementTag = 'all';
        renderMaterialCardsByID(keyword);
    } else {
        // 场景1：名称模糊搜索
        console.log(`[普通搜索] 名称模糊搜索: ${keyword}`);
        materialFilters.searchKeyword = keyword;
        materialFilters.elementTag = 'all';
        renderMaterialCards();
    }
}

/**
 * 根据ID精准渲染素材
 */
function renderMaterialCardsByID(materialId) {
    const grid = document.getElementById('materialGrid');
    if (!grid) return;
    
    // 精准查找
    const material = currentMaterials.find(m => m.id === materialId);
    
    if (!material) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #6b7280;">
                <i data-lucide="search-x" style="width: 64px; height: 64px; margin-bottom: 16px;"></i>
                <p style="font-size: 14px;">未找到素材ID为 ${materialId} 的素材</p>
            </div>
        `;
        lucide.createIcons();
        updateSelectAllButton();
        return;
    }
    
    // 渲染单个素材
    grid.innerHTML = createMaterialCardHTML(material);
    lucide.createIcons();
    updateSelectAllButton();
    console.log(`[素材详情] ID精准匹配成功，找到素材: ${material.name}`);
}

/**
 * 执行AI搜索（打字机效果）
 */
async function performAISearch(keyword) {
    const aiResult = document.getElementById('aiAnalysisResult');
    const aiContent = document.getElementById('aiAnalysisContent');
    const materialGrid = document.getElementById('materialGrid');
    const filters = document.getElementById('materialFilters');
    const aiSelectAllBtn = document.getElementById('aiSelectAllBtn');
    
    // 1. 隐藏筛选器和AI全选按钮，显示AI结果区（加载状态）
    if (filters) filters.style.display = 'none';
    if (aiSelectAllBtn) aiSelectAllBtn.classList.remove('show');
    if (aiResult) {
        aiResult.style.display = 'block';
        aiResult.classList.add('loading');
        aiContent.innerHTML = '<div class="loading-spinner"></div>';
    }
    
    // 2. 清空素材网格，显示空白
    if (materialGrid) materialGrid.innerHTML = '';
    
    // 等待800ms模拟AI分析
    await sleep(800);
    
    // 3. 移除加载状态，开始打字机效果
    if (aiResult) {
        aiResult.classList.remove('loading');
    }
    
    // AI分析文案（扩充版，展示AI理解逻辑）
    const analysisText = `🎯 需求分析完成

根据您的描述"${keyword}"，我理解到您的核心需求为：

1. **目标作品**：《长相思》IP相关素材
2. **素材用途**：制作人物小卡（适合印刷/数字传播）
3. **素材类型**：人物形象类图片素材
4. **品质要求**：高清、人物清晰、适合裁切

💡 推荐策略：
- 优先推荐「人物」五要素标签的素材
- 筛选图片类型（image）+ 高分辨率
- 包含定妆照、角色海报、人物立绘等

已为您智能筛选出 ${currentMaterials.filter(m => m.elementTag === 'character' && m.type === 'image').length} 个最符合需求的素材 ↓`;
    
    // 打字机效果
    await typewriterEffect(aiContent, analysisText);
    
    // 4. 打字完成后，显示一键全选按钮
    if (aiSelectAllBtn) {
        aiSelectAllBtn.classList.add('show');
        lucide.createIcons();
    }
    
    // 5. 然后显示素材结果
    await sleep(500);
    
    // 筛选单人形象图片素材
    materialFilters.searchKeyword = '';
    materialFilters.elementTag = 'character';
    materialFilters.materialType = 'image';
    renderMaterialCards();
}

/**
 * 打字机效果
 */
async function typewriterEffect(element, text) {
    if (!element) return;
    
    element.innerHTML = '';
    
    for (let i = 0; i < text.length; i++) {
        element.textContent += text[i];
        
        // 添加闪烁光标
        const cursor = document.createElement('span');
        cursor.className = 'typing-cursor';
        element.appendChild(cursor);
        
        await sleep(30); // 每个字30ms
        
        // 移除光标以便添加下一个字
        cursor.remove();
    }
}

/**
 * 延迟函数
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 筛选器变化
 */
function handleFilterChange() {
    materialFilters.materialType = document.getElementById('filterMaterialType')?.value || 'all';
    materialFilters.elementTag = document.getElementById('filterElementTag')?.value || 'all';
    materialFilters.format = document.getElementById('filterFormat')?.value || 'all';
    materialFilters.projectFile = document.getElementById('filterProjectFile')?.value || 'all';
    materialFilters.purpose = document.getElementById('filterPurpose')?.value || 'all';
    
    renderMaterialCards();
}

/**
 * 创建素材卡片HTML
 */
function createMaterialCardHTML(material) {
    return `
        <div class="material-card" data-id="${material.id}">
            <div class="material-preview">
                ${getMaterialPreviewIcon(material.type)}
                <div class="preview-overlay">
                    <button class="preview-btn" onclick="previewMaterial('${material.id}')">
                        <i data-lucide="maximize-2"></i>
                    </button>
                </div>
            </div>
            <div class="material-info">
                <h4 class="material-name">${material.name}</h4>
                <div class="material-details">
                    <div class="detail-item"><span>素材ID:</span> ${material.id}</div>
                    <div class="detail-item"><span>素材类型:</span> ${getTypeLabel(material.type)}</div>
                    <div class="detail-item"><span>五要素:</span> ${getTagLabel(material.elementTag)}</div>
                    <div class="detail-item"><span>格式:</span> ${material.format}</div>
                    <div class="detail-item"><span>尺寸:</span> ${material.size}</div>
                    <div class="detail-item"><span>申用次数:</span> ${material.applyCount}</div>
                    <div class="detail-item"><span>工程文件:</span> ${material.projectFile === 'yes' ? '有' : '无'}</div>
                    <div class="detail-item"><span>制作用途:</span> ${getPurposeLabel(material.purpose)}</div>
                    <div class="detail-item"><span>上传人:</span> ${material.uploader}</div>
                    <div class="detail-item"><span>上传时间:</span> ${material.uploadTime}</div>
                    <div class="detail-item hash-item"><span>区块链哈希:</span> ${material.blockchainHash}</div>
                </div>
                <div class="material-actions">
                    <input type="checkbox" class="material-checkbox" data-id="${material.id}" onchange="toggleMaterialSelection('${material.id}')">
                    <button class="detail-btn" onclick="showMaterialDetail('${material.id}')">查看详情</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * 渲染素材卡片
 */
function renderMaterialCards() {
    const grid = document.getElementById('materialGrid');
    if (!grid) return;
    
    // 过滤素材
    let filtered = currentMaterials.filter(material => {
        if (materialFilters.materialType !== 'all' && material.type !== materialFilters.materialType) return false;
        if (materialFilters.elementTag !== 'all' && material.elementTag !== materialFilters.elementTag) return false;
        if (materialFilters.format !== 'all' && material.format !== materialFilters.format) return false;
        if (materialFilters.projectFile !== 'all' && material.projectFile !== materialFilters.projectFile) return false;
        if (materialFilters.purpose !== 'all' && material.purpose !== materialFilters.purpose) return false;
        
        if (materialFilters.searchKeyword) {
            const kw = materialFilters.searchKeyword.toLowerCase();
            return material.name.toLowerCase().includes(kw);
        }
        
        return true;
    });
    
    // 如果没有结果，显示空状态
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #6b7280;">
                <i data-lucide="inbox" style="width: 64px; height: 64px; margin-bottom: 16px;"></i>
                <p style="font-size: 14px;">未找到符合条件的素材</p>
            </div>
        `;
        lucide.createIcons();
        console.log(`[素材详情] 未找到符合条件的素材`);
        return;
    }
    
    // 生成HTML
    grid.innerHTML = filtered.map(material => createMaterialCardHTML(material)).join('');
    lucide.createIcons();
    updateSelectAllButton();
    console.log(`[素材详情] 已渲染 ${filtered.length} 个素材卡片`);
}


/**
 * 获取素材预览图标
 */
function getMaterialPreviewIcon(type) {
    const icons = {
        'image': '<i data-lucide="image" style="width:80px;height:80px;color:#006eff"></i>',
        'video': '<i data-lucide="video" style="width:80px;height:80px;color:#006eff"></i>',
        'audio': '<i data-lucide="music" style="width:80px;height:80px;color:#006eff"></i>',
        '3d': '<i data-lucide="box" style="width:80px;height:80px;color:#006eff"></i>',
        'text': '<i data-lucide="file-text" style="width:80px;height:80px;color:#006eff"></i>'
    };
    return icons[type] || icons['image'];
}

/**
 * 类型标签翻译
 */
function getTypeLabel(type) {
    const labels = { 'image': '图片', 'video': '视频', 'audio': '音频', '3d': '3D模型', 'text': '文字' };
    return labels[type] || type;
}

function getTagLabel(tag) {
    const labels = { 'story': '故事', 'brand': '品牌', 'music': '音乐', 'model': '模式', 'character': '人物' };
    return labels[tag] || tag;
}

function getPurposeLabel(purpose) {
    const labels = { 'promotion': '剧宣', 'opening': '开机', 'design': '设定', 'marketing': '营销', 'derivative': '衍生' };
    return labels[purpose] || purpose;
}

/**
 * 切换素材选择
 */
function toggleMaterialSelection(materialId) {
    if (selectedMaterials.has(materialId)) {
        selectedMaterials.delete(materialId);
    } else {
        selectedMaterials.add(materialId);
    }
    updateBatchActionBar();
    updateSelectAllButton();
}

/**
 * 更新批量操作栏
 */
function updateBatchActionBar() {
    const bar = document.getElementById('batchActionBar');
    const count = document.getElementById('selectedCount');
    
    if (!bar || !count) return;
    
    if (selectedMaterials.size > 0) {
        bar.style.display = 'flex';
        count.textContent = selectedMaterials.size;
    } else {
        bar.style.display = 'none';
    }
}

/**
 * 取消批量选择
 */
function cancelBatchSelection() {
    selectedMaterials.clear();
    document.querySelectorAll('.material-checkbox').forEach(cb => cb.checked = false);
    updateBatchActionBar();
    updateSelectAllButton();
}

/**
 * 一键全选所有当前显示的素材
 */
function selectAllMaterials() {
    const checkboxes = document.querySelectorAll('.material-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    if (allChecked) {
        // 如果已全选，则取消全选
        selectedMaterials.clear();
        checkboxes.forEach(cb => cb.checked = false);
    } else {
        // 否则全选所有
        checkboxes.forEach(cb => {
            cb.checked = true;
            const materialId = cb.dataset.id;
            if (materialId) {
                selectedMaterials.add(materialId);
            }
        });
    }
    
    updateBatchActionBar();
    updateSelectAllButton();
}

/**
 * 更新全选按钮状态
 */
function updateSelectAllButton() {
    const selectAllBtn = document.getElementById('selectAllMaterials');
    const aiSelectAllBtn = document.getElementById('aiSelectAllBtn');
    
    const checkboxes = document.querySelectorAll('.material-checkbox');
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    const totalCount = checkboxes.length;
    
    let iconName, buttonText;
    
    if (checkedCount === 0) {
        // 未选中任何素材 - 显示"全选"
        iconName = 'square';
        buttonText = '全选';
    } else if (checkedCount === totalCount) {
        // 已全选 - 显示"取消全选"
        iconName = 'check-square';
        buttonText = '取消全选';
    } else {
        // 部分选中 - 显示"全选"（带部分选中图标）
        iconName = 'minus-square';
        buttonText = '全选';
    }
    
    // 更新普通筛选器中的全选按钮
    if (selectAllBtn) {
        selectAllBtn.innerHTML = `<i data-lucide="${iconName}"></i><span>${buttonText}</span>`;
    }
    
    // 更新AI分析结果中的全选按钮
    if (aiSelectAllBtn) {
        aiSelectAllBtn.innerHTML = `<i data-lucide="${iconName}"></i><span>${buttonText}</span>`;
    }
    
    // 重新初始化图标
    lucide.createIcons();
}

/**
 * 批量申用素材
 */
function applyBatch() {
    if (selectedMaterials.size === 0) {
        alert('请先选择素材');
        return;
    }
    
    // 获取选中的素材信息
    const selectedList = Array.from(selectedMaterials).map(id => {
        const material = currentMaterials.find(m => m.id === id);
        return material;
    });
    
    console.log('[批量申用] 选中素材列表：', selectedList);
    
    // 跳转到申用确认页面
    showApplicationFormPage(selectedList);
}

/**
 * 批量下载（需先通过申用审批）
 */
function downloadBatch() {
    // 此函数将在申用通过后调用
    alert(`开始下载 ${selectedMaterials.size} 个素材（下载功能待实现）`);
}

/**
 * 预览素材
 */
function previewMaterial(materialId) {
    const material = currentMaterials.find(m => m.id === materialId);
    if (!material) return;
    
    alert(`预览素材：${material.name}\n类型：${getTypeLabel(material.type)}\n（弹窗功能待实现）`);
}

/**
 * 查看素材详情
 */
function showMaterialDetail(materialId) {
    const material = currentMaterials.find(m => m.id === materialId);
    if (!material) return;
    
    alert(`素材详情：${material.name}\n素材ID：${material.id}\n（详情弹窗待实现）`);
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
        'projects': `《${ipName}》关联商业化项目列表页`
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
        'A': 'level-a',
        'B': 'level-b'
    };
    return map[level] || 'level-b';
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
    // 监听模块加载事件
    document.addEventListener('moduleLoaded', (event) => {
        const { moduleId } = event.detail;
        // 只在加载素材查询模块时初始化
        if (moduleId === 'module-material-query') {
            console.log('[素材查询] 模块加载，开始初始化');
            setTimeout(() => {
                initMaterialQueryModule();
            }, 100);
        }
    });
    
    // 首次加载时也初始化（兼容直接访问）
    setTimeout(() => {
        const container = document.getElementById('ipCardsContainer');
        if (container && container.closest('.page-content')) {
            console.log('[素材查询] 首次加载初始化');
            initMaterialQueryModule();
        }
    }, 100);
}

// ==================== 申用确认页面相关功能 ====================

// 申用素材列表（待申用的素材）
let applicationMaterials = [];
// 待删除的素材ID
let deletingMaterialId = null;

/**
 * 显示申用确认页面
 */
async function showApplicationFormPage(materials) {
    console.log('[申用确认] 打开申用确认页面，素材数量：', materials.length);
    
    // 保存申用素材列表
    applicationMaterials = [...materials];
    
    // 隐藏素材详情页
    const detailPage = document.querySelector('.material-detail-page');
    if (detailPage) {
        detailPage.style.display = 'none';
    }
    
    // 加载并显示申用确认页面
    const contentArea = document.querySelector('#monetization-content .page-content');
    if (!contentArea) return;
    
    try {
        // 加载申用表单HTML
        const response = await fetch('./modules/material-query/application-form.html');
        const htmlContent = await response.text();
        
        // 加载申用表单CSS（如果未加载）
        if (!document.querySelector('link[href="./modules/material-query/application-form.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = './modules/material-query/application-form.css';
            document.head.appendChild(link);
        }
        
        // 渲染页面
        contentArea.innerHTML = htmlContent;
        
        // 初始化页面
        initApplicationFormPage();
        
        // 重新初始化图标
        lucide.createIcons();
    } catch (error) {
        console.error('[申用确认] 加载页面失败:', error);
        alert('加载申用确认页面失败，请稍后重试');
    }
}

/**
 * 初始化申用确认页面
 */
function initApplicationFormPage() {
    console.log('[申用确认] 初始化页面');
    
    // 更新IP名称到面包屑（与详情页格式保持一致）
    const ipNameElement = document.getElementById('currentIPName');
    if (ipNameElement && currentIPName) {
        ipNameElement.textContent = `《${currentIPName}》已回收素材详情`;
    }
    
    // 更新选中数量
    updateApplicationCount();
    
    // 渲染素材表格
    renderApplicationMaterialsTable();
    
    // 绑定事件
    bindApplicationFormEvents();
}

/**
 * 更新申用数量显示
 */
function updateApplicationCount() {
    const countElement = document.getElementById('selectedCount');
    if (countElement) {
        countElement.textContent = applicationMaterials.length;
    }
    
    // 更新空状态显示
    const tableWrapper = document.querySelector('.materials-table-wrapper');
    const emptyState = document.getElementById('emptyState');
    const applicationInfo = document.getElementById('applicationInfo');
    
    if (applicationMaterials.length === 0) {
        if (tableWrapper) tableWrapper.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
        if (applicationInfo) applicationInfo.style.display = 'none';
    } else {
        if (tableWrapper) tableWrapper.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
        if (applicationInfo) applicationInfo.style.display = 'block';
    }
}

/**
 * 渲染申用素材表格
 */
function renderApplicationMaterialsTable() {
    const tbody = document.getElementById('materialsTableBody');
    if (!tbody) return;
    
    if (applicationMaterials.length === 0) {
        tbody.innerHTML = '';
        return;
    }
    
    tbody.innerHTML = applicationMaterials.map(material => `
        <tr data-material-id="${material.id}">
            <td>
                <div class="material-thumbnail">
                    ${getMaterialPreviewIcon(material.type)}
                </div>
            </td>
            <td>
                <span class="material-name-text" title="${material.name}">${material.name}</span>
            </td>
            <td>
                <span class="material-id">${material.id}</span>
            </td>
            <td>
                <span class="format-tag">${material.format}</span>
            </td>
            <td>
                <span class="size-info">${material.size}</span>
            </td>
            <td>
                <div class="project-file-checkbox">
                    <input type="checkbox" 
                           class="project-file-check" 
                           data-material-id="${material.id}"
                           ${material.projectFile === 'yes' ? '' : 'disabled'}>
                </div>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-preview" onclick="previewApplicationMaterial('${material.id}')">
                        <span>预览</span>
                    </button>
                    <button class="btn-action btn-delete" onclick="confirmDeleteMaterial('${material.id}')">
                        <span>删除</span>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    lucide.createIcons();
}

/**
 * 绑定申用表单事件
 */
function bindApplicationFormEvents() {
    // 面包屑返回按钮
    const backToIPList = document.getElementById('backToIPList');
    const backToMaterialDetail = document.getElementById('backToMaterialDetail');
    const backToDetailBtn = document.getElementById('backToDetailBtn');
    
    if (backToIPList) {
        backToIPList.onclick = () => backToMaterialQuery();
    }
    
    if (backToMaterialDetail) {
        backToMaterialDetail.onclick = () => backToMaterialDetailFromForm();
    }
    
    if (backToDetailBtn) {
        backToDetailBtn.onclick = () => backToMaterialDetailFromForm();
    }
    
    // 申用记录按钮
    const goToRecordsBtn = document.getElementById('goToRecordsBtn');
    if (goToRecordsBtn) {
        goToRecordsBtn.onclick = () => loadApplicationRecordsPage();
    }
    
    // 操作按钮
    const cancelBtn = document.getElementById('cancelApplicationBtn');
    const saveBtn = document.getElementById('saveApplicationBtn');
    const confirmBtn = document.getElementById('confirmApplicationBtn');
    
    if (cancelBtn) {
        cancelBtn.onclick = () => cancelApplication();
    }
    
    if (saveBtn) {
        saveBtn.onclick = () => saveApplicationDraft();
    }
    
    if (confirmBtn) {
        confirmBtn.onclick = () => confirmApplication();
    }
    
    // 确认提交弹窗的确认按钮
    const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');
    if (confirmSubmitBtn) {
        confirmSubmitBtn.onclick = () => submitApplication();
    }
    
    // 删除确认弹窗
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.onclick = () => deleteMaterialFromApplication();
    }
    
    // 弹窗关闭按钮
    document.querySelectorAll('[data-modal]').forEach(btn => {
        btn.onclick = function() {
            const modalId = this.dataset.modal;
            closeModal(modalId);
        };
    });
}

/**
 * 返回素材详情页
 */
async function backToMaterialDetailFromForm() {
    const contentArea = document.querySelector('#monetization-content .page-content');
    if (!contentArea) return;
    
    console.log('[申用确认] 返回素材详情页，当前IP:', currentIPName);
    
    // 保存当前状态
    const savedIPName = currentIPName;
    const savedMaterials = [...currentMaterials];
    const savedSelectedMaterials = new Set(selectedMaterials);
    const savedMaterialFilters = { ...materialFilters };
    
    // 重新加载素材查询模块的HTML
    try {
        const response = await fetch('./modules/material-query/index.html');
        const htmlContent = await response.text();
        contentArea.innerHTML = htmlContent;
        
        // 确保数据已加载
        if (!moduleData) {
            await loadModuleData();
        }
        if (!materialsData) {
            await loadMaterialsData();
        }
        
        // 恢复状态
        currentIPName = savedIPName;
        currentMaterials = savedMaterials;
        selectedMaterials = savedSelectedMaterials;
        materialFilters = savedMaterialFilters;
        
        // 绑定主页面的事件
        bindEvents();
        
        // 直接显示素材详情页
        const mainPage = document.querySelector('.material-query-page');
        const detailPage = document.querySelector('.material-detail-page');
        
        if (mainPage && detailPage && currentIPName) {
            mainPage.style.display = 'none';
            detailPage.style.display = 'block';
            
            // 更新面包屑
            const breadcrumbElement = document.getElementById('detailIPName');
            if (breadcrumbElement) {
                breadcrumbElement.textContent = `《${currentIPName}》已回收素材详情`;
            }
            
            // 绑定素材详情页事件
            bindMaterialDetailEvents();
            
            // 渲染素材卡片（保持之前的筛选状态）
            renderMaterialCards();
            
            // 恢复选中状态
            setTimeout(() => {
                document.querySelectorAll('.material-checkbox').forEach(cb => {
                    if (selectedMaterials.has(cb.dataset.id)) {
                        cb.checked = true;
                    }
                });
                updateBatchActionBar();
                updateSelectAllButton();
            }, 100);
            
            lucide.createIcons();
        }
    } catch (error) {
        console.error('[申用确认] 返回素材详情页失败:', error);
        // 如果失败，至少返回到列表页
        backToMaterialQuery();
    }
}

/**
 * 确认删除素材
 */
function confirmDeleteMaterial(materialId) {
    deletingMaterialId = materialId;
    const material = applicationMaterials.find(m => m.id === materialId);
    
    if (material) {
        const nameElement = document.getElementById('deleteTargetName');
        if (nameElement) {
            nameElement.textContent = material.name;
        }
    }
    
    openModal('deleteConfirmModal');
}

/**
 * 从申请列表删除素材
 */
function deleteMaterialFromApplication() {
    if (!deletingMaterialId) return;
    
    // 从列表中移除
    applicationMaterials = applicationMaterials.filter(m => m.id !== deletingMaterialId);
    
    // 同时从selectedMaterials中移除
    selectedMaterials.delete(deletingMaterialId);
    
    // 更新显示
    updateApplicationCount();
    renderApplicationMaterialsTable();
    
    // 关闭弹窗
    closeModal('deleteConfirmModal');
    deletingMaterialId = null;
    
    console.log('[申用确认] 素材已删除，剩余数量：', applicationMaterials.length);
}

/**
 * 预览申用素材
 */
function previewApplicationMaterial(materialId) {
    const material = applicationMaterials.find(m => m.id === materialId);
    if (!material) return;
    
    const previewContainer = document.getElementById('previewContainer');
    if (!previewContainer) return;
    
    previewContainer.innerHTML = `
        <div class="preview-info">
            <h4 style="margin-bottom: 16px; font-size: 18px; color: #333;">${material.name}</h4>
            <div class="preview-info-grid">
                <div class="preview-info-item">
                    <span class="label">素材ID:</span>
                    <span class="value">${material.id}</span>
                </div>
                <div class="preview-info-item">
                    <span class="label">素材类型:</span>
                    <span class="value">${getTypeLabel(material.type)}</span>
                </div>
                <div class="preview-info-item">
                    <span class="label">五要素:</span>
                    <span class="value">${getTagLabel(material.elementTag)}</span>
                </div>
                <div class="preview-info-item">
                    <span class="label">格式:</span>
                    <span class="value">${material.format}</span>
                </div>
                <div class="preview-info-item">
                    <span class="label">尺寸:</span>
                    <span class="value">${material.size}</span>
                </div>
                <div class="preview-info-item">
                    <span class="label">工程文件:</span>
                    <span class="value">${material.projectFile === 'yes' ? '有' : '无'}</span>
                </div>
                <div class="preview-info-item">
                    <span class="label">上传人:</span>
                    <span class="value">${material.uploader}</span>
                </div>
                <div class="preview-info-item">
                    <span class="label">上传时间:</span>
                    <span class="value">${material.uploadTime}</span>
                </div>
            </div>
        </div>
        <div style="margin-top: 24px; display: flex; align-items: center; justify-content: center; padding: 60px; background: #f5f5f5; border-radius: 12px;">
            ${getMaterialPreviewIcon(material.type)}
        </div>
    `;
    
    openModal('previewModal');
    lucide.createIcons();
}

/**
 * 取消申请
 */
function cancelApplication() {
    if (confirm('确定要取消申请吗？已填写的信息将会丢失。')) {
        backToMaterialDetailFromForm();
    }
}

/**
 * 保存申请记录
 */
function saveApplicationDraft() {
    // 验证必填项（用途说明改为非必填）
    const projectName = document.getElementById('projectName')?.value.trim();
    const department = document.getElementById('department')?.value.trim();
    const usageType = document.getElementById('usageType')?.value;
    
    if (!projectName || !department || !usageType) {
        alert('请填写所有必填项');
        return;
    }
    
    // 获取工程文件申请情况
    const projectFileRequests = Array.from(document.querySelectorAll('.project-file-check:checked'))
        .map(cb => cb.dataset.materialId);
    
    const usageDescription = document.getElementById('usageDescription')?.value.trim();
    
    const draftData = {
        materials: applicationMaterials,
        projectFileRequests,
        projectName,
        applicant: document.getElementById('applicant')?.value,
        department,
        usageType,
        usageDescription: usageDescription || '',
        savedAt: new Date().toISOString(),
        status: 'draft' // 草稿状态
    };
    
    console.log('[申用确认] 保存草稿:', draftData);
    
    // 创建草稿记录并跳转到申用记录页
    createApplicationRecord(draftData);
}

/**
 * 确认申请
 */
function confirmApplication() {
    if (applicationMaterials.length === 0) {
        alert('申请列表为空，无法提交');
        return;
    }
    
    // 验证必填项（用途说明改为非必填）
    const projectName = document.getElementById('projectName')?.value.trim();
    const department = document.getElementById('department')?.value.trim();
    const usageType = document.getElementById('usageType')?.value;
    
    if (!projectName) {
        alert('请填写项目名称');
        document.getElementById('projectName')?.focus();
        return;
    }
    
    if (!department) {
        alert('请填写所属部门');
        document.getElementById('department')?.focus();
        return;
    }
    
    if (!usageType) {
        alert('请选择使用类型');
        document.getElementById('usageType')?.focus();
        return;
    }
    
    // 打开确认提交弹窗
    openModal('confirmSubmitModal');
}

/**
 * 打开弹窗
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        lucide.createIcons();
    }
}

/**
 * 关闭弹窗
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * 实际提交申请（从确认弹窗触发）
 */
function submitApplication() {
    // 获取表单数据
    const projectName = document.getElementById('projectName')?.value.trim();
    const department = document.getElementById('department')?.value.trim();
    const usageType = document.getElementById('usageType')?.value;
    const usageDescription = document.getElementById('usageDescription')?.value.trim();
    const applicant = document.getElementById('applicant')?.value;
    
    // 获取工程文件申请情况
    const projectFileRequests = Array.from(document.querySelectorAll('.project-file-check:checked'))
        .map(cb => cb.dataset.materialId);
    
    const applicationData = {
        materials: applicationMaterials,
        projectFileRequests,
        projectName,
        applicant,
        department,
        usageType,
        usageDescription: usageDescription || '',
        submittedAt: new Date().toISOString(),
        status: 'pending' // 待审核状态
    };
    
    console.log('[申用确认] 提交申请:', applicationData);
    
    // 关闭确认弹窗
    closeModal('confirmSubmitModal');
    
    // 创建申请记录并跳转到申用记录页
    createApplicationRecord(applicationData);
}

/**
 * 创建申请记录并跳转到申用记录页
 */
function createApplicationRecord(recordData) {
    // 生成申请编号
    const timestamp = Date.now();
    const applyNo = `AP${timestamp}`;
    
    // 构建记录对象
    const newRecord = {
        applyNo: applyNo,
        ipName: currentIPName || '未知IP',
        projectName: recordData.projectName,
        materialCount: recordData.materials.length,
        usageType: recordData.usageType,
        applicant: recordData.applicant,
        applyTime: new Date().toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).replace(/\//g, '-'),
        status: recordData.status, // 'draft' 或 'pending'
        materials: recordData.materials,
        projectFileRequests: recordData.projectFileRequests || [],
        department: recordData.department,
        usageDescription: recordData.usageDescription
    };
    
    console.log('[申用确认] 创建新记录:', newRecord);
    
    // 清空当前申请数据
    selectedMaterials.clear();
    applicationMaterials = [];
    
    // 跳转到申用记录页并传递新记录
    loadApplicationRecordsPage(newRecord);
}


/**
 * 加载申用记录页面
 */
async function loadApplicationRecordsPage(newRecord = null) {
    const contentArea = document.querySelector('#monetization-content .page-content');
    if (!contentArea) return;
    
    console.log('[素材查询] 跳转到申用记录页', newRecord ? '（携带新记录）' : '');
    
    // 如果有新记录，保存到全局变量供申用记录页使用
    if (newRecord) {
        window.newApplicationRecord = newRecord;
    }
    
    try {
        // 确保一级页样式已加载（用于复用筛选器样式）
        const existingStyleLink = document.querySelector('link[href*="material-query/style.css"]');
        if (!existingStyleLink) {
            const styleLink = document.createElement('link');
            styleLink.rel = 'stylesheet';
            styleLink.href = './modules/material-query/style.css';
            document.head.appendChild(styleLink);
        }
        
        // 加载申用记录页CSS
        const existingRecordsLink = document.querySelector('link[href*="application-records.css"]');
        if (!existingRecordsLink) {
            const recordsLink = document.createElement('link');
            recordsLink.rel = 'stylesheet';
            recordsLink.href = './modules/material-query/application-records.css';
            document.head.appendChild(recordsLink);
        }
        
        // 加载HTML
        const htmlResponse = await fetch('./modules/material-query/application-records.html');
        const htmlContent = await htmlResponse.text();
        
        console.log('[素材查询] HTML加载成功，长度:', htmlContent.length);
        
        // 分离HTML和script
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // 提取script标签
        const scripts = tempDiv.querySelectorAll('script');
        console.log('[素材查询] 找到script标签数量:', scripts.length);
        const scriptContents = Array.from(scripts).map(script => script.textContent);
        
        // 移除script标签后渲染HTML
        scripts.forEach(script => script.remove());
        contentArea.innerHTML = tempDiv.innerHTML;
        
        console.log('[素材查询] HTML已渲染，准备执行script');
        
        // 执行script
        scriptContents.forEach((scriptContent, index) => {
            console.log(`[素材查询] 执行script ${index + 1}/${scriptContents.length}`);
            const script = document.createElement('script');
            script.textContent = scriptContent;
            document.body.appendChild(script);
        });
        
        // 初始化图标
        setTimeout(() => {
            lucide.createIcons();
        }, 150);
        
    } catch (error) {
        console.error('[素材查询] 加载申用记录页失败:', error);
        alert('加载申用记录页失败，请稍后重试');
    }
}

