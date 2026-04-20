/**
 * 灵机系统主框架交互逻辑
 * 负责：顶部Tab切换、侧边栏菜单交互、内容区域管理
 */

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    initTopTabs();
    initSidebarMenu();
    initUserInteraction();
    initSidebarCollapse();
});

/**
 * 顶部Tab切换功能
 */
function initTopTabs() {
    const tabs = document.querySelectorAll('.tab-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const sidebar = document.querySelector('.sidebar');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            
            // 移除所有Tab的激活状态
            tabs.forEach(t => t.classList.remove('active'));
            
            // 激活当前Tab
            this.classList.add('active');
            
            // 隐藏所有内容
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 显示对应内容
            const targetContent = document.getElementById(`${targetTab}-content`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            // 如果是变现应用Tab，显示侧边栏；否则隐藏
            if (targetTab === 'monetization') {
                sidebar.style.display = 'block';
            } else {
                sidebar.style.display = 'none';
            }
        });
    });
}

/**
 * 侧边栏菜单交互
 * 优化：打开过的一级菜单保持打开状态
 */
function initSidebarMenu() {
    const menuGroups = document.querySelectorAll('.menu-group');
    
    menuGroups.forEach(group => {
        const level1Menu = group.querySelector('.menu-item.level-1');
        const submenu = group.querySelector('.submenu');
        const expandIcon = level1Menu?.querySelector('.expand-icon');
        
        if (!level1Menu) return;
        
        // 一级菜单点击
        level1Menu.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // 切换展开/收起状态
            if (submenu) {
                const isExpanded = group.classList.contains('expanded');
                
                if (isExpanded) {
                    // 收起
                    group.classList.remove('expanded');
                    expandIcon.classList.add('collapsed');
                    expandIcon.setAttribute('data-lucide', 'chevron-right');
                } else {
                    // 展开
                    group.classList.add('expanded');
                    expandIcon.classList.remove('collapsed');
                    expandIcon.setAttribute('data-lucide', 'chevron-down');
                }
                
                // 重新渲染图标
                lucide.createIcons();
            }
            
            // 切换激活状态
            toggleMenuActive(level1Menu);
            
            // 如果没有子菜单，显示开发中提示
            if (!submenu || submenu.children.length === 0) {
                showUnderDevelopment();
            }
        });
        
        // 二级菜单点击
        const level2Menus = group.querySelectorAll('.menu-item.level-2');
        level2Menus.forEach(menu => {
            menu.addEventListener('click', function(e) {
                e.stopPropagation();
                
                // 移除所有二级菜单的激活状态
                document.querySelectorAll('.menu-item.level-2').forEach(m => m.classList.remove('active'));
                
                // 激活当前菜单
                this.classList.add('active');
                
                // 激活对应的一级菜单
                level1Menu.classList.add('active');
                
                // 显示开发中提示
                showUnderDevelopment();
            });
        });
    });
}

/**
 * 切换菜单激活状态
 */
function toggleMenuActive(menuItem) {
    const allLevel1Menus = document.querySelectorAll('.menu-item.level-1');
    
    // 如果点击的菜单已经激活，不做处理
    if (menuItem.classList.contains('active')) {
        return;
    }
    
    // 移除所有一级菜单的激活状态
    allLevel1Menus.forEach(menu => menu.classList.remove('active'));
    
    // 激活当前菜单
    menuItem.classList.add('active');
}

/**
 * 在内容区显示"开发中"提示
 */
function showUnderDevelopment() {
    const contentArea = document.querySelector('#monetization-content .page-content');
    if (contentArea) {
        contentArea.innerHTML = `
            <div class="under-development">
                <i data-lucide="construction" class="dev-icon"></i>
                <h2>页面开发中</h2>
                <p>该功能模块正在开发中，敬请期待</p>
            </div>
        `;
        lucide.createIcons();
    }
}

/**
 * 用户交互功能
 */
