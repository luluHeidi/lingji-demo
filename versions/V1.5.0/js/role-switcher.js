/**
 * 灵机系统 - 角色切换器 v5.0
 * 功能：悬浮角色切换球 + 角色切换 + 菜单/模块/数据权限/操作权限过滤
 * 数据通过 localStorage 与权限配置系统共享
 * v5.0: 操作权限全系统拆解（17个模块），按模块分组标识
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'lingji-role-config';
    const CURRENT_ROLE_KEY = 'lingji-current-role';

    // 品类映射
    const CATEGORY_MAP = {
        'cat-tv': { label: '电视剧', mqTab: 'tvSeries', authFilter: '电视剧' },
        'cat-anime': { label: '动漫', mqTab: 'animation', authFilter: '动漫' },
        'cat-variety': { label: '综艺', mqTab: 'variety', authFilter: '综艺' },
        'cat-movie': { label: '电影', mqTab: null, authFilter: '电影' },
        'cat-documentary': { label: '纪录片', mqTab: null, authFilter: '纪录片' },
        'cat-kids': { label: '少儿', mqTab: null, authFilter: '少儿' },
        'cat-short-drama': { label: '横屏短剧', mqTab: null, authFilter: '横屏短剧' }
    };

    // 操作权限定义（与 role-admin.html v5 同步 — 全系统拆解）
    const OPERATIONS_MAP = {
        // 素材上传
        'op-mu-create-task': '创建上传任务',
        'op-mu-delegate': '委派外包',
        'op-mu-self-upload': '自行上传',
        'op-mu-track-progress': '进度追踪',
        'op-mu-manage-link': '临时链接管理',
        'op-mu-review-approve': '审批通过',
        'op-mu-review-reject': '审批驳回',
        'op-mu-review-comment': '审批批注',
        'op-mu-submit-demand': '提交素材需求',
        'op-mu-process-demand': '处理素材需求',
        'op-mu-batch-import': '批量非标导入',
        'op-mu-sorting-confirm': '分拣确认',
        'op-mu-sorting-adjust': '分拣调整',
        'op-mu-archive': '素材归档',
        'op-mu-temp-link-upload': '临时链接上传',
        // 素材查询与申用
        'op-mq-search': 'IP素材搜索',
        'op-mq-view-detail': '素材详情查看',
        'op-mq-apply': '素材申用',
        'op-mq-batch-apply': '批量申用',
        'op-mq-view-records': '申用记录查看',
        'op-mq-download': '素材下载',
        // 授权管理
        'op-am-add-ip': '添加审查IP',
        'op-am-review-first': '权益初审',
        'op-am-review-second': '权益复审',
        'op-am-review-final': '终审',
        'op-am-contract-compare': '合同对照',
        'op-am-edit-auth-time': '编辑授权时间',
        'op-am-view-detail': '权益详情查看',
        // 权益大盘
        'op-ro-view-dashboard': '查看权益大盘',
        'op-ro-export-report': '导出报表',
        // 视频权益明细
        'op-rv-search': '权益搜索',
        'op-rv-view-detail': '权益详情',
        'op-rv-export': '数据导出',
        // 衍生权益明细
        'op-rd-search': '衍生权益搜索',
        'op-rd-view-detail': '衍生权益详情',
        'op-rd-export': '衍生数据导出',
        // 素材库概览
        'op-mo-view-stats': '查看素材统计',
        'op-mo-view-trends': '查看趋势',
        // 素材工具箱
        'op-mt-use-tool': '使用工具',
        'op-mt-batch-process': '批量处理',
        // 衍生项目管理
        'op-dp-create': '创建项目',
        'op-dp-edit': '编辑项目',
        'op-dp-view': '查看项目',
        'op-dp-close': '关闭项目',
        // 监修管理
        'op-ds-create-task': '创建监修任务',
        'op-ds-review': '监修审核',
        'op-ds-feedback': '反馈记录',
        // 商品项目管理
        'op-pp-create': '创建商品项目',
        'op-pp-edit': '编辑商品项目',
        'op-pp-view': '查看商品项目',
        // 商品流程管理
        'op-pw-config': '流程配置',
        'op-pw-monitor': '流程监控',
        // 防伪技术选型
        'op-at-view-schemes': '查看方案',
        'op-at-select': '技术选型',
        // 防伪素材配置
        'op-afm-upload': '上传防伪素材',
        'op-afm-config': '配置防伪素材',
        'op-afm-preview': '素材预览',
        // 谷子码管理
        'op-gz-generate': '生成谷子码',
        'op-gz-manage-batch': '批次管理',
        'op-gz-stats': '使用统计',
        // 经营数据
        'op-db-view': '查看经营数据',
        'op-db-export': '导出经营报表',
        // 行业数据
        'op-di-view': '查看行业数据',
        'op-di-compare': '竞品对比',
        'op-di-export': '导出行业报表'
    };

    // 默认配置
    const DEFAULT_CONFIG = {
        version: 5,
        folders: [
            { id: 'folder-default', name: '默认分组', icon: '📋', collapsed: false },
            { id: 'folder-material', name: '素材运营组', icon: '📁', collapsed: false },
            { id: 'folder-auth', name: '授权审查组', icon: '🎬', collapsed: false },
            { id: 'folder-upload', name: '素材上传组', icon: '📤', collapsed: false }
        ],
        roles: [
            {
                id: 'admin', name: '鲁海洋', title: '管理员', dept: 'IP产品组',
                color: '#006eff', menus: ['all'], categories: ['all'], operations: ['all'],
                folderId: 'folder-default'
            },
            {
                id: 'material-op', name: '李小华', title: '素材运营', dept: '会员运营组',
                color: '#00b578',
                menus: [
                    'material-library',
                    'material-overview', 'material-query', 'material-upload', 'material-tools',
                    'mq-ip-list', 'mq-material-detail', 'mq-apply', 'mq-records',
                    'mu-standard', 'mu-batch', 'mu-demand', 'mu-sorting'
                ],
                categories: ['cat-tv', 'cat-anime', 'cat-variety'],
                operations: [
                    'op-mu-create-task', 'op-mu-delegate', 'op-mu-self-upload', 'op-mu-track-progress',
                    'op-mu-manage-link', 'op-mu-submit-demand', 'op-mu-process-demand',
                    'op-mu-batch-import', 'op-mu-sorting-confirm', 'op-mu-sorting-adjust', 'op-mu-archive',
                    'op-mq-search', 'op-mq-view-detail', 'op-mq-apply', 'op-mq-batch-apply', 'op-mq-view-records', 'op-mq-download'
                ],
                folderId: 'folder-material'
            },
            {
                id: 'auth-reviewer', name: '王大伟', title: '授权审核员', dept: '衍生品运营组',
                color: '#ff8f1f',
                menus: [
                    'rights-library',
                    'rights-overview', 'video-rights', 'derivative-rights',
                    'video-auth', 'auth-management',
                    'am-projects', 'am-rights-review', 'am-project-data', 'am-auth-list', 'am-approvals',
                    'derivative-auth', 'derivative-project', 'derivative-supervision'
                ],
                categories: ['all'],
                operations: [
                    'op-am-add-ip', 'op-am-review-first', 'op-am-review-second', 'op-am-review-final',
                    'op-am-contract-compare', 'op-am-edit-auth-time', 'op-am-view-detail',
                    'op-ro-view-dashboard',
                    'op-rv-search', 'op-rv-view-detail',
                    'op-rd-search', 'op-rd-view-detail'
                ],
                folderId: 'folder-auth'
            },
            {
                id: 'product-dev-role', name: '张小明', title: '商品开发', dept: '自研商品组',
                color: '#7c3aed',
                menus: [
                    'material-library',
                    'material-overview', 'material-query',
                    'mq-ip-list', 'mq-material-detail',
                    'product-dev', 'product-project', 'product-workflow',
                    'anti-fake', 'tech-selection', 'material-config', 'guzi-code'
                ],
                categories: ['cat-tv', 'cat-anime', 'cat-variety', 'cat-movie'],
                operations: [
                    'op-mq-search', 'op-mq-view-detail', 'op-mq-apply', 'op-mq-view-records', 'op-mq-download',
                    'op-pp-create', 'op-pp-edit', 'op-pp-view',
                    'op-pw-config', 'op-pw-monitor',
                    'op-at-view-schemes', 'op-at-select',
                    'op-afm-upload', 'op-afm-config', 'op-afm-preview',
                    'op-gz-generate', 'op-gz-manage-batch', 'op-gz-stats'
                ],
                folderId: 'folder-default'
            },
            {
                id: 'data-analyst', name: '陈思思', title: '数据分析师', dept: '数据服务组',
                color: '#ee3f4d',
                menus: [
                    'rights-library',
                    'rights-overview', 'video-rights', 'derivative-rights',
                    'data-service', 'business-data', 'industry-data'
                ],
                categories: ['all'],
                operations: [
                    'op-ro-view-dashboard', 'op-ro-export-report',
                    'op-rv-search', 'op-rv-view-detail', 'op-rv-export',
                    'op-rd-search', 'op-rd-view-detail', 'op-rd-export',
                    'op-db-view', 'op-db-export',
                    'op-di-view', 'op-di-compare', 'op-di-export'
                ],
                folderId: 'folder-default'
            },
            // 素材上传组
            {
                id: 'mu-pm', name: '张小明', title: '内部PM', dept: 'IP产品组',
                color: '#7c3aed',
                menus: ['material-library', 'material-upload', 'mu-standard', 'mu-batch', 'mu-demand', 'mu-sorting'],
                categories: ['all'],
                operations: [
                    'op-mu-create-task', 'op-mu-delegate', 'op-mu-self-upload', 'op-mu-track-progress',
                    'op-mu-manage-link', 'op-mu-process-demand', 'op-mu-batch-import',
                    'op-mu-sorting-confirm', 'op-mu-sorting-adjust', 'op-mu-archive'
                ],
                folderId: 'folder-upload'
            },
            {
                id: 'mu-approver', name: '赵制片', title: '审批人', dept: '制片管理组',
                color: '#f59e0b',
                menus: ['material-library', 'material-upload', 'mu-standard'],
                categories: ['all'],
                operations: ['op-mu-review-approve', 'op-mu-review-reject', 'op-mu-review-comment', 'op-mu-track-progress'],
                folderId: 'folder-upload'
            },
            {
                id: 'mu-consumer', name: '李小华', title: '下游消费者', dept: '商品运营组',
                color: '#06b6d4',
                menus: ['material-library', 'material-upload', 'mu-demand'],
                categories: ['cat-tv', 'cat-anime', 'cat-variety'],
                operations: ['op-mu-submit-demand', 'op-mu-track-progress'],
                folderId: 'folder-upload'
            },
            {
                id: 'mu-data-ai', name: '陈工', title: '数据/AI团队', dept: '技术团队',
                color: '#8b5cf6',
                menus: ['material-library', 'material-upload', 'mu-batch', 'mu-sorting'],
                categories: ['all'],
                operations: ['op-mu-batch-import', 'op-mu-sorting-confirm', 'op-mu-sorting-adjust', 'op-mu-archive'],
                folderId: 'folder-upload'
            },
            {
                id: 'mu-outsource', name: '外包-王师傅', title: '外包执行者', dept: '外部协作',
                color: '#64748b',
                menus: [],
                categories: [],
                operations: ['op-mu-temp-link-upload', 'op-mu-self-upload'],
                folderId: 'folder-upload'
            }
        ]
    };

    // 悬浮球中文件夹折叠状态（内存态）
    const fabFolderCollapsed = {};

    /** 获取角色配置 */
    function getConfig() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && parsed.roles && parsed.roles.length > 0) {
                    // v4→v5 迁移：操作权限ID格式变更，旧数据直接重置
                    if (!parsed.version || parsed.version < 5) {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CONFIG));
                        return DEFAULT_CONFIG;
                    }
                    parsed.roles.forEach(r => {
                        if (!r.categories) r.categories = ['all'];
                        if (!r.folderId) r.folderId = null;
                        if (!r.operations) r.operations = [];
                    });
                    if (!parsed.folders) parsed.folders = [];
                    return parsed;
                }
            }
        } catch (e) { }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CONFIG));
        return DEFAULT_CONFIG;
    }

    /** 获取当前角色 */
    function getCurrentRole() {
        const config = getConfig();
        const currentId = localStorage.getItem(CURRENT_ROLE_KEY);
        return config.roles.find(r => r.id === currentId) || config.roles[0];
    }

    /** 设置当前角色 */
    function setCurrentRole(roleId) {
        localStorage.setItem(CURRENT_ROLE_KEY, roleId);
    }

    /** 获取角色品类标签 */
    function getRoleCategories(role) {
        const cats = role.categories || ['all'];
        if (cats.includes('all')) return Object.values(CATEGORY_MAP).map(c => c.label);
        return cats.filter(id => CATEGORY_MAP[id]).map(id => CATEGORY_MAP[id].label);
    }

    /** 应用角色 */
    function applyRole(role) {
        // 更新顶栏
        const userName = document.querySelector('.user-name');
        const userRole = document.querySelector('.user-role');
        if (userName) userName.textContent = role.name;
        if (userRole) userRole.textContent = role.title;

        // 更新头像颜色
        const avatar = document.querySelector('.user-avatar');
        if (avatar) {
            avatar.style.background = role.color + '22';
            const icon = avatar.querySelector('.avatar-icon');
            if (icon) icon.style.color = role.color;
        }

        // 过滤菜单
        filterMenus(role);

        // 更新悬浮球
        updateFab(role);

        // 广播事件
        document.dispatchEvent(new CustomEvent('roleChanged', {
            detail: {
                role,
                categories: getRoleCategories(role),
                categoryIds: role.categories || ['all'],
                categoryMap: CATEGORY_MAP,
                operations: role.operations || [],
                operationsMap: OPERATIONS_MAP
            }
        }));
    }

    /** 过滤菜单 */
    function filterMenus(role) {
        const isAdmin = role.menus.includes('all');
        const menuGroups = document.querySelectorAll('.menu-group');

        menuGroups.forEach(group => {
            const level1 = group.querySelector('.menu-item.level-1');
            const level1MenuId = level1?.dataset.menu;

            if (isAdmin) {
                group.style.display = '';
                group.querySelectorAll('.menu-item.level-2').forEach(m => m.style.display = '');
                return;
            }

            const level1Visible = role.menus.includes(level1MenuId);
            const level2Items = group.querySelectorAll('.menu-item.level-2');
            let anyLevel2Visible = false;
            level2Items.forEach(item => {
                const visible = role.menus.includes(item.dataset.submenu);
                item.style.display = visible ? '' : 'none';
                if (visible) anyLevel2Visible = true;
            });

            group.style.display = (level1Visible || anyLevel2Visible) ? '' : 'none';
        });
    }

    /** 创建悬浮球 */
    function createFab() {
        const fab = document.createElement('div');
        fab.id = 'role-switcher-fab';
        fab.innerHTML = `
            <div class="rsf-ball">
                <span class="rsf-icon">👤</span>
            </div>
            <div class="rsf-panel" style="display:none">
                <div class="rsf-header">
                    <span class="rsf-title">切换演示角色</span>
                    <a class="rsf-config-link" href="role-admin.html" target="_blank" title="权限配置">⚙️</a>
                </div>
                <div class="rsf-list"></div>
                <div class="rsf-footer">
                    <span class="rsf-hint">角色数据可在权限配置系统中编辑</span>
                </div>
            </div>
        `;
        document.body.appendChild(fab);

        const ball = fab.querySelector('.rsf-ball');
        const panel = fab.querySelector('.rsf-panel');

        ball.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = panel.style.display !== 'none';
            panel.style.display = isOpen ? 'none' : '';
            if (!isOpen) renderRoleList();
        });

        document.addEventListener('click', (e) => {
            if (!fab.contains(e.target)) {
                panel.style.display = 'none';
            }
        });

        return fab;
    }

    /** 渲染角色列表（按文件夹分组） */
    function renderRoleList() {
        const config = getConfig();
        const current = getCurrentRole();
        const list = document.querySelector('.rsf-list');
        if (!list) return;

        const folders = config.folders || [];
        const folderMap = {};
        folders.forEach(f => { folderMap[f.id] = []; });
        folderMap['__ungrouped__'] = [];

        config.roles.forEach(role => {
            const fid = role.folderId;
            if (fid && folderMap[fid]) {
                folderMap[fid].push(role);
            } else {
                folderMap['__ungrouped__'].push(role);
            }
        });

        let html = '';

        // 未分组
        const ungrouped = folderMap['__ungrouped__'];
        if (ungrouped.length > 0) {
            const isCollapsed = fabFolderCollapsed['__ungrouped__'] || false;
            html += `
                <div class="rsf-folder-group">
                    <div class="rsf-folder-header" data-fab-folder="__ungrouped__">
                        <span class="rsf-folder-toggle ${isCollapsed ? 'collapsed' : ''}">▼</span>
                        <span class="rsf-folder-icon">📋</span>
                        <span class="rsf-folder-name">未分组</span>
                        <span class="rsf-folder-count">${ungrouped.length}</span>
                    </div>
                    <div class="rsf-folder-body ${isCollapsed ? 'rsf-collapsed' : ''}">
                        ${ungrouped.map(role => renderRoleItem(role, current)).join('')}
                    </div>
                </div>
            `;
        }

        // 各文件夹
        folders.forEach(folder => {
            const roles = folderMap[folder.id] || [];
            if (roles.length === 0) return;
            const isCollapsed = fabFolderCollapsed[folder.id] || false;
            html += `
                <div class="rsf-folder-group">
                    <div class="rsf-folder-header" data-fab-folder="${folder.id}">
                        <span class="rsf-folder-toggle ${isCollapsed ? 'collapsed' : ''}">▼</span>
                        <span class="rsf-folder-icon">${folder.icon || '📁'}</span>
                        <span class="rsf-folder-name">${folder.name}</span>
                        <span class="rsf-folder-count">${roles.length}</span>
                    </div>
                    <div class="rsf-folder-body ${isCollapsed ? 'rsf-collapsed' : ''}">
                        ${roles.map(role => renderRoleItem(role, current)).join('')}
                    </div>
                </div>
            `;
        });

        list.innerHTML = html;

        // 绑定文件夹折叠事件
        list.querySelectorAll('.rsf-folder-header').forEach(header => {
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                const fid = header.dataset.fabFolder;
                fabFolderCollapsed[fid] = !fabFolderCollapsed[fid];
                const toggle = header.querySelector('.rsf-folder-toggle');
                const body = header.nextElementSibling;
                if (toggle) toggle.classList.toggle('collapsed');
                if (body) body.classList.toggle('rsf-collapsed');
            });
        });

        // 绑定角色点击事件
        list.querySelectorAll('.rsf-item').forEach(item => {
            item.addEventListener('click', () => {
                const roleId = item.dataset.roleId;
                const role = config.roles.find(r => r.id === roleId);
                if (role) {
                    setCurrentRole(roleId);
                    applyRole(role);
                    renderRoleList();
                    if (window.moduleLoader && window.moduleLoader.currentModule) {
                        const mid = window.moduleLoader.currentModule;
                        window.moduleLoader.reloadModule(mid);
                    }
                }
            });
        });
    }

    function renderRoleItem(role, current) {
        const cats = role.categories || ['all'];
        const isCatAll = cats.includes('all');
        const catLabels = isCatAll ? '全部品类' : cats
            .filter(id => CATEGORY_MAP[id])
            .map(id => CATEGORY_MAP[id].label)
            .join('、');

        const ops = role.operations || [];
        const isOpsAll = ops.includes('all');
        const opsLabel = isOpsAll ? '全部操作' :
            ops.length > 0 ? `${ops.length}项操作` : '无操作权限';

        return `
            <div class="rsf-item ${role.id === current.id ? 'rsf-item--active' : ''}" data-role-id="${role.id}">
                <div class="rsf-avatar" style="background:${role.color}22;color:${role.color}">
                    ${role.name.charAt(0)}
                </div>
                <div class="rsf-info">
                    <div class="rsf-name">${role.name}</div>
                    <div class="rsf-meta">${role.title} · ${role.dept}</div>
                    <div class="rsf-tags">
                        <span class="rsf-cats">${catLabels}</span>
                        <span class="rsf-ops">${opsLabel}</span>
                    </div>
                </div>
                ${role.id === current.id ? '<span class="rsf-check">✓</span>' : ''}
            </div>
        `;
    }

    /** 更新悬浮球外观 */
    function updateFab(role) {
        const ball = document.querySelector('.rsf-ball');
        if (ball) {
            ball.style.background = `linear-gradient(135deg, ${role.color}, ${role.color}cc)`;
            ball.querySelector('.rsf-icon').textContent = role.name.charAt(0);
        }
    }

    /** 注入样式 */
    function injectStyles() {
        const style = document.createElement('style');
        style.id = 'role-switcher-styles';
        style.textContent = `
/* ===== 角色切换悬浮球 v3.0 ===== */
#role-switcher-fab {
    position: fixed;
    bottom: 28px;
    right: 28px;
    z-index: 99999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
}

.rsf-ball {
    width: 52px; height: 52px; border-radius: 50%;
    background: linear-gradient(135deg, #006eff, #006effcc);
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.08);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    user-select: none;
}
.rsf-ball:hover { transform: scale(1.1); box-shadow: 0 6px 24px rgba(0,0,0,0.22); }
.rsf-ball:active { transform: scale(0.95); }
.rsf-icon { font-size: 20px; font-style: normal; font-weight: 600; line-height: 1; }

/* 面板 */
.rsf-panel {
    position: absolute;
    bottom: 64px; right: 0;
    width: 340px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.06);
    overflow: hidden;
    animation: rsf-slideUp 0.25s ease;
}
@keyframes rsf-slideUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
}

.rsf-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 18px 12px;
    border-bottom: 1px solid #f0f0f0;
}
.rsf-title { font-size: 14px; font-weight: 600; color: #1a1a1a; }
.rsf-config-link {
    font-size: 18px; text-decoration: none; cursor: pointer;
    opacity: 0.6; transition: opacity 0.2s;
}
.rsf-config-link:hover { opacity: 1; }

/* 角色列表 */
.rsf-list {
    max-height: 450px;
    overflow-y: auto;
    padding: 4px 0;
}

/* 文件夹分组 */
.rsf-folder-group {
    border-bottom: 1px solid #f5f5f5;
}
.rsf-folder-group:last-child { border-bottom: none; }
.rsf-folder-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px 6px;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s;
}
.rsf-folder-header:hover { background: #fafafa; }
.rsf-folder-toggle {
    font-size: 10px;
    color: #bbb;
    transition: transform 0.2s;
    width: 12px;
    text-align: center;
}
.rsf-folder-toggle.collapsed { transform: rotate(-90deg); }
.rsf-folder-icon { font-size: 14px; }
.rsf-folder-name {
    font-size: 12px;
    font-weight: 600;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.rsf-folder-count {
    font-size: 11px;
    color: #ccc;
    background: #f5f5f5;
    border-radius: 8px;
    padding: 1px 6px;
    margin-left: auto;
}

.rsf-folder-body { transition: all 0.2s; }
.rsf-folder-body.rsf-collapsed { display: none; }

/* 角色条目 */
.rsf-item {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 18px 10px 36px;
    cursor: pointer;
    transition: background 0.15s;
    position: relative;
}
.rsf-item:hover { background: #f5f7fa; }
.rsf-item--active { background: #e6f2ff; }
.rsf-item--active:hover { background: #d6e8ff; }
.rsf-avatar {
    width: 34px; height: 34px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 600; flex-shrink: 0;
}
.rsf-info { flex: 1; min-width: 0; }
.rsf-name { font-size: 14px; font-weight: 500; color: #1a1a1a; line-height: 1.3; }
.rsf-meta { font-size: 12px; color: #999; margin-top: 1px; }
.rsf-cats {
    font-size: 11px; color: #006eff;
    background: #e6f2ff;
    display: inline-block;
    padding: 1px 8px; border-radius: 8px;
    max-width: 100%;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rsf-ops {
    font-size: 11px; color: #be185d;
    background: #fdf2f8;
    display: inline-block;
    padding: 1px 8px; border-radius: 8px;
}
.rsf-tags {
    display: flex; gap: 4px; flex-wrap: wrap; margin-top: 3px;
}
.rsf-check { color: #006eff; font-weight: 700; font-size: 16px; flex-shrink: 0; }

.rsf-footer { padding: 10px 18px; border-top: 1px solid #f0f0f0; }
.rsf-hint { font-size: 11px; color: #bbb; }
`;
        document.head.appendChild(style);
    }

    /** 监听 localStorage 变化 */
    function listenStorageChanges() {
        window.addEventListener('storage', (e) => {
            if (e.key === STORAGE_KEY) {
                const role = getCurrentRole();
                applyRole(role);
            }
        });
    }

    /** 初始化 */
    function init() {
        injectStyles();
        createFab();
        const role = getCurrentRole();
        applyRole(role);
        listenStorageChanges();
        console.log('[RoleSwitcher v4.0] 角色切换器已初始化，当前角色:', role.name, role.title,
            '| 数据权限:', (role.categories || ['all']).join(','),
            '| 操作权限:', (role.operations || []).join(','));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 全局 API
    window.RoleSwitcher = {
        getConfig,
        getCurrentRole,
        setCurrentRole: (id) => { setCurrentRole(id); applyRole(getCurrentRole()); },
        refresh: () => applyRole(getCurrentRole()),
        getRoleCategories: () => getRoleCategories(getCurrentRole()),
        getCategoryMap: () => CATEGORY_MAP,
        getRoleOperations: () => {
            const role = getCurrentRole();
            const ops = role.operations || [];
            if (ops.includes('all')) return Object.keys(OPERATIONS_MAP);
            return ops;
        },
        hasOperation: (opId) => {
            const role = getCurrentRole();
            const ops = role.operations || [];
            return ops.includes('all') || ops.includes(opId);
        },
        getOperationsMap: () => OPERATIONS_MAP
    };

})();
