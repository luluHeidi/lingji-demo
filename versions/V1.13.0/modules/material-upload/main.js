/**
 * 素材上传模块 v3.0 — 一级Tab导航（与素材查询/授权管理一致）
 * 版本: v3.0 | 日期: 2026-03-24
 * 架构: switchTab(tabId) / showPage(pageId) — 审批合并到任务详情
 */

;(function () {
    'use strict';

    // ===================== 常量 =====================
    const MOD_SEL = 'div[data-module="module-material-upload"]';
    const STATUS_LABEL = {
        draft: '草稿', active: '进行中', completed: '已完成', cancelled: '已取消',
        pending: '待分配', self_upload: '自行上传中', delegated: '已委派',
        uploading: '上传中', submitted: '已提交', reviewing: '审批中',
        approved: '已通过', rejected: '已退回', re_uploading: '补传中',
        sorting: '分拣中', archived: '已归档',
        replied_available: '已回复-可提供', replied_unavailable: '无法提供'
    };
    const STATUS_COLOR = {
        draft: 'gray', active: 'blue', completed: 'green', cancelled: 'gray',
        pending: 'gray', self_upload: 'blue', delegated: 'orange',
        uploading: 'blue', submitted: 'purple', reviewing: 'orange',
        approved: 'green', rejected: 'red', re_uploading: 'orange',
        sorting: 'blue', archived: 'green',
        replied_available: 'green', replied_unavailable: 'red'
    };

    // ===================== 应用状态 =====================
    let data = null;
    let currentPage = null;          // 当前页面 id
    let currentTaskId = null;        // 任务详情用
    let selectedSubtasks = new Set();
    let subtaskFormCount = 0;
    // 分拣台状态
    let sortingFiles = { high: [], medium: [], low: [] };
    let sortingContext = null;       // { taskId, subtaskIds }

    // ===================== 工具 =====================
    const $ = (sel, ctx) => (ctx || document).querySelector(sel);
    const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];
    const el = (id) => document.getElementById(id);

    function icons() {
        try { if (typeof lucide !== 'undefined') lucide.createIcons(); } catch (_) {}
    }

    function formatSize(bytes) {
        if (!bytes) return '-';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
        return (bytes / 1073741824).toFixed(1) + ' GB';
    }

    function fmtDate(iso) {
        if (!iso) return '-';
        return iso.replace('T', ' ').slice(0, 16);
    }

    function debounce(fn, ms) {
        let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    }

    function statusTag(status) {
        const c = STATUS_COLOR[status] || 'gray';
        return `<span class="status-tag status-tag--${c}">${STATUS_LABEL[status] || status}</span>`;
    }

    // ===================== 数据加载 =====================
    async function loadData() {
        try {
            // 路径兼容：ModuleLoader 加载时相对于主框架根目录
            const paths = [
                'modules/material-upload/data.json',
                './modules/material-upload/data.json',
                'data.json'
            ];
            for (const p of paths) {
                try {
                    const r = await fetch(p);
                    if (r.ok) { data = await r.json(); console.log('[素材上传] 数据已加载:', p); return; }
                } catch (_) {}
            }
            throw new Error('所有路径均失败');
        } catch (e) {
            console.error('[素材上传] 数据加载失败:', e);
            data = { uploadTasks: [], subTasks: [], tempLinks: [], uploadFiles: [], reviewRecords: [], materialRequests: [], ipList: [], milestones: [], materialTypes: [], ipSpaces: [], users: [] };
        }
    }

    // ===================== 导航核心 =====================
    let currentTab = 'standard';  // 当前一级Tab

    function switchTab(tabId) {
        currentTab = tabId;
        currentPage = null;
        currentTaskId = null;
        selectedSubtasks.clear();

        // 切换 Tab 高亮
        const root = $(MOD_SEL);
        $$('.category-tab', root).forEach(t => {
            t.classList.toggle('active', t.dataset.muTab === tabId);
        });

        // 切换面板显示
        $$('.mu-tab-panel', root).forEach(p => p.style.display = 'none');
        const panelMap = {
            'standard': 'mu-path-standard',
            'batch-import': 'mu-path-batch-import',
            'demand': 'mu-path-demand'
        };
        const panel = el(panelMap[tabId]);
        if (panel) panel.style.display = '';

        // 标准化：显示看板列表，隐藏跳转页
        if (tabId === 'standard') {
            const stdRoot = el('mu-path-standard');
            if (stdRoot) {
                $$('.mu-page-jump', stdRoot).forEach(j => j.style.display = 'none');
                const dashboard = el('mu-page-dashboard');
                if (dashboard) dashboard.style.display = '';
            }
            renderDashboard();
        }

        // Header 按钮显隐
        const btnCreate = el('mu-btn-create-task');
        const btnRequest = el('mu-btn-new-request');
        if (btnCreate) btnCreate.style.display = tabId === 'standard' ? '' : 'none';
        if (btnRequest) btnRequest.style.display = tabId === 'demand' ? '' : 'none';

        // 渲染对应内容
        if (tabId === 'demand') renderDemandTable();
        if (tabId === 'batch-import') renderBiHistory();

        icons();
    }

    function backToList() {
        // 从详情/创建/分拣台返回看板列表
        const stdRoot = el('mu-path-standard');
        if (stdRoot) {
            $$('.mu-page-jump', stdRoot).forEach(j => j.style.display = 'none');
            const dashboard = el('mu-page-dashboard');
            if (dashboard) dashboard.style.display = '';
        }
        // 恢复 Tab 栏和标题栏显示
        const mainTabs = el('mu-main-tabs');
        if (mainTabs) mainTabs.style.display = '';
        const breadcrumb = $(`${MOD_SEL} .page-breadcrumb`);
        if (breadcrumb) breadcrumb.style.display = '';

        currentPage = null;
        currentTaskId = null;
        selectedSubtasks.clear();
        renderDashboard();
        icons();
    }

    function showPage(pageId, pathId) {
        if (pathId) currentTab = pathId;
        currentPage = pageId;

        if (currentTab === 'standard') {
            const root = el('mu-path-standard');
            if (!root) return;
            const jumpPages = ['mu-page-task-detail', 'mu-page-create-task', 'mu-page-sorting-station'];

            if (jumpPages.includes(pageId)) {
                // 隐藏看板列表和 Tab 栏
                const dashboard = el('mu-page-dashboard');
                if (dashboard) dashboard.style.display = 'none';
                // 隐藏一级 Tab 和面包屑（让跳转页全屏展示）
                const mainTabs = el('mu-main-tabs');
                if (mainTabs) mainTabs.style.display = 'none';
                const breadcrumb = $(`${MOD_SEL} .page-breadcrumb`);
                if (breadcrumb) breadcrumb.style.display = 'none';
                // 隐藏其他跳转页
                $$('.mu-page-jump', root).forEach(j => j.style.display = 'none');
                // 显示当前跳转页
                const page = el(pageId);
                if (page) page.style.display = '';

                if (pageId === 'mu-page-task-detail') renderTaskDetail();
                else if (pageId === 'mu-page-create-task') renderCreateForm();
                else if (pageId === 'mu-page-sorting-station') renderSortingStation();
            }
        }
        icons();
    }

    // 兼容旧版 goHome — 直接切回标准化看板
    function goHome() {
        switchTab('standard');
    }

    // ===================== 任务看板 =====================
    function renderDashboard() {
        if (!data) return;
        const root = $(MOD_SEL);
        populateFilters(root);

        const fIP = el('filter-task-ip')?.value || 'all';
        const fStatus = el('filter-task-status')?.value || 'all';
        const fMilestone = el('filter-task-milestone')?.value || 'all';
        const fSearch = (el('search-task')?.value || '').toLowerCase();

        let tasks = data.uploadTasks.filter(t => {
            if (fIP !== 'all' && t.ipId !== fIP) return false;
            if (fStatus !== 'all' && t.status !== fStatus) return false;
            if (fMilestone !== 'all' && t.milestone !== fMilestone) return false;
            if (fSearch && !t.taskName.toLowerCase().includes(fSearch) && !t.ipName.toLowerCase().includes(fSearch)) return false;
            return true;
        });

        const grid = el('task-cards-container');
        const empty = el('dashboard-empty');
        if (!grid) return;

        if (tasks.length === 0) {
            grid.innerHTML = '';
            if (empty) empty.style.display = '';
            return;
        }
        if (empty) empty.style.display = 'none';

        grid.innerHTML = tasks.map(task => {
            const subs = data.subTasks.filter(s => s.taskId === task.taskId);
            const done = subs.filter(s => s.status === 'archived').length;
            const total = subs.length;
            const pct = total > 0 ? Math.round(done / total * 100) : 0;
            const msLabel = data.milestones.find(m => m.id === task.milestone)?.label || '';
            const now = Date.now();

            // ===== 一句话待办摘要（告诉用户最该关注什么） =====
            const todoReview = subs.filter(s => ['submitted', 'reviewing'].includes(s.status)).length;
            const todoSort = subs.filter(s => s.status === 'sorting').length;
            const todoUpload = subs.filter(s => ['pending', 'self_upload'].includes(s.status)).length;
            const todoReceive = subs.filter(s => s.status === 'delegated').length;

            // 链接告警
            const taskLinks = data.tempLinks.filter(l => l.taskId === task.taskId && l.status === 'active');
            const linkExpiring = taskLinks.filter(l => {
                const exp = new Date(l.expireAt).getTime();
                return exp - now < 3 * 86400000 && exp > now;
            }).length;

            // 截止日
            const deadlineDays = task.deadline ? Math.ceil((new Date(task.deadline).getTime() - now) / 86400000) : null;
            const deadlineClass = deadlineDays !== null && deadlineDays <= 7 ? (deadlineDays <= 3 ? 'deadline-urgent' : 'deadline-warning') : '';

            // 构建一句话摘要：只说最紧急的1-2件事
            let focusHtml = '';
            if (task.status === 'completed') {
                focusHtml = `<span class="task-card__focus task-card__focus--done"><i data-lucide="check-circle"></i> 全部完成</span>`;
            } else if (task.status === 'draft') {
                focusHtml = `<span class="task-card__focus task-card__focus--draft"><i data-lucide="edit-3"></i> 草稿未提交</span>`;
            } else {
                const items = [];
                if (todoReview > 0) items.push(`<span class="focus-item focus-item--review">${todoReview}项待审批</span>`);
                if (todoSort > 0) items.push(`<span class="focus-item focus-item--sort">${todoSort}项待分拣</span>`);
                if (todoUpload > 0) items.push(`<span class="focus-item focus-item--upload">${todoUpload}项待上传</span>`);
                if (todoReceive > 0) items.push(`<span class="focus-item focus-item--receive">${todoReceive}项待收件</span>`);
                if (linkExpiring > 0) items.push(`<span class="focus-item focus-item--warn">${linkExpiring}个链接将过期</span>`);
                if (items.length === 0) items.push(`<span class="focus-item focus-item--ok">无待办事项</span>`);
                focusHtml = items.join('<span class="focus-sep">·</span>');
            }

            // 截止日文本
            let deadlineHtml = '';
            if (task.deadline) {
                const label = deadlineDays !== null && deadlineDays <= 7
                    ? (deadlineDays <= 0 ? '已逾期' : `剩${deadlineDays}天`)
                    : task.deadline;
                deadlineHtml = `<span class="task-card__deadline ${deadlineClass}">${label}</span>`;
            }

            return `
            <div class="task-card" data-task-id="${task.taskId}">
                <div class="task-card__header">
                    <span class="task-card__ip">《${task.ipName}》</span>
                    ${deadlineHtml}
                </div>
                <div class="task-card__body">
                    <div class="task-card__name">${task.taskName}</div>
                    <div class="task-card__meta-line">
                        <span>${msLabel}</span>
                        ${statusTag(task.status)}
                    </div>
                </div>
                <div class="task-card__progress">
                    <div class="progress-bar-wrapper">
                        <div class="progress-bar-fill${pct >= 100 ? ' complete' : ''}" style="width:${pct}%"></div>
                    </div>
                    <span class="progress-text">${done}/${total}</span>
                </div>
                <div class="task-card__focus-bar">${focusHtml}</div>
            </div>`;
        }).join('');

        // 卡片点击
        $$('.task-card', grid).forEach(card => {
            card.addEventListener('click', () => window.muApp.openTaskDetail(card.dataset.taskId));
        });
        icons();
    }

    function populateFilters(root) {
        const ipSel = el('filter-task-ip');
        if (ipSel && ipSel.options.length <= 1) {
            data.ipList.forEach(ip => ipSel.add(new Option(`《${ip.name}》`, ip.id)));
        }
        const msSel = el('filter-task-milestone');
        if (msSel && msSel.options.length <= 1) {
            data.milestones.forEach(m => msSel.add(new Option(m.label, m.id)));
        }
    }

    // ===================== 任务详情 =====================
    function openTaskDetail(taskId) {
        currentTaskId = taskId;
        selectedSubtasks.clear();
        showPage('mu-page-task-detail', 'standard');
    }

    function renderTaskDetail() {
        if (!currentTaskId || !data) return;
        const task = data.uploadTasks.find(t => t.taskId === currentTaskId);
        if (!task) return;

        // 标题
        const titleEl = el('task-detail-title');
        if (titleEl) titleEl.textContent = `《${task.ipName}》${task.taskName}`;

        const content = el('task-detail-content');
        if (!content) return;

        const subs = data.subTasks.filter(s => s.taskId === currentTaskId);
        const links = data.tempLinks.filter(l => l.taskId === currentTaskId);
        const msLabel = data.milestones.find(m => m.id === task.milestone)?.label || '';

        // ===== v4.2：按事情分类，关注点标识做视觉区分 =====
        // 分类1: 上传任务 — 所有子任务按素材类型展示，标注关注级别
        // 分类2: 验收审查 — submitted/reviewing 状态的子任务
        // 分类3: 临时链接 — 活跃链接管理

        const reviewItems = subs.filter(s => ['submitted', 'reviewing'].includes(s.status));
        // 上传任务 = 排除纯审批状态的子任务（审批单独归到验收审查）
        const uploadItems = subs.filter(s => !['submitted', 'reviewing'].includes(s.status));
        const activeLinks = links.filter(l => l.status === 'active');

        // 关注级别判定：需行动 / 等待中 / 已完成
        function attentionLevel(s) {
            if (['pending', 'self_upload', 'sorting', 'rejected', 're_uploading'].includes(s.status)) return 'action';
            if (['delegated', 'uploading', 'approved'].includes(s.status)) return 'waiting';
            if (s.status === 'archived') return 'done';
            return 'waiting';
        }

        content.innerHTML = `
            <!-- ① IP素材总览（全局导览，放最顶部） -->
            ${renderIPOverviewBar(task.ipId)}

            <!-- ② 任务基本信息（精简一行） -->
            <div class="detail-meta-bar">
                <span class="detail-meta-item">${msLabel}</span>
                <span class="detail-meta-sep">·</span>
                <span class="detail-meta-item">${STATUS_LABEL[task.status] || task.status}</span>
                <span class="detail-meta-sep">·</span>
                <span class="detail-meta-item">截止 ${task.deadline || '未设置'}</span>
                <span class="detail-meta-sep">·</span>
                <span class="detail-meta-item">${task.creatorName}</span>
                ${task.description ? `<span class="detail-meta-sep">·</span><span class="detail-meta-item detail-meta-desc">${task.description}</span>` : ''}
            </div>

            <!-- ③ 上传任务 — 按素材类型展示，行内标注关注级别 -->
            <div class="detail-section detail-section--upload">
                <div class="section-header">
                    <span class="section-title"><i data-lucide="upload-cloud"></i> 上传任务 (${uploadItems.length})</span>
                    <div style="display:flex;gap:8px">
                        <button class="btn-outline btn-small" id="btn-gen-link"><i data-lucide="link"></i> 委派外包</button>
                        <button class="btn-primary btn-small" id="btn-self-upload"><i data-lucide="upload"></i> 自行上传</button>
                    </div>
                </div>
                ${uploadItems.length > 0 ? `
                <table class="data-table" id="subtask-data-table">
                    <thead><tr>
                        <th style="width:36px"><input type="checkbox" id="check-all-subtasks"></th>
                        <th>素材类型</th>
                        <th>数量要求</th>
                        <th>格式 / 规格</th>
                        <th>进度</th>
                        <th>操作</th>
                    </tr></thead>
                    <tbody>
                        ${uploadItems.map(s => renderUploadRow(s, attentionLevel(s))).join('')}
                    </tbody>
                </table>
                <div class="batch-action-bar" id="batch-action-bar" style="display:none">
                    <span>已选 <strong id="selected-count">0</strong> 项</span>
                    <div class="batch-actions">
                        <button onclick="window.muApp.openLinkModal()"><i data-lucide="link"></i> 委派外包</button>
                        <button onclick="window.muApp.batchSelfUpload()"><i data-lucide="upload"></i> 批量上传</button>
                    </div>
                </div>` : '<p class="empty-hint">暂无上传任务</p>'}
            </div>

            <!-- ④ 验收审查 — 已提交/审批中的子任务 -->
            ${reviewItems.length > 0 ? `
            <div class="detail-section detail-section--review">
                <div class="section-header">
                    <span class="section-title"><i data-lucide="clipboard-check"></i> 验收审查 (${reviewItems.length})</span>
                </div>
                <div class="review-cards">
                    ${reviewItems.map(s => {
                        const files = data.uploadFiles ? data.uploadFiles.filter(f => f.subtaskId === s.subtaskId) : [];
                        const passCount = files.filter(f => f.complianceCheck?.formatOk && f.complianceCheck?.sizeOk && f.complianceCheck?.resolutionOk).length;
                        const failCount = files.length - passCount;
                        const src = s.assigneeType === 'outsource' ? '外包提交' : '自行上传';
                        return `
                    <div class="review-card attention-action">
                        <div class="review-card__header">
                            <span class="review-card__type">${s.materialType}</span>
                            <span class="attention-badge attention-badge--action">需审批</span>
                        </div>
                        <div class="review-card__meta">
                            ${src} · ${s.uploadedCount} 个文件${files.length > 0 ? ` · 合规 <strong class="text-ok">${passCount}</strong> · 不合规 <strong class="text-err">${failCount}</strong>` : ''}
                        </div>
                        <div class="review-card__actions">
                            ${passCount > 0 ? `<button class="btn-primary btn-small" onclick="window.muApp.batchApprove('${s.subtaskId}')">批量通过合规项 (${passCount})</button>` : ''}
                            <button class="btn-outline btn-small" onclick="window.muApp.goReviewSubtask('${s.subtaskId}')">逐个审批 →</button>
                        </div>
                    </div>`;
                    }).join('')}
                </div>
            </div>` : ''}

            <!-- ⑤ 临时链接 — 外包协作管理 -->
            ${activeLinks.length > 0 ? `
            <div class="detail-section detail-section--links">
                <div class="section-header">
                    <span class="section-title"><i data-lucide="link"></i> 临时链接 (${activeLinks.length})</span>
                </div>
                <div class="link-cards">
                    ${activeLinks.map(l => {
                        const relSubs = subs.filter(s => l.subtaskIds.includes(s.subtaskId));
                        const names = relSubs.map(s => s.materialType).join('、');
                        const totalExpected = relSubs.reduce((a, s) => a + s.expectedCount, 0);
                        const totalUploaded = relSubs.reduce((a, s) => a + s.uploadedCount, 0);
                        const daysLeft = Math.ceil((new Date(l.expireAt) - new Date()) / 86400000);
                        const urgentClass = daysLeft <= 3 ? 'attention-action' : '';
                        const pct = totalExpected > 0 ? Math.round(totalUploaded / totalExpected * 100) : 0;
                        return `
                    <div class="link-card ${urgentClass}">
                        <div class="link-card__header">
                            <span class="link-card__name">${names || '链接'}</span>
                            ${daysLeft <= 3 ? '<span class="attention-badge attention-badge--action">即将过期</span>' : `<span class="link-card__days">${daysLeft}天后过期</span>`}
                        </div>
                        <div class="link-card__progress">
                            <div class="link-progress-bar"><div class="link-progress-fill" style="width:${pct}%"></div></div>
                            <span class="link-progress-text">${totalUploaded}/${totalExpected}</span>
                        </div>
                        <div class="link-card__meta">
                            有效至 ${l.expireAt.slice(0,10)}${l.requireRealName ? ' · 实名' : ''}${l.note ? ` · ${l.note}` : ''}
                        </div>
                        <div class="link-card__actions">
                            <button class="btn-link-action" onclick="window.muApp.copyLink('${l.token}')"><i data-lucide="copy"></i> 复制</button>
                            <button class="btn-link-action" onclick="window.muApp.renewLink('${l.linkId}')"><i data-lucide="refresh-cw"></i> 续期</button>
                            <button class="btn-link-action btn-link-action--danger" onclick="window.muApp.revokeLink('${l.linkId}')"><i data-lucide="x-circle"></i> 作废</button>
                        </div>
                    </div>`;
                    }).join('')}
                </div>
            </div>` : ''}
        `;

        // 绑定事件
        bindDetailEvents();
        icons();
    }

    function renderUploadRow(s, level) {
        const sensitive = s.isSensitive ? '<span class="sensitive-badge"><i data-lucide="lock"></i> 敏感</span>' : '';
        const pct = s.expectedCount > 0 ? Math.round(s.uploadedCount / s.expectedCount * 100) : 0;
        const progressText = `${s.uploadedCount}/${s.expectedCount}`;
        // 关注点标识：行级 class
        const rowClass = level === 'action' ? 'attention-row attention-row--action' : level === 'done' ? 'attention-row attention-row--done' : '';
        // 关注点 badge
        const badge = level === 'action' ? `<span class="attention-badge attention-badge--action">${attentionLabel(s.status)}</span>`
                     : level === 'done' ? '<span class="attention-badge attention-badge--done">已归档</span>'
                     : `<span class="attention-badge attention-badge--waiting">${STATUS_LABEL[s.status] || s.status}</span>`;
        return `<tr class="${rowClass}">
            <td><input type="checkbox" class="subtask-check" data-id="${s.subtaskId}" ${s.isSensitive ? 'disabled title="敏感素材不可外包"' : ''}></td>
            <td>${s.materialType} ${sensitive}</td>
            <td>${s.quantity}</td>
            <td style="font-size:12px">${s.formatRequirement}<br><span style="color:var(--text-placeholder,#999)">${s.specRequirement}</span></td>
            <td>${badge} <span class="subtask-progress-hint">${progressText}</span></td>
            <td>${subtaskActionBtn(s)}</td>
        </tr>`;
    }

    function attentionLabel(status) {
        const map = { pending: '待上传', self_upload: '上传中', sorting: '待分拣', rejected: '已退回', re_uploading: '补传中' };
        return map[status] || STATUS_LABEL[status] || status;
    }

    // IP素材总览条（轻量版，放详情页顶部做全局导览）
    function renderIPOverviewBar(ipId) {
        if (!data || !data.ipSpaces) return '';
        const space = data.ipSpaces.find(s => s.ipId === ipId);
        if (!space) return '';

        const types = [
            { key: 'poster', label: '海报', icon: 'image' },
            { key: 'trailer', label: '预告片', icon: 'film' },
            { key: 'still', label: '剧照', icon: 'camera' },
            { key: 'special', label: '特辑', icon: 'clapperboard' },
            { key: 'rare', label: '稀有', icon: 'gem' }
        ];

        const totalUploaded = Object.values(space.completeness).reduce((s, v) => s + v.uploaded, 0);
        const totalRequired = Object.values(space.completeness).reduce((s, v) => s + v.required, 0);
        const totalPct = totalRequired > 0 ? Math.round(totalUploaded / totalRequired * 100) : 0;

        const chips = types.filter(t => space.completeness[t.key]).map(t => {
            const d = space.completeness[t.key];
            const pct = d.required > 0 ? Math.round(d.uploaded / d.required * 100) : 0;
            const colorClass = pct >= 80 ? 'overview-chip--ok' : pct >= 50 ? 'overview-chip--warn' : 'overview-chip--danger';
            return `<span class="overview-chip ${colorClass}"><i data-lucide="${t.icon}"></i> ${t.label} ${d.uploaded}/${d.required}</span>`;
        }).join('');

        return `
        <div class="ip-overview-bar">
            <div class="ip-overview-bar__left">
                <span class="ip-overview-bar__title">《${space.ipName}》素材总览</span>
                <span class="ip-overview-bar__pct ${totalPct >= 80 ? '' : totalPct >= 50 ? 'text-warn' : 'text-danger'}">${totalPct}%</span>
            </div>
            <div class="ip-overview-bar__chips">${chips}</div>
        </div>`;
    }

    function subtaskActionBtn(sub) {
        if (sub.status === 'pending' && !sub.isSensitive) {
            return `<button class="btn-text btn-small" onclick="event.stopPropagation(); window.muApp.startUpload('${sub.subtaskId}')"><i data-lucide="upload"></i> 上传</button>`;
        }
        if (sub.status === 'pending' && sub.isSensitive) {
            return `<button class="btn-text btn-small" onclick="event.stopPropagation(); window.muApp.startUpload('${sub.subtaskId}')"><i data-lucide="upload"></i> 内部上传</button>`;
        }
        if (['submitted', 'reviewing'].includes(sub.status)) {
            return `<button class="btn-text btn-small" onclick="event.stopPropagation(); window.muApp.goReviewSubtask('${sub.subtaskId}')"><i data-lucide="check-square"></i> 审批</button>`;
        }
        if (sub.status === 'archived') {
            return '<span style="font-size:12px;color:var(--success-color,#00b578)">✅ 已归档</span>';
        }
        if (sub.status === 'sorting') {
            return `<button class="btn-text btn-small" onclick="event.stopPropagation(); window.muApp.startUpload('${sub.subtaskId}')"><i data-lucide="scan-search"></i> 分拣</button>`;
        }
        return `<span style="font-size:12px;color:var(--text-placeholder,#999)">${STATUS_LABEL[sub.status] || sub.status}</span>`;
    }

    function bindDetailEvents() {
        // 全选
        const checkAll = el('check-all-subtasks');
        if (checkAll) checkAll.addEventListener('change', e => {
            $$('.subtask-check').forEach(cb => {
                if (!cb.disabled) { cb.checked = e.target.checked; toggleSubtaskSelection(cb); }
            });
        });
        // 单选
        $$('.subtask-check').forEach(cb => {
            cb.addEventListener('change', () => toggleSubtaskSelection(cb));
        });
        // 生成链接按钮
        const btnLink = el('btn-gen-link');
        if (btnLink) btnLink.addEventListener('click', () => openLinkModal());
        // 自行上传按钮
        const btnSelf = el('btn-self-upload');
        if (btnSelf) btnSelf.addEventListener('click', () => batchSelfUpload());
    }

    function toggleSubtaskSelection(cb) {
        if (cb.checked) selectedSubtasks.add(cb.dataset.id);
        else selectedSubtasks.delete(cb.dataset.id);
        updateBatchBar();
    }

    function updateBatchBar() {
        const bar = el('batch-action-bar');
        const count = el('selected-count');
        if (bar) bar.style.display = selectedSubtasks.size > 0 ? '' : 'none';
        if (count) count.textContent = selectedSubtasks.size;
    }

    function startUpload(subtaskId) {
        selectedSubtasks.clear();
        selectedSubtasks.add(subtaskId);
        sortingContext = { taskId: currentTaskId, subtaskIds: [subtaskId] };
        showPage('mu-page-sorting-station', 'standard');
    }

    function batchSelfUpload() {
        if (selectedSubtasks.size === 0) { showToast('请先勾选要上传的子任务', 'info'); return; }
        sortingContext = { taskId: currentTaskId, subtaskIds: [...selectedSubtasks] };
        showPage('mu-page-sorting-station', 'standard');
    }

    function goReviewSubtask(subtaskId) {
        // 直接在详情页打开审批弹窗
        openReviewModal(subtaskId);
    }

    function copyLink(token) {
        const url = `${window.location.origin}/upload?token=${token}`;
        navigator.clipboard.writeText(url)
            .then(() => showToast('链接已复制到剪贴板', 'success'))
            .catch(() => showToast('复制失败，请手动复制', 'error'));
    }

    function renewLink(linkId) {
        const link = data.tempLinks.find(l => l.linkId === linkId);
        if (!link) return;

        el('mu-overlay').style.display = '';
        el('mu-modal').style.display = '';
        el('modal-title').textContent = '续期临时链接';

        const relSubs = data.subTasks.filter(s => link.subtaskIds.includes(s.subtaskId));
        const names = relSubs.map(s => s.materialType).join('、');
        const curExpire = new Date(link.expireAt).toLocaleDateString();

        el('modal-body').innerHTML = `
            <div style="background:#f8f9fa;border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px">
                <div><strong>关联素材：</strong>${names}</div>
                <div style="margin-top:4px;color:var(--text-secondary,#666)">当前到期：${curExpire}</div>
            </div>
            <div class="form-row"><label class="form-label">续期天数</label>
                <div class="select-wrapper" style="flex:1"><select class="form-select" id="renew-days">
                    <option value="3">3天</option><option value="7" selected>7天</option><option value="14">14天</option><option value="30">30天</option>
                </select><i data-lucide="chevron-down" class="select-icon"></i></div>
            </div>
        `;

        el('modal-footer').innerHTML = `
            <button class="btn-secondary" onclick="window.muApp.closeModal()">取消</button>
            <button class="btn-primary" id="btn-do-renew">确认续期</button>
        `;

        el('btn-do-renew').onclick = () => {
            const days = parseInt(el('renew-days')?.value || '7');
            const newExpire = new Date(link.expireAt);
            newExpire.setDate(newExpire.getDate() + days);
            link.expireAt = newExpire.toISOString();
            showToast(`已续期 ${days} 天，新到期日 ${newExpire.toLocaleDateString()}`, 'success');
            closeModal();
            renderTaskDetail();
        };
        icons();
    }

    function revokeLink(linkId) {
        const link = data.tempLinks.find(l => l.linkId === linkId);
        if (!link) return;

        const relSubs = data.subTasks.filter(s => link.subtaskIds.includes(s.subtaskId));
        const names = relSubs.map(s => s.materialType).join('、');

        el('mu-overlay').style.display = '';
        el('mu-modal').style.display = '';
        el('modal-title').textContent = '作废临时链接';

        el('modal-body').innerHTML = `
            <div style="background:#fff5f5;border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;border:1px solid #ffe0e0">
                <div style="color:#ee3f4d;font-weight:600;margin-bottom:4px">⚠️ 作废后该链接将立即失效</div>
                <div><strong>关联素材：</strong>${names}</div>
                <div style="margin-top:4px;color:var(--text-secondary,#666)">外包方将无法再通过此链接上传文件。已上传的文件不受影响。</div>
            </div>
        `;

        el('modal-footer').innerHTML = `
            <button class="btn-secondary" onclick="window.muApp.closeModal()">取消</button>
            <button class="btn-danger" id="btn-do-revoke">确认作废</button>
        `;

        el('btn-do-revoke').onclick = () => {
            link.status = 'revoked';
            // 将关联的 delegated 子任务退回 pending
            relSubs.forEach(s => {
                if (s.status === 'delegated') s.status = 'pending';
            });
            showToast('链接已作废', 'success');
            closeModal();
            renderTaskDetail();
        };
        icons();
    }

    // ===================== 创建任务 =====================
    function renderCreateForm() {
        subtaskFormCount = 0;
        const ipSel = el('ct-ip');
        if (ipSel) {
            ipSel.innerHTML = '<option value="">选择IP项目</option>';
            data.ipList.forEach(ip => ipSel.add(new Option(`《${ip.name}》`, ip.id)));
        }
        const msSel = el('ct-milestone');
        if (msSel) {
            msSel.innerHTML = '<option value="">选择排播节点</option>';
            data.milestones.forEach(m => msSel.add(new Option(m.label, m.id)));
        }
        // 清空
        ['ct-task-name', 'ct-deadline', 'ct-description'].forEach(id => {
            const e = el(id); if (e) e.value = '';
        });
        const list = el('subtask-list');
        if (list) list.innerHTML = '';
        addSubtaskItem();

        // 绑定事件
        const btnAdd = el('btn-add-subtask');
        if (btnAdd) btnAdd.onclick = addSubtaskItem;
        const btnDraft = el('btn-save-draft');
        if (btnDraft) btnDraft.onclick = () => submitTask('draft');
        const btnSubmit = el('btn-submit-task');
        if (btnSubmit) btnSubmit.onclick = () => submitTask('active');

        icons();
    }

    function addSubtaskItem() {
        const list = el('subtask-list');
        if (!list) return;
        subtaskFormCount++;
        const n = subtaskFormCount;

        // 构建素材类型选项
        const typeOpts = data.materialTypes.map(t => {
            const subs = (t.subTypes || []).map(st => `<option value="${st.id}">${t.label} - ${st.label}</option>`).join('');
            return subs || `<option value="${t.id}">${t.label}</option>`;
        }).join('');

        const div = document.createElement('div');
        div.className = 'subtask-item';
        div.id = `subtask-form-${n}`;
        div.innerHTML = `
            <span class="subtask-item__num">${n}</span>
            <button class="subtask-item__remove" onclick="window.muApp.removeSubtaskItem(${n})"><i data-lucide="x"></i></button>
            <div class="form-row">
                <label class="form-label"><span class="required">*</span>素材类型</label>
                <div class="select-wrapper" style="flex:1">
                    <select class="form-select st-type">${typeOpts}</select>
                    <i data-lucide="chevron-down" class="select-icon"></i>
                </div>
            </div>
            <div class="form-row">
                <label class="form-label"><span class="required">*</span>数量要求</label>
                <input type="text" class="form-input st-qty" placeholder="如：横版×2 + 竖版×2">
            </div>
            <div class="form-row">
                <label class="form-label"><span class="required">*</span>格式要求</label>
                <input type="text" class="form-input st-format" placeholder="如：JPG + PSD源文件">
            </div>
            <div class="form-row">
                <label class="form-label">规格要求</label>
                <input type="text" class="form-input st-spec" placeholder="如：≥3000px，300dpi，RGB">
            </div>
            <div class="form-row">
                <label class="form-label">截止日期</label>
                <input type="date" class="form-input st-deadline" style="max-width:200px">
            </div>
            <div class="form-row">
                <label class="form-label"></label>
                <label class="checkbox-label"><input type="checkbox" class="st-sensitive"> 敏感素材（仅限内部上传）</label>
            </div>
        `;
        list.appendChild(div);
        icons();
    }

    function removeSubtaskItem(n) {
        const item = el(`subtask-form-${n}`);
        if (item) item.remove();
    }

    function submitTask(status) {
        const name = el('ct-task-name')?.value?.trim();
        const ipId = el('ct-ip')?.value;
        const milestone = el('ct-milestone')?.value;

        if (!name) { showToast('请填写任务名称', 'error'); return; }
        if (!ipId) { showToast('请选择关联IP', 'error'); return; }
        if (!milestone) { showToast('请选择排播节点', 'error'); return; }

        const ip = data.ipList.find(i => i.id === ipId);
        const taskId = 'TASK-' + Date.now();
        const now = new Date().toISOString();

        data.uploadTasks.push({
            taskId, taskName: name, ipId, ipName: ip?.name || '',
            milestone, status,
            creatorId: 'U001', creatorName: '张小明',
            createdAt: now, updatedAt: now,
            deadline: el('ct-deadline')?.value || null,
            description: el('ct-description')?.value || ''
        });

        // 收集子任务
        $$('.subtask-item', el('subtask-list')).forEach((item, idx) => {
            const typeVal = item.querySelector('.st-type')?.value || '';
            data.subTasks.push({
                subtaskId: `ST-${Date.now()}-${idx + 1}`,
                taskId,
                materialType: typeVal,
                materialSubType: typeVal,
                quantity: item.querySelector('.st-qty')?.value || '',
                formatRequirement: item.querySelector('.st-format')?.value || '',
                specRequirement: item.querySelector('.st-spec')?.value || '',
                deadline: item.querySelector('.st-deadline')?.value || null,
                assigneeType: 'self',
                isSensitive: item.querySelector('.st-sensitive')?.checked || false,
                status: 'pending',
                uploadedCount: 0,
                expectedCount: 0,
                note: ''
            });
        });

        showToast(status === 'draft' ? '草稿已保存' : '任务创建成功 🎉', 'success');
        backToList();
    }

    // ===================== 智能分拣台 =====================
    function renderSortingStation() {
        sortingFiles = { high: [], medium: [], low: [] };
        // 上下文
        const ctxEl = el('sorting-context');
        if (ctxEl && sortingContext) {
            const subs = sortingContext.subtaskIds
                .map(id => data.subTasks.find(s => s.subtaskId === id))
                .filter(Boolean);
            ctxEl.innerHTML = `<strong>当前任务：</strong>${subs.map(s => `${s.materialType}（${s.quantity}）`).join(' / ')}`;
        }
        // 返回按钮
        const btnBack = el('btn-back-from-sorting');
        if (btnBack) btnBack.onclick = () => {
            if (currentTaskId) showPage('mu-page-task-detail', 'standard');
            else backToList();
        };
        // 隐藏进度和结果
        const progress = el('recognition-progress');
        const results = el('sorting-results');
        if (progress) progress.style.display = 'none';
        if (results) results.style.display = 'none';
        // 显示上传区
        const zone = el('upload-zone');
        if (zone) zone.style.display = '';

        bindSortingEvents();
        icons();
    }

    function bindSortingEvents() {
        const zone = el('upload-zone');
        const fileInput = el('file-input');
        const btnSelect = el('btn-select-files');

        if (zone) {
            zone.ondragover = e => { e.preventDefault(); zone.classList.add('dragover'); };
            zone.ondragleave = () => zone.classList.remove('dragover');
            zone.ondrop = e => { e.preventDefault(); zone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); };
        }
        if (btnSelect) btnSelect.onclick = e => { e.preventDefault(); e.stopPropagation(); fileInput?.click(); };
        if (fileInput) fileInput.onchange = e => handleFiles(e.target.files);

        // 高置信全选
        const checkHigh = el('check-all-high');
        if (checkHigh) checkHigh.onchange = e => {
            sortingFiles.high.forEach(f => f.checked = e.target.checked);
            renderSortGrid('high');
            updateSortingSummary();
        };
        // 确认高置信
        const btnConfirmHigh = el('btn-confirm-high');
        if (btnConfirmHigh) btnConfirmHigh.onclick = () => {
            sortingFiles.high.forEach(f => { if (f.checked) f.confirmed = true; });
            showToast(`已确认 ${sortingFiles.high.filter(f => f.confirmed).length} 个文件`, 'success');
            updateSortingSummary();
        };
        // 批量设置类型
        const btnBatchType = el('btn-batch-set-type');
        if (btnBatchType) btnBatchType.onclick = () => showToast('请在下方每个文件卡片中选择类型', 'info');
        // 排除全部
        const btnExclude = el('btn-exclude-all');
        if (btnExclude) btnExclude.onclick = () => {
            sortingFiles.low.forEach(f => f.excluded = true);
            renderSortGrid('low');
            updateSortingSummary();
        };
        // 重置
        const btnReset = el('btn-reset-sorting');
        if (btnReset) btnReset.onclick = () => {
            sortingFiles = { high: [], medium: [], low: [] };
            el('sorting-results').style.display = 'none';
            el('upload-zone').style.display = '';
            updateSortingSummary();
        };
        // 确认入库
        const btnArchive = el('btn-confirm-archive');
        if (btnArchive) btnArchive.onclick = archiveSortedFiles;
    }

    function handleFiles(files) {
        if (!files || files.length === 0) return;
        const progress = el('recognition-progress');
        const results = el('sorting-results');
        const zone = el('upload-zone');
        if (progress) progress.style.display = '';
        if (results) results.style.display = 'none';
        if (zone) zone.style.display = 'none';

        sortingFiles = { high: [], medium: [], low: [] };
        let processed = 0;
        const total = files.length;

        const processNext = () => {
            if (processed >= total) {
                if (progress) progress.style.display = 'none';
                if (results) results.style.display = '';
                renderAllSortGrids();
                updateSortingSummary();
                switchSortingTab('high');
                return;
            }

            const file = files[processed];
            const rec = mockRecognize(file);
            const obj = {
                id: 'sf-' + Date.now() + '-' + processed,
                name: file.name, type: file.type, size: file.size,
                recognition: rec,
                checked: rec.confidence === 'high',
                confirmed: false, excluded: false, manualType: '',
                blobUrl: file.type?.startsWith('image/') ? URL.createObjectURL(file) : null
            };

            if (rec.confidence === 'high') sortingFiles.high.push(obj);
            else if (rec.confidence === 'medium') sortingFiles.medium.push(obj);
            else sortingFiles.low.push(obj);

            processed++;
            const pct = Math.round(processed / total * 100);
            const fill = el('recognition-fill');
            const pctText = el('recognition-pct');
            if (fill) fill.style.width = pct + '%';
            if (pctText) pctText.textContent = pct + '%';

            setTimeout(processNext, 150 + Math.random() * 350);
        };

        setTimeout(processNext, 300);
    }

    function mockRecognize(file) {
        const name = file.name.toLowerCase();
        const rules = [
            { pat: /海报|poster|定档|角色|概念/, type: '海报', label: '海报', conf: 'high' },
            { pat: /预告|trailer|teaser/, type: '预告片', label: '预告片', conf: 'high' },
            { pat: /剧照|still|scene/, type: '剧照', label: '剧照', conf: 'high' },
            { pat: /花絮|bts|behind/, type: '花絮', label: '花絮', conf: 'medium' },
            { pat: /mv|特辑|special/, type: '特辑/MV', label: '特辑/MV', conf: 'medium' },
            { pat: /截图|screenshot|聊天|wechat/, type: '疑似非素材', label: '截图/聊天记录', conf: 'low' },
            { pat: /draft|草稿/, type: '疑似非素材', label: '草稿文件', conf: 'low' },
        ];
        for (const r of rules) {
            if (r.pat.test(name)) return { inferredType: r.type, confidence: r.conf, inferredLabel: r.label, basis: `文件名匹配` };
        }
        if (name.endsWith('.psd') || name.endsWith('.ai'))
            return { inferredType: '设计稿', confidence: 'medium', inferredLabel: '设计稿/源文件', basis: '文件格式' };
        if (file.type?.startsWith('video/'))
            return { inferredType: '视频素材', confidence: 'medium', inferredLabel: '视频（待确认）', basis: '视频格式' };
        if (file.type?.startsWith('image/') && file.size > 2 * 1024 * 1024)
            return { inferredType: '图片素材', confidence: 'medium', inferredLabel: '高清图片（待确认）', basis: '大尺寸图片' };
        if (file.type?.startsWith('image/') && file.size < 500 * 1024)
            return { inferredType: '疑似非素材', confidence: 'low', inferredLabel: '小尺寸图片', basis: '文件过小' };
        return { inferredType: '未知', confidence: 'medium', inferredLabel: '无法识别', basis: '无匹配规则' };
    }

    function switchSortingTab(group) {
        $$('.sorting-tab', el('sorting-results')).forEach(t => t.classList.toggle('active', t.dataset.group === group));
        ['high', 'medium', 'low'].forEach(g => {
            const grp = el('sort-group-' + g);
            if (grp) grp.style.display = g === group ? '' : 'none';
        });
    }

    function renderAllSortGrids() {
        ['high', 'medium', 'low'].forEach(renderSortGrid);
        el('sort-high-count').textContent = sortingFiles.high.length;
        el('sort-medium-count').textContent = sortingFiles.medium.length;
        el('sort-low-count').textContent = sortingFiles.low.length;
    }

    function renderSortGrid(level) {
        const grid = el('sort-grid-' + level);
        if (!grid) return;
        const files = sortingFiles[level];

        grid.innerHTML = files.map(f => {
            const thumb = f.blobUrl
                ? `<img src="${f.blobUrl}" alt="${f.name}">`
                : `<i data-lucide="${f.type?.startsWith('video') ? 'film' : 'file'}"></i>`;
            const confPct = f.recognition.confidence === 'high' ? '95%' : f.recognition.confidence === 'medium' ? '60%' : '20%';
            const selectedCls = f.checked ? ' selected' : '';
            const excludedStyle = f.excluded ? 'opacity:0.4;' : '';

            let extra = '';
            if (level === 'medium') {
                const opts = data.materialTypes.flatMap(t =>
                    (t.subTypes || []).length > 0
                        ? t.subTypes.map(st => `<option value="${st.id}" ${f.manualType === st.id ? 'selected' : ''}>${t.label}-${st.label}</option>`)
                        : [`<option value="${t.id}" ${f.manualType === t.id ? 'selected' : ''}>${t.label}</option>`]
                ).join('');
                extra = `<select class="file-card__type-select" onchange="window.muApp.setFileType('${f.id}',this.value)"><option value="">选择类型...</option>${opts}</select>`;
            }

            return `
            <div class="file-card${selectedCls}" data-file-id="${f.id}" style="${excludedStyle}" onclick="window.muApp.toggleFileCard('${level}','${f.id}')">
                <div class="file-card__checkbox"><input type="checkbox" ${f.checked ? 'checked' : ''} onclick="event.stopPropagation(); window.muApp.toggleFileCheck('${level}','${f.id}')"></div>
                <div class="file-card__thumb">${thumb}</div>
                <div class="file-card__info">
                    <div class="file-card__label">${f.recognition.inferredLabel}</div>
                    <div class="file-card__confidence">📊 ${confPct}</div>
                    <div class="file-card__name" title="${f.name}">${f.name}</div>
                    ${extra}
                </div>
            </div>`;
        }).join('');
        icons();
    }

    function toggleFileCheck(level, fileId) {
        const f = sortingFiles[level].find(x => x.id === fileId);
        if (f) f.checked = !f.checked;
        renderSortGrid(level);
        updateSortingSummary();
    }

    function toggleFileCard(level, fileId) {
        toggleFileCheck(level, fileId);
    }

    function setFileType(fileId, typeId) {
        const f = sortingFiles.medium.find(x => x.id === fileId);
        if (f) { f.manualType = typeId; f.checked = !!typeId; }
        updateSortingSummary();
    }

    function updateSortingSummary() {
        const confirmed = sortingFiles.high.filter(f => f.checked).length + sortingFiles.medium.filter(f => f.checked).length;
        const pending = sortingFiles.medium.filter(f => !f.checked).length;
        const excluded = sortingFiles.low.filter(f => f.excluded).length;
        const total = sortingFiles.low.length - excluded;

        const eCon = el('sort-confirmed');
        const ePen = el('sort-pending');
        const eExc = el('sort-excluded');
        const eArc = el('sort-archive-count');
        if (eCon) eCon.textContent = confirmed;
        if (ePen) ePen.textContent = pending + total;
        if (eExc) eExc.textContent = excluded;
        if (eArc) eArc.textContent = confirmed;
    }

    function archiveSortedFiles() {
        const confirmed = sortingFiles.high.filter(f => f.checked).length + sortingFiles.medium.filter(f => f.checked).length;
        if (confirmed === 0) { showToast('请先选择要入库的文件', 'info'); return; }
        showToast(`🎉 ${confirmed} 个文件已确认入库！`, 'success');
        // 更新子任务状态
        if (sortingContext) {
            sortingContext.subtaskIds.forEach(sid => {
                const sub = data.subTasks.find(s => s.subtaskId === sid);
                if (sub) { sub.status = 'archived'; sub.uploadedCount = sub.expectedCount; }
            });
        }
        sortingFiles = { high: [], medium: [], low: [] };
        if (currentTaskId) {
            showPage('mu-page-task-detail', 'standard');
        } else {
            backToList();
        }
    }

    // 审批功能已合并到详情页"需要你处理"分区

    function batchApprove(subtaskId) {
        const files = data.uploadFiles.filter(f => f.subtaskId === subtaskId);
        let count = 0;
        files.forEach(f => {
            if (f.complianceCheck?.formatOk && f.complianceCheck?.sizeOk && f.complianceCheck?.resolutionOk) {
                f.status = 'review_approved'; count++;
            }
        });
        // 如果全部通过，更新子任务状态
        const allApproved = files.every(f => f.status === 'review_approved');
        if (allApproved) {
            const sub = data.subTasks.find(s => s.subtaskId === subtaskId);
            if (sub) sub.status = 'approved';
        }
        showToast(`✅ ${count} 个合规文件已批量通过`, 'success');
        renderTaskDetail();
    }

    // 审批弹窗
    let reviewModalFiles = [];
    let reviewModalIndex = 0;

    function openReviewModal(subtaskId, fileId) {
        reviewModalFiles = data.uploadFiles.filter(f => f.subtaskId === subtaskId);
        reviewModalIndex = fileId ? reviewModalFiles.findIndex(f => f.fileId === fileId) : 0;
        if (reviewModalIndex < 0) reviewModalIndex = 0;
        renderReviewModal();
        el('mu-overlay').style.display = '';
        el('mu-modal').style.display = '';
    }

    function renderReviewModal() {
        if (reviewModalFiles.length === 0) return;
        const file = reviewModalFiles[reviewModalIndex];
        const cc = file.complianceCheck || {};

        el('modal-title').textContent = `审批详情 (${reviewModalIndex + 1}/${reviewModalFiles.length})`;

        el('modal-body').innerHTML = `
            <div style="display:flex;gap:20px">
                <div style="flex:1;background:#f5f5f5;border-radius:8px;min-height:200px;display:flex;align-items:center;justify-content:center">
                    <div style="text-align:center">
                        <i data-lucide="${file.fileType?.startsWith('video') ? 'film' : 'image'}" style="width:48px;height:48px;color:#ccc"></i>
                        <p style="font-size:12px;color:var(--text-secondary,#666);margin-top:8px">${file.fileName}</p>
                    </div>
                </div>
                <div style="width:240px;font-size:13px">
                    <h4 style="margin:0 0 8px">文件信息</h4>
                    <div style="margin-bottom:4px"><span style="color:var(--text-secondary,#666)">格式：</span>${file.fileExtension?.toUpperCase()}</div>
                    <div style="margin-bottom:4px"><span style="color:var(--text-secondary,#666)">大小：</span>${formatSize(file.fileSize)}</div>
                    <div style="margin-bottom:4px"><span style="color:var(--text-secondary,#666)">分辨率：</span>${file.resolution || '-'}</div>
                    ${file.duration ? `<div style="margin-bottom:4px"><span style="color:var(--text-secondary,#666)">时长：</span>${file.duration}s</div>` : ''}
                    <div style="margin-bottom:4px"><span style="color:var(--text-secondary,#666)">上传者：</span>${file.uploaderName}</div>
                    <div style="margin-bottom:4px"><span style="color:var(--text-secondary,#666)">AI识别：</span>${file.aiRecognition?.inferredLabel || '-'}</div>
                    <h4 style="margin:12px 0 8px">合规检查</h4>
                    <div style="margin-bottom:4px">${cc.formatOk ? '✅' : '❌'} 格式 ${cc.formatOk ? '合规' : '不合规'}</div>
                    <div style="margin-bottom:4px">${cc.sizeOk ? '✅' : '❌'} 文件大小 ${cc.sizeOk ? '合规' : '不合规'}</div>
                    <div style="margin-bottom:4px">${cc.resolutionOk ? '✅' : '❌'} 分辨率 ${cc.resolutionOk ? '合规' : '不合规'}</div>
                    ${(cc.issues || []).length ? `<div style="color:var(--error-color,#ee3f4d);font-size:12px;margin-top:4px">${cc.issues.join('<br>')}</div>` : ''}
                </div>
            </div>
            <div style="margin-top:16px">
                <label style="font-size:13px;color:var(--text-secondary,#666)">审批意见</label>
                <textarea class="form-textarea" id="review-comment" placeholder="填写审批意见（退回时必填）" style="margin-top:4px"></textarea>
            </div>
        `;

        el('modal-footer').innerHTML = `
            <div style="display:flex;justify-content:space-between;width:100%">
                <div>
                    <button class="btn-secondary btn-small" onclick="window.muApp.navReview(-1)" ${reviewModalIndex <= 0 ? 'disabled' : ''}>上一个</button>
                    <button class="btn-secondary btn-small" onclick="window.muApp.navReview(1)" ${reviewModalIndex >= reviewModalFiles.length - 1 ? 'disabled' : ''}>下一个</button>
                </div>
                <div style="display:flex;gap:8px">
                    <button class="btn-danger btn-small" onclick="window.muApp.reviewAction('reject')"><i data-lucide="x"></i> 退回</button>
                    <button class="btn-primary btn-small" onclick="window.muApp.reviewAction('approve')"><i data-lucide="check"></i> 通过</button>
                </div>
            </div>
        `;
        icons();
    }

    function navReview(dir) {
        reviewModalIndex += dir;
        if (reviewModalIndex < 0) reviewModalIndex = 0;
        if (reviewModalIndex >= reviewModalFiles.length) reviewModalIndex = reviewModalFiles.length - 1;
        renderReviewModal();
    }

    function reviewAction(action) {
        const comment = el('review-comment')?.value?.trim();
        if (action === 'reject' && !comment) {
            showToast('退回时请填写审批意见', 'error');
            return;
        }
        const file = reviewModalFiles[reviewModalIndex];
        if (file) file.status = action === 'approve' ? 'review_approved' : 'review_rejected';
        showToast(action === 'approve' ? '✅ 已通过' : '❌ 已退回', action === 'approve' ? 'success' : 'error');

        if (reviewModalIndex < reviewModalFiles.length - 1) {
            navReview(1);
        } else {
            closeModal();
            renderTaskDetail();
        }
    }

    // ===================== 素材需求 =====================
    function renderDemandTable() {
        if (!data) return;
        // 填充筛选
        const ipSel = el('filter-request-ip');
        if (ipSel && ipSel.options.length <= 1) {
            data.ipList.forEach(ip => ipSel.add(new Option(`《${ip.name}》`, ip.id)));
        }

        const fStatus = el('filter-request-status')?.value || 'all';
        const fIP = el('filter-request-ip')?.value || 'all';

        let requests = data.materialRequests.filter(r => {
            if (fStatus !== 'all' && r.status !== fStatus) return false;
            if (fIP !== 'all' && r.ipId !== fIP) return false;
            return true;
        });

        const tbody = el('request-table-body');
        const emptyEl = el('demand-empty');

        if (requests.length === 0) {
            if (tbody) tbody.innerHTML = '';
            if (emptyEl) emptyEl.style.display = '';
            return;
        }
        if (emptyEl) emptyEl.style.display = 'none';

        tbody.innerHTML = requests.map(r => {
            const urgColor = r.urgency === '高' ? 'var(--error-color,#ee3f4d)' : r.urgency === '中' ? '#ff8c00' : 'var(--text-secondary,#666)';
            // 操作按钮：pending 直接回复，已回复的查看详情
            let actionBtn = '';
            if (r.status === 'pending') {
                actionBtn = `<button class="btn-primary btn-small" onclick="window.muApp.viewRequest('${r.requestId}')">处理</button>`;
            } else if (r.status === 'replied_available') {
                actionBtn = `<button class="btn-text btn-small" onclick="window.muApp.viewRequest('${r.requestId}')">查看</button>`;
            } else if (r.status === 'replied_unavailable') {
                actionBtn = `<button class="btn-text btn-small" onclick="window.muApp.viewRequest('${r.requestId}')">查看</button>`;
            } else {
                actionBtn = `<button class="btn-text btn-small" onclick="window.muApp.viewRequest('${r.requestId}')">查看</button>`;
            }
            // 进展摘要
            let progressHint = '';
            if (r.status === 'pending') progressHint = '<span class="req-progress-hint req-progress-hint--waiting">待处理</span>';
            else if (r.status === 'replied_available') {
                const taskHint = r.linkedTaskId ? ' · 已创建任务' : '';
                progressHint = `<span class="req-progress-hint req-progress-hint--ok">${r.responseNote ? r.responseNote.slice(0, 20) + (r.responseNote.length > 20 ? '…' : '') : '可提供'}${taskHint}</span>`;
            }
            else if (r.status === 'replied_unavailable') progressHint = `<span class="req-progress-hint req-progress-hint--fail">${r.responseNote ? r.responseNote.slice(0, 20) + (r.responseNote.length > 20 ? '…' : '') : '不可提供'}</span>`;
            return `<tr>
                <td>${r.requesterName}<br><span style="font-size:11px;color:var(--text-secondary,#666)">${r.requesterDept || ''}</span></td>
                <td>《${r.ipName}》</td>
                <td>${r.materialType}</td>
                <td>${r.purpose}${r.scenario ? `<br><span style="font-size:11px;color:var(--text-secondary,#666)">${r.scenario}</span>` : ''}</td>
                <td><span style="color:${urgColor};font-weight:500">${r.urgency}</span></td>
                <td>${statusTag(r.status)} ${progressHint}</td>
                <td>${actionBtn}</td>
            </tr>`;
        }).join('');

        // 新建需求按钮（header中的）
        const btnNew = el('mu-btn-new-request');
        if (btnNew) btnNew.onclick = openDemandModal;

        // 筛选事件
        el('filter-request-status')?.addEventListener('change', renderDemandTable);
        el('filter-request-ip')?.addEventListener('change', renderDemandTable);

        icons();
    }

    function viewRequest(requestId) {
        const r = data.materialRequests.find(x => x.requestId === requestId);
        if (!r) return;

        el('mu-overlay').style.display = '';
        el('mu-modal').style.display = '';
        el('modal-title').textContent = '素材需求详情';

        const urgColor = r.urgency === '高' ? '#ee3f4d' : r.urgency === '中' ? '#ff8c00' : '#999';
        const createdDate = new Date(r.createdAt).toLocaleString();
        const respondedDate = r.respondedAt ? new Date(r.respondedAt).toLocaleString() : null;

        // 时间线（简化：提交 → 回复结果）
        let timeline = `<div class="req-timeline">
            <div class="req-timeline__item req-timeline__item--done">
                <div class="req-timeline__dot"></div>
                <div class="req-timeline__content">
                    <div class="req-timeline__title">需求提交</div>
                    <div class="req-timeline__desc">${r.requesterName}（${r.requesterDept}）· ${createdDate}</div>
                </div>
            </div>`;

        if (r.status === 'replied_available') {
            const taskHint = r.linkedTaskId ? `<br>📋 已自动创建回收任务` : '';
            timeline += `<div class="req-timeline__item req-timeline__item--done req-timeline__item--success">
                <div class="req-timeline__dot"></div>
                <div class="req-timeline__content">
                    <div class="req-timeline__title">已回复 — 素材可提供</div>
                    <div class="req-timeline__desc">${r.assignedPmName || ''} · ${r.responseNote || ''}${respondedDate ? ' · ' + respondedDate : ''}${taskHint}</div>
                </div>
            </div>`;
        } else if (r.status === 'replied_unavailable') {
            timeline += `<div class="req-timeline__item req-timeline__item--done req-timeline__item--fail">
                <div class="req-timeline__dot"></div>
                <div class="req-timeline__content">
                    <div class="req-timeline__title">已回复 — 无法提供</div>
                    <div class="req-timeline__desc">${r.assignedPmName || ''} · ${r.responseNote || ''}${respondedDate ? ' · ' + respondedDate : ''}</div>
                </div>
            </div>`;
        } else {
            // pending：等待处理
            timeline += `<div class="req-timeline__item req-timeline__item--pending">
                <div class="req-timeline__dot"></div>
                <div class="req-timeline__content">
                    <div class="req-timeline__title">等待处理</div>
                </div>
            </div>`;
        }
        timeline += '</div>';

        el('modal-body').innerHTML = `
            <div class="req-detail-card">
                <div class="req-detail-row">
                    <span class="req-detail-label">关联IP</span>
                    <span class="req-detail-value">《${r.ipName}》</span>
                </div>
                <div class="req-detail-row">
                    <span class="req-detail-label">素材类型</span>
                    <span class="req-detail-value">${r.materialType}</span>
                </div>
                <div class="req-detail-row">
                    <span class="req-detail-label">用途</span>
                    <span class="req-detail-value">${r.purpose}</span>
                </div>
                ${r.scenario ? `<div class="req-detail-row">
                    <span class="req-detail-label">使用场景</span>
                    <span class="req-detail-value">${r.scenario}</span>
                </div>` : ''}
                <div class="req-detail-row">
                    <span class="req-detail-label">紧急程度</span>
                    <span class="req-detail-value" style="color:${urgColor};font-weight:600">${r.urgency}</span>
                </div>
            </div>
            <div style="margin-top:16px;font-size:13px;font-weight:600;color:var(--text-primary,#1a1a1a);margin-bottom:8px">处理进度</div>
            ${timeline}
        `;

        // 底部按钮：pending 直接可提供/不可提供
        let footerHtml = `<button class="btn-secondary" onclick="window.muApp.closeModal()">关闭</button>`;
        if (r.status === 'pending') {
            footerHtml += ` <button class="btn-primary" style="background:#00b578" onclick="window.muApp.replyRequest('${r.requestId}','available')"><i data-lucide="check-circle"></i> 可提供</button>`;
            footerHtml += ` <button class="btn-outline" style="border-color:#ee3f4d;color:#ee3f4d" onclick="window.muApp.replyRequest('${r.requestId}','unavailable')"><i data-lucide="x-circle"></i> 无法提供</button>`;
        }
        el('modal-footer').innerHTML = footerHtml;
        icons();
    }

    function replyRequest(requestId, type) {
        const r = data.materialRequests.find(x => x.requestId === requestId);
        if (!r) return;

        el('modal-title').textContent = type === 'available' ? '回复：素材可提供' : '回复：无法提供';

        el('modal-body').innerHTML = `
            <div style="background:${type === 'available' ? '#e8f8ef' : '#fff5f5'};border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;border:1px solid ${type === 'available' ? '#b7e4c7' : '#ffe0e0'}">
                <strong>${r.requesterName}</strong> 需要《${r.ipName}》的 <strong>${r.materialType}</strong>
                <div style="color:var(--text-secondary,#666);margin-top:4px">用途：${r.purpose}${r.scenario ? ' · 场景：' + r.scenario : ''}</div>
            </div>
            ${type === 'available' ? `
            <div style="background:#f0f4ff;border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;border:1px solid #d0dcff">
                <div style="font-weight:600;color:#3366ff;margin-bottom:4px">📋 自动创建回收任务</div>
                <div style="color:var(--text-secondary,#666)">确认后将在「标准化回收」中自动创建一个上传任务，方便你安排素材回收和跟进进度。</div>
            </div>` : ''}
            <div class="form-row"><label class="form-label"><span class="required">*</span>${type === 'available' ? '回复说明' : '无法提供原因'}</label>
                <textarea class="form-textarea" id="reply-note" placeholder="${type === 'available' ? '如：素材已安排采集，预计本周内交付' : '如：版权方暂不授权该类型素材'}" rows="3"></textarea>
            </div>
        `;

        el('modal-footer').innerHTML = `
            <button class="btn-secondary" onclick="window.muApp.viewRequest('${requestId}')">返回</button>
            <button class="btn-primary" id="btn-do-reply" style="background:${type === 'available' ? '#00b578' : '#ee3f4d'}">确认回复</button>
        `;

        el('btn-do-reply').onclick = () => {
            const note = el('reply-note')?.value?.trim();
            if (!note) { showToast('请填写回复说明', 'error'); return; }

            // 自动填充处理人（原来认领做的事）
            r.assignedPmId = 'U001';
            r.assignedPmName = '张小明';
            r.status = type === 'available' ? 'replied_available' : 'replied_unavailable';
            r.responseNote = note;
            r.respondedAt = new Date().toISOString();

            if (type === 'available') {
                // ===== 自动创建标准化回收任务 =====
                const now = new Date();
                const taskId = 'TASK-' + Date.now();
                const deadline = new Date(now.getTime() + 7 * 86400000); // 默认7天后截止

                data.uploadTasks.push({
                    taskId,
                    taskName: `【需求回收】${r.materialType}（${r.requesterDept}）`,
                    ipId: r.ipId,
                    ipName: r.ipName,
                    milestone: data.ipList.find(ip => ip.id === r.ipId)?.currentMilestone || 'airing',
                    status: 'active',
                    creatorId: 'U001',
                    creatorName: '张小明',
                    createdAt: now.toISOString(),
                    updatedAt: now.toISOString(),
                    deadline: deadline.toISOString().slice(0, 10),
                    description: `来源：素材需求 ${r.requestId}\n需求方：${r.requesterName}（${r.requesterDept}）\n用途：${r.purpose}${r.scenario ? '\n场景：' + r.scenario : ''}\n回复：${note}`
                });

                data.subTasks.push({
                    subtaskId: `ST-${Date.now()}-1`,
                    taskId,
                    materialType: r.materialType,
                    materialSubType: '',
                    quantity: '按需求方要求',
                    formatRequirement: '按素材规范',
                    specRequirement: '',
                    deadline: deadline.toISOString().slice(0, 10),
                    assigneeType: 'self',
                    isSensitive: false,
                    status: 'pending',
                    uploadedCount: 0,
                    expectedCount: 0,
                    note: `来自需求 ${r.requestId}：${r.purpose}`
                });

                r.linkedTaskId = taskId;
                showToast('已回复「可提供」，回收任务已自动创建 📋', 'success');
            } else {
                showToast('已回复：无法提供', 'success');
            }

            closeModal();
            renderDemandTable();
        };
        icons();
    }

    function openDemandModal() {
        el('mu-overlay').style.display = '';
        el('mu-modal').style.display = '';
        el('modal-title').textContent = '提交素材需求';

        // IP选项
        const ipOpts = data.ipList.map(ip => `<option value="${ip.id}">《${ip.name}》</option>`).join('');

        el('modal-body').innerHTML = `
            <div class="form-row"><label class="form-label"><span class="required">*</span>关联IP</label>
                <div class="select-wrapper" style="flex:1"><select class="form-select" id="demand-ip"><option value="">选择IP</option>${ipOpts}</select><i data-lucide="chevron-down" class="select-icon"></i></div>
            </div>
            <div class="form-row"><label class="form-label"><span class="required">*</span>素材类型</label>
                <input type="text" class="form-input" id="demand-type" placeholder="如：角色单人照">
            </div>
            <div class="form-row"><label class="form-label"><span class="required">*</span>用途</label>
                <input type="text" class="form-input" id="demand-purpose" placeholder="如：会员卡面设计">
            </div>
            <div class="form-row"><label class="form-label">使用场景</label>
                <input type="text" class="form-input" id="demand-scenario" placeholder="如：会员中心专属卡面">
            </div>
            <div class="form-row"><label class="form-label">紧急程度</label>
                <div class="select-wrapper" style="flex:1"><select class="form-select" id="demand-urgency">
                    <option value="低">低</option><option value="中">中</option><option value="高">高</option>
                </select><i data-lucide="chevron-down" class="select-icon"></i></div>
            </div>
        `;

        el('modal-footer').innerHTML = `
            <button class="btn-secondary" onclick="window.muApp.closeModal()">取消</button>
            <button class="btn-primary" onclick="window.muApp.submitDemand()">提交需求</button>
        `;
        icons();
    }

    function submitDemand() {
        const ipId = el('demand-ip')?.value;
        const type = el('demand-type')?.value?.trim();
        const purpose = el('demand-purpose')?.value?.trim();
        if (!ipId || !type || !purpose) { showToast('请填写必填项', 'error'); return; }

        const ip = data.ipList.find(i => i.id === ipId);
        data.materialRequests.push({
            requestId: 'REQ-' + Date.now(),
            requesterId: 'U001', requesterName: '张小明', requesterDept: 'IP运营一组',
            ipId, ipName: ip?.name || '', materialType: type, purpose,
            scenario: el('demand-scenario')?.value || '',
            urgency: el('demand-urgency')?.value || '低',
            status: 'pending', assignedPmId: null, assignedPmName: null,
            responseNote: null,
            createdAt: new Date().toISOString(), respondedAt: null
        });

        closeModal();
        showToast('需求提交成功 🎉', 'success');
        renderDemandTable();
    }

    // ===================== 临时链接弹窗 =====================
    function openLinkModal() {
        if (selectedSubtasks.size === 0) { showToast('请先勾选要委派的子任务', 'info'); return; }

        const subs = [...selectedSubtasks].map(id => data.subTasks.find(s => s.subtaskId === id)).filter(Boolean);
        const hasSensitive = subs.some(s => s.isSensitive);
        if (hasSensitive) { showToast('敏感素材不可通过临时链接委派', 'error'); return; }

        el('mu-overlay').style.display = '';
        el('mu-modal').style.display = '';
        el('modal-title').textContent = '生成临时上传链接';

        el('modal-body').innerHTML = `
            <div style="background:#f8f9fa;border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px">
                <strong>已选子任务：</strong>
                <ul style="margin:8px 0 0;padding-left:20px">${subs.map(s => `<li>${s.materialType}（${s.quantity}）</li>`).join('')}</ul>
            </div>
            <div class="form-row"><label class="form-label">有效天数</label>
                <div class="select-wrapper" style="flex:1"><select class="form-select" id="link-expire-days">
                    <option value="3">3天</option><option value="7" selected>7天</option><option value="14">14天</option><option value="30">30天</option>
                </select><i data-lucide="chevron-down" class="select-icon"></i></div>
            </div>
            <div class="form-row"><label class="form-label">最大上传数</label>
                <input type="number" class="form-input" id="link-max-upload" placeholder="不限" style="max-width:120px">
            </div>
            <div class="form-row"><label class="form-label"></label>
                <label class="checkbox-label"><input type="checkbox" id="link-real-name"> 要求实名上传</label>
            </div>
            <div class="form-row"><label class="form-label">备注</label>
                <textarea class="form-textarea" id="link-note" placeholder="给外包方的说明..."></textarea>
            </div>
            <div id="link-result" style="display:none;margin-top:16px;background:#e6f9f0;border-radius:8px;padding:16px">
                <div style="font-size:13px;color:var(--success-color,#00b578);margin-bottom:8px">✅ 链接已生成！</div>
                <input type="text" class="form-input" id="link-url" readonly style="font-family:monospace;font-size:12px">
                <div style="font-size:12px;color:var(--text-secondary,#666);margin-top:4px" id="link-expire-info"></div>
            </div>
        `;

        el('modal-footer').innerHTML = `
            <button class="btn-secondary" onclick="window.muApp.closeModal()">取消</button>
            <button class="btn-primary" id="btn-do-gen-link">生成链接</button>
        `;

        el('btn-do-gen-link').onclick = doGenerateLink;
        icons();
    }

    function doGenerateLink() {
        const days = parseInt(el('link-expire-days')?.value || '7');
        const token = 'tok-' + Math.random().toString(36).substr(2, 10);
        const url = `${window.location.origin}/upload?token=${token}`;
        const expire = new Date();
        expire.setDate(expire.getDate() + days);

        data.tempLinks.push({
            linkId: 'LINK-' + Date.now(), taskId: currentTaskId, token,
            subtaskIds: [...selectedSubtasks],
            expireAt: expire.toISOString(), expireDays: days,
            maxUploadCount: parseInt(el('link-max-upload')?.value) || null,
            requireRealName: el('link-real-name')?.checked || false,
            note: el('link-note')?.value || '',
            status: 'active',
            createdAt: new Date().toISOString(), createdBy: 'U001'
        });

        // 更新子任务状态
        selectedSubtasks.forEach(sid => {
            const sub = data.subTasks.find(s => s.subtaskId === sid);
            if (sub && sub.status === 'pending') sub.status = 'delegated';
        });

        el('link-url').value = url;
        el('link-expire-info').textContent = `有效期至 ${expire.toLocaleDateString()}，共 ${days} 天`;
        el('link-result').style.display = '';

        // 更改底部按钮
        el('modal-footer').innerHTML = `
            <button class="btn-outline" onclick="navigator.clipboard.writeText('${url}').then(()=>window.muApp.showToast('已复制','success'))">📋 复制链接</button>
            <button class="btn-primary" onclick="window.muApp.closeModal(); window.muApp.showPage('mu-page-task-detail','standard')">完成</button>
        `;
    }

    // ===================== 弹窗 & Toast =====================
    function closeModal() {
        const overlay = el('mu-overlay');
        const modal = el('mu-modal');
        if (overlay) overlay.style.display = 'none';
        if (modal) modal.style.display = 'none';
    }

    function showToast(text, type) {
        type = type || 'info';
        const container = el('mu-toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `mu-toast mu-toast--${type}`;
        toast.textContent = text;
        container.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
    }

    // ===================== 初始化 =====================
    let initLock = false;

    async function init() {
        if (initLock) return;
        const root = $(MOD_SEL);
        if (!root) { console.warn('[素材上传] 模块容器未找到'); return; }
        initLock = true;
        console.log('[素材上传 v3] 初始化中...');

        try {
            if (!data) await loadData();
            switchTab('standard');
            bindGlobalEvents();
            bindBiEvents();
            renderBiHistory();
            console.log('[素材上传 v3] 初始化完成 ✓');
        } catch (e) {
            console.error('[素材上传 v3] 初始化失败:', e);
        } finally {
            initLock = false;
        }
    }

    function bindGlobalEvents() {
        // 筛选器 change 事件
        ['filter-task-ip', 'filter-task-status', 'filter-task-milestone'].forEach(id => {
            const e = el(id);
            if (e) e.addEventListener('change', renderDashboard);
        });
        const searchEl = el('search-task');
        if (searchEl) searchEl.addEventListener('input', debounce(renderDashboard, 300));
    }

    // ===================== 批量非标素材导入 (v2 重设计) =====================
    let biMethod = 'zip'; // zip | folder | link
    let biSelectedFiles = [];
    let biTaggingResults = { high: [], medium: [], low: [] };
    let biBatches = [
        { id: 'BI-001', name: '长风渡空镜包', time: '2026-03-20 14:30', totalFiles: 128, archivedFiles: 121, status: 'done' },
        { id: 'BI-002', name: '综艺物料移交', time: '2026-03-22 09:15', totalFiles: 56, archivedFiles: 56, status: 'done' },
    ];

    function switchBiMethod(method) {
        biMethod = method;
        biSelectedFiles = [];
        updateBiFilesPreview();
        const root = $(MOD_SEL);
        $$('.bi-method-tab', root).forEach(t => t.classList.toggle('active', t.dataset.biMethod === method));
        const uploadZone = el('bi-upload-zone');
        const linkArea = el('bi-link-input-area');
        const typeHint = el('bi-upload-type-hint');
        const formatHint = el('bi-upload-format-hint');
        const fileInput = el('bi-file-input');
        if (method === 'link') {
            if (uploadZone) uploadZone.style.display = 'none';
            if (linkArea) linkArea.style.display = '';
        } else {
            if (uploadZone) uploadZone.style.display = '';
            if (linkArea) linkArea.style.display = 'none';
            if (method === 'zip') {
                if (typeHint) typeHint.textContent = '压缩包';
                if (formatHint) formatHint.textContent = '支持 .zip / .rar / .7z 格式';
                if (fileInput) fileInput.accept = '.zip,.rar,.7z';
            } else {
                if (typeHint) typeHint.textContent = '文件或文件夹';
                if (formatHint) formatHint.textContent = '支持图片、视频、PSD 等素材文件';
                if (fileInput) fileInput.accept = 'image/*,video/*,.psd,.tiff,.tif,.raw';
            }
        }
        updateBiStartBtn();
        icons();
    }

    function handleBiFiles(fileList) {
        biSelectedFiles = Array.from(fileList);
        updateBiFilesPreview();
        updateBiStartBtn();
    }

    function updateBiFilesPreview() {
        const preview = el('bi-files-preview');
        const countEl = el('bi-file-count');
        const listEl = el('bi-files-list');
        if (!preview) return;
        if (biSelectedFiles.length === 0) { preview.style.display = 'none'; return; }
        preview.style.display = '';
        if (countEl) countEl.textContent = biSelectedFiles.length;
        if (listEl) {
            listEl.innerHTML = biSelectedFiles.slice(0, 20).map(f =>
                `<span class="bi-file-chip"><i data-lucide="file"></i> ${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)</span>`
            ).join('') + (biSelectedFiles.length > 20 ? `<span class="bi-file-chip">+${biSelectedFiles.length - 20} 更多...</span>` : '');
        }
        icons();
    }

    function updateBiStartBtn() {
        const btn = el('bi-btn-start-import');
        if (!btn) return;
        if (biMethod === 'link') {
            btn.disabled = !(el('bi-link-url')?.value.trim());
        } else {
            btn.disabled = biSelectedFiles.length === 0;
        }
    }

    function startBatchImport() {
        const totalFiles = biMethod === 'link' ? Math.floor(Math.random() * 30) + 20 : 
            biSelectedFiles.length > 0 ? (biSelectedFiles[0].name.match(/\.zip|\.rar|\.7z/i) ? Math.floor(Math.random() * 40) + 30 : biSelectedFiles.length) : 20;
        showToast('开始导入 ' + totalFiles + ' 个文件...', 'info');
        const progressArea = el('bi-progress-area');
        const resultsArea = el('bi-results-area');
        if (progressArea) progressArea.style.display = '';
        if (resultsArea) resultsArea.style.display = 'none';

        // 流水线模拟
        const steps = [
            { id: 'dedup', delay: 1200, result: () => `移除 ${Math.floor(Math.random() * 5) + 1} 个重复文件` },
            { id: 'quality', delay: 1500, result: () => `过滤 ${Math.floor(Math.random() * 3) + 1} 个低质量文件（<720p）` },
            { id: 'sensitive', delay: 1000, result: () => `标记 ${Math.floor(Math.random() * 2)} 个敏感文件` },
            { id: 'tagging', delay: 2000, result: () => '全部完成' },
        ];

        let stepIdx = 0;
        let accPct = 0;
        const pctPerStep = 100 / steps.length;

        function runStep() {
            if (stepIdx >= steps.length) {
                finishBatchImport(totalFiles);
                return;
            }
            const step = steps[stepIdx];
            const stepEl = el('bi-step-' + step.id);
            if (stepEl) { stepEl.classList.add('active'); stepEl.querySelector('.bi-step-icon').textContent = '⏳'; }

            // 进度条动画
            const startPct = accPct;
            const endPct = accPct + pctPerStep;
            const interval = setInterval(() => {
                accPct = Math.min(accPct + 2, endPct);
                const fill = el('bi-progress-fill');
                const pctText = el('bi-progress-pct');
                const countText = el('bi-progress-count');
                if (fill) fill.style.width = Math.round(accPct) + '%';
                if (pctText) pctText.textContent = Math.round(accPct) + '%';
                const done = Math.round(totalFiles * accPct / 100);
                if (countText) countText.textContent = done + '/' + totalFiles + ' 个文件';
                if (accPct >= endPct) clearInterval(interval);
            }, step.delay / (pctPerStep / 2));

            setTimeout(() => {
                if (stepEl) {
                    stepEl.classList.remove('active');
                    stepEl.classList.add('done');
                    stepEl.querySelector('.bi-step-icon').textContent = '✅';
                    const resultEl = stepEl.querySelector('.bi-step-result');
                    if (resultEl) resultEl.textContent = step.result();
                }
                accPct = endPct;
                stepIdx++;
                runStep();
            }, step.delay);
        }

        // 重置进度 UI
        ['dedup', 'quality', 'sensitive', 'tagging'].forEach(id => {
            const s = el('bi-step-' + id);
            if (s) { s.classList.remove('done', 'active'); s.querySelector('.bi-step-icon').textContent = '⏳'; const r = s.querySelector('.bi-step-result'); if (r) r.textContent = ''; }
        });
        const fill = el('bi-progress-fill'); if (fill) fill.style.width = '0%';
        const pctText = el('bi-progress-pct'); if (pctText) pctText.textContent = '0%';
        const countText = el('bi-progress-count'); if (countText) countText.textContent = '0/' + totalFiles + ' 个文件';

        runStep();
    }

    function finishBatchImport(totalFiles) {
        showToast('智能打标完成！', 'success');
        // 生成模拟打标结果
        const types = ['剧照', '海报', '预告片', '花絮', '空镜', '特辑', '设计稿'];
        const ips = data?.ipList?.map(ip => ip.name) || ['长风渡', '与凤行', '庆余年2'];
        const mockFiles = [];
        const survived = totalFiles - Math.floor(Math.random() * 6) - 2; // 去重+质量后剩余
        for (let i = 0; i < survived; i++) {
            const conf = Math.random();
            const type = types[Math.floor(Math.random() * types.length)];
            const ip = ips[Math.floor(Math.random() * ips.length)];
            mockFiles.push({
                id: 'bf-' + i,
                name: `${ip}_${type}_${String(i).padStart(3, '0')}.jpg`,
                type, ip,
                confidence: conf > 0.6 ? 'high' : conf > 0.25 ? 'medium' : 'low',
                confidencePct: conf > 0.6 ? Math.floor(85 + Math.random() * 15) : conf > 0.25 ? Math.floor(40 + Math.random() * 35) : Math.floor(10 + Math.random() * 25),
                confirmed: false, excluded: false,
            });
        }
        biTaggingResults = {
            high: mockFiles.filter(f => f.confidence === 'high'),
            medium: mockFiles.filter(f => f.confidence === 'medium'),
            low: mockFiles.filter(f => f.confidence === 'low'),
        };
        renderBiResults();
        const resultsArea = el('bi-results-area');
        if (resultsArea) resultsArea.style.display = '';
        // 添加到历史
        const batchId = 'BI-' + String(biBatches.length + 1).padStart(3, '0');
        const batchName = biMethod === 'link' ? '网盘导入' : (biSelectedFiles[0]?.name || '手动导入');
        biBatches.unshift({ id: batchId, name: batchName, time: new Date().toLocaleString(), totalFiles, archivedFiles: 0, status: 'processing' });
        renderBiHistory();
    }

    function renderBiResults() {
        ['high', 'medium', 'low'].forEach(group => {
            const grid = el('bi-grid-' + group);
            const countEl = el('bi-' + group + '-count');
            const items = biTaggingResults[group];
            if (countEl) countEl.textContent = items.length;
            if (!grid) return;
            grid.innerHTML = items.map(f => {
                const isHigh = group === 'high';
                const isLow = group === 'low';
                return `<div class="file-card ${f.confirmed ? 'confirmed' : ''} ${f.excluded ? 'excluded' : ''}" data-bi-file="${f.id}">
                    <label class="file-card__check"><input type="checkbox" ${f.confirmed ? 'checked' : ''} onchange="window.muApp.toggleBiFile('${f.id}','${group}',this.checked)"></label>
                    <div class="file-card__thumb"><i data-lucide="image"></i></div>
                    <div class="file-card__info">
                        <span class="file-card__type">${f.type}</span>
                        <span class="file-card__ip">IP: ${f.ip}</span>
                        <span class="file-card__conf">📊 ${f.confidencePct}%</span>
                    </div>
                    ${!isHigh && !isLow ? `<div class="file-card__selectors">
                        <select class="form-select form-select--mini" onchange="window.muApp.setBiFileType('${f.id}',this.value)">
                            <option value="">类型</option>${types.map(t => `<option ${f.type === t ? 'selected' : ''}>${t}</option>`).join('')}
                        </select>
                    </div>` : ''}
                </div>`;
            }).join('');
        });
        updateBiSummary();
        icons();
    }

    const types = ['剧照', '海报', '预告片', '花絮', '空镜', '特辑', '设计稿'];

    function switchBiResultTab(group) {
        const root = $(MOD_SEL);
        $$('.bi-result-tabs .sorting-tab', root).forEach(t => t.classList.toggle('active', t.dataset.biGroup === group));
        $$('.bi-result-group', root).forEach(g => g.style.display = 'none');
        const target = el('bi-group-' + group);
        if (target) target.style.display = '';
    }

    function toggleBiFile(fileId, group, checked) {
        const f = biTaggingResults[group].find(x => x.id === fileId);
        if (f) { f.confirmed = checked; f.excluded = false; }
        updateBiSummary();
    }

    function setBiFileType(fileId, val) {
        for (const g of ['high', 'medium', 'low']) {
            const f = biTaggingResults[g].find(x => x.id === fileId);
            if (f) { f.type = val; break; }
        }
    }

    function biCheckAllHigh(checked) {
        biTaggingResults.high.forEach(f => { f.confirmed = checked; });
        renderBiResults();
    }

    function biConfirmHigh() {
        biTaggingResults.high.forEach(f => { f.confirmed = true; });
        renderBiResults();
        showToast(`已确认 ${biTaggingResults.high.length} 个高置信文件`, 'success');
    }

    function biExcludeAll() {
        biTaggingResults.low.forEach(f => { f.excluded = true; f.confirmed = false; });
        renderBiResults();
        showToast('已排除全部疑似非素材', 'info');
    }

    function biResetAll() {
        ['high', 'medium', 'low'].forEach(g => biTaggingResults[g].forEach(f => { f.confirmed = false; f.excluded = false; }));
        renderBiResults();
        showToast('已重置', 'info');
    }

    function biArchive() {
        const confirmed = [...biTaggingResults.high, ...biTaggingResults.medium].filter(f => f.confirmed);
        if (confirmed.length === 0) { showToast('请先确认要入库的文件', 'error'); return; }
        showToast(`已将 ${confirmed.length} 个文件确认入库！`, 'success');
        // 更新最新批次
        if (biBatches.length > 0 && biBatches[0].status === 'processing') {
            biBatches[0].archivedFiles = confirmed.length;
            biBatches[0].status = 'done';
        }
        // 重置
        el('bi-results-area').style.display = 'none';
        el('bi-progress-area').style.display = 'none';
        biSelectedFiles = [];
        updateBiFilesPreview();
        updateBiStartBtn();
        renderBiHistory();
    }

    function updateBiSummary() {
        const confirmed = [...biTaggingResults.high, ...biTaggingResults.medium, ...biTaggingResults.low].filter(f => f.confirmed).length;
        const excluded = [...biTaggingResults.high, ...biTaggingResults.medium, ...biTaggingResults.low].filter(f => f.excluded).length;
        const total = biTaggingResults.high.length + biTaggingResults.medium.length + biTaggingResults.low.length;
        const pending = total - confirmed - excluded;
        const cEl = el('bi-confirmed'); if (cEl) cEl.textContent = confirmed;
        const pEl = el('bi-pending-confirm'); if (pEl) pEl.textContent = pending;
        const eEl = el('bi-excluded'); if (eEl) eEl.textContent = excluded;
        const aEl = el('bi-archive-count'); if (aEl) aEl.textContent = confirmed;
    }

    function renderBiHistory() {
        const body = el('bi-history-body');
        const empty = el('bi-history-empty');
        if (!body) return;
        if (biBatches.length === 0) { body.innerHTML = ''; if (empty) empty.style.display = ''; return; }
        if (empty) empty.style.display = 'none';
        body.innerHTML = biBatches.map(b => `<tr>
            <td>${b.name}</td>
            <td>${b.time}</td>
            <td>${b.totalFiles}</td>
            <td>${b.archivedFiles}</td>
            <td><span class="bi-batch-status bi-batch-status--${b.status}">${b.status === 'done' ? '✅ 已完成' : '<span class="bi-spin"></span> 处理中'}</span></td>
            <td><button class="btn-text btn-small" onclick="window.muApp.showToast('查看批次 ${b.id} 详情','info')">查看</button></td>
        </tr>`).join('');
    }

    function bindBiEvents() {
        // 拖拽上传
        const zone = el('bi-upload-zone');
        if (zone) {
            zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
            zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
            zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragover'); handleBiFiles(e.dataTransfer.files); });
            zone.addEventListener('click', () => el('bi-file-input')?.click());
        }
        const fileInput = el('bi-file-input');
        if (fileInput) fileInput.addEventListener('change', e => handleBiFiles(e.target.files));
        const selectBtn = el('bi-btn-select-files');
        if (selectBtn) selectBtn.addEventListener('click', e => { e.stopPropagation(); el('bi-file-input')?.click(); });
        // 清空
        const clearBtn = el('bi-btn-clear');
        if (clearBtn) clearBtn.addEventListener('click', () => { biSelectedFiles = []; updateBiFilesPreview(); updateBiStartBtn(); });
        // 开始导入
        const startBtn = el('bi-btn-start-import');
        if (startBtn) startBtn.addEventListener('click', startBatchImport);
        // 网盘链接输入
        const linkInput = el('bi-link-url');
        if (linkInput) linkInput.addEventListener('input', updateBiStartBtn);
        // 打标结果操作
        const checkAllHigh = el('bi-check-all-high');
        if (checkAllHigh) checkAllHigh.addEventListener('change', e => biCheckAllHigh(e.target.checked));
        const confirmHighBtn = el('bi-btn-confirm-high');
        if (confirmHighBtn) confirmHighBtn.addEventListener('click', biConfirmHigh);
        const excludeAllBtn = el('bi-btn-exclude-all');
        if (excludeAllBtn) excludeAllBtn.addEventListener('click', biExcludeAll);
        const resetBtn = el('bi-btn-reset');
        if (resetBtn) resetBtn.addEventListener('click', biResetAll);
        const archiveBtn = el('bi-btn-archive');
        if (archiveBtn) archiveBtn.addEventListener('click', biArchive);
        // IP 下拉填充
        const ipSel = el('bi-import-ip');
        if (ipSel && data?.ipList) {
            data.ipList.forEach(ip => ipSel.add(new Option(`《${ip.name}》`, ip.id)));
        }
    }

    // ===================== 公开 API =====================
    window.muApp = {
        switchTab, showPage, goHome, backToList,
        openTaskDetail,
        startUpload, batchSelfUpload, goReviewSubtask,
        copyLink, renewLink, revokeLink, openLinkModal,
        switchSortingTab, toggleFileCheck, toggleFileCard, setFileType,
        openReviewModal, batchApprove, navReview, reviewAction,
        viewRequest, replyRequest, submitDemand,
        closeModal, showToast,
        removeSubtaskItem,
        // 批量导入 v2
        switchBiMethod, switchBiResultTab, toggleBiFile, setBiFileType,
    };

    // ===================== 入口 =====================
    // 方式1: moduleLoaded 事件
    document.addEventListener('moduleLoaded', (e) => {
        if (e.detail?.moduleId === 'module-material-upload') {
            console.log('[素材上传 v3] moduleLoaded 事件');
            init();
        }
    });

    // 方式2: DOM 已就绪时直接初始化
    if ($(MOD_SEL)) {
        console.log('[素材上传 v3] DOM 就绪，直接初始化');
        init();
    }

})();