function initUserInteraction() {
    const userAvatar = document.querySelector('.user-avatar');
    const agentButton = document.querySelector('.agent-button');
    
    if (userAvatar) {
        userAvatar.addEventListener('click', function() {
            // 用户头像点击事件（未来可扩展为下拉菜单）
            console.log('用户菜单点击');
        });
    }
    
    if (agentButton) {
        agentButton.addEventListener('click', function() {
            // Agent按钮点击事件
            openAgentChat();
        });
    }
}

/**
 * 打开灵机一动Agent聊天窗口
 */
function openAgentChat() {
    // 创建模态窗口
    const modal = document.createElement('div');
    modal.className = 'agent-modal';
    modal.innerHTML = `
        <div class="agent-modal-content">
            <div class="agent-modal-header">
                <div class="agent-header-left">
                    <i data-lucide="sparkles" class="agent-modal-icon"></i>
                    <h3>灵机一动 AI助手</h3>
                </div>
                <button class="agent-close-btn">
                    <i data-lucide="x" class="close-icon"></i>
                </button>
            </div>
            <div class="agent-modal-body">
                <div class="agent-welcome">
                    <div class="agent-avatar">
                        <i data-lucide="bot" class="bot-icon"></i>
                    </div>
                    <h4>你好！我是灵机一动AI助手</h4>
                    <p>我可以帮助您：</p>
                    <ul class="agent-features">
                        <li><i data-lucide="search"></i> 快速查询IP权益信息</li>
                        <li><i data-lucide="file-text"></i> 解答业务流程问题</li>
                        <li><i data-lucide="chart-bar"></i> 分析数据报表</li>
                        <li><i data-lucide="lightbulb"></i> 提供商业化建议</li>
                    </ul>
                    <div class="agent-notice">
                        <i data-lucide="info"></i>
                        <span>功能开发中，敬请期待</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 初始化图标
    lucide.createIcons();
    
    // 添加动画
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // 关闭按钮
    const closeBtn = modal.querySelector('.agent-close-btn');
    closeBtn.addEventListener('click', function() {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    });
    
    // 点击背景关闭
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    });
}

/**
 * 响应式菜单切换（移动端）
 */
function toggleSidebarMobile() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('open');
}

/**
 * 侧边栏自动收起/展开功能
 */
function initSidebarCollapse() {
    const sidebar = document.querySelector('.sidebar');
    const contentArea = document.querySelector('.content-area');
    const mainContainer = document.querySelector('.main-container');
    
    if (!sidebar || !contentArea) return;
    
    let collapseTimer = null;
    
    // 鼠标移入内容区域 - 收起侧边栏
    contentArea.addEventListener('mouseenter', function() {
        // 延迟收起，避免误触
        collapseTimer = setTimeout(() => {
            sidebar.classList.add('collapsed');
        }, 100);
    });
    
    // 鼠标移入侧边栏 - 展开侧边栏
    sidebar.addEventListener('mouseenter', function() {
        // 清除收起定时器
        if (collapseTimer) {
            clearTimeout(collapseTimer);
            collapseTimer = null;
        }
        sidebar.classList.remove('collapsed');
    });
    
    // 鼠标离开侧边栏 - 检查鼠标位置决定是否收起
    sidebar.addEventListener('mouseleave', function(e) {
        // 如果鼠标移动到内容区域，收起侧边栏
        const toElement = e.relatedTarget || e.toElement;
        if (toElement && (toElement === contentArea || contentArea.contains(toElement))) {
            sidebar.classList.add('collapsed');
        }
    });
    
    // 初始状态：如果当前在变现应用Tab，默认展开
    const activeTab = document.querySelector('.tab-item.active');
    if (activeTab && activeTab.dataset.tab === 'monetization') {
        sidebar.classList.remove('collapsed');
    }
}

// 暴露给全局使用
window.toggleSidebarMobile = toggleSidebarMobile;
