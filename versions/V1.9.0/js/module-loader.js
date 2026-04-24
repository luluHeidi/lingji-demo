/**
 * 灵机系统 - 模块加载器
 * 版本: v0.2.0
 * 功能: 动态加载和管理功能模块
 */

class ModuleLoader {
    constructor() {
        this.modules = new Map(); // 已加载的模块缓存
        this.currentModule = null; // 当前激活的模块
        this.registry = null; // 模块注册表
        this.contentArea = document.querySelector('#monetization-content .page-content');
    }

    /**
     * 初始化模块加载器
     */
    async init() {
        try {
            // 加载模块注册表
            const response = await fetch('modules/MODULE_REGISTRY.json');
            this.registry = await response.json();
            console.log('[ModuleLoader] 模块注册表加载成功:', this.registry);
            
            // 绑定菜单点击事件
            this.bindMenuEvents();
        } catch (error) {
            console.error('[ModuleLoader] 初始化失败:', error);
        }
    }

    /**
     * 绑定二级菜单点击事件
     */
    bindMenuEvents() {
        const level2Menus = document.querySelectorAll('.menu-item.level-2');
        
        level2Menus.forEach(menu => {
            menu.addEventListener('click', (e) => {
                // 不再调用 stopPropagation，让 framework.js 的事件也能正常处理菜单高亮
                
                const submenuId = menu.dataset.submenu;
                const moduleId = this.getModuleIdBySubmenu(submenuId);
                
                if (moduleId) {
                    this.loadModule(moduleId);
                } else {
                    console.warn('[ModuleLoader] 未找到模块ID:', submenuId);
                    this.showUnderDevelopment();
                }
            });
        });
    }

    /**
     * 根据submenu属性获取模块ID
     */
    getModuleIdBySubmenu(submenuId) {
        // submenu ID 到 module ID 的映射
        const mapping = {
            // 商业化权益库
            'rights-overview': 'module-rights-overview',
            'video-rights': 'module-rights-video',
            'derivative-rights': 'module-rights-derivative',
            
            // 商业化素材库
            'material-overview': 'module-material-overview',
            'material-query': 'module-material-query',
            'material-download': 'module-material-download',
            'material-upload': 'module-material-upload',
            'material-tools': 'module-material-tools',
            
            // 视频作品授权
            'auth-management': 'module-auth-management',
            
            // 衍生授权管理
            'derivative-project': 'module-derivative-project',
            'derivative-supervision': 'module-derivative-supervision',
            
            // 自研商品开发管理
            'product-project': 'module-product-project',
            'product-workflow': 'module-product-workflow',
            
            // 防伪互动技术
            'tech-selection': 'module-antifraud-tech',
            'material-config': 'module-antifraud-material',
            'guzi-code': 'module-antifraud-guzi',
            
            // 数据服务
            'business-data': 'module-data-business',
            'industry-data': 'module-data-industry'
        };
        
        return mapping[submenuId];
    }

    /**
     * 获取模块配置信息
     */
    getModuleInfo(moduleId) {
        if (!this.registry) return null;
        return this.registry.modules.find(m => m.id === moduleId);
    }

    /**
     * 加载模块
     */
    async loadModule(moduleId) {
        console.log('[ModuleLoader] 开始加载模块:', moduleId);
        
        const moduleInfo = this.getModuleInfo(moduleId);
        if (!moduleInfo) {
            console.error('[ModuleLoader] 模块信息不存在:', moduleId);
            this.showUnderDevelopment();
            return;
        }

        // 如果模块状态为pending，显示开发中
        if (moduleInfo.status === 'pending') {
            this.showUnderDevelopment(moduleInfo);
            return;
        }

        // 每次重新加载模块（不使用缓存，确保获取最新HTML）
        if (this.modules.has(moduleId)) {
            this.modules.delete(moduleId);
        }

        // 显示加载指示器（轻量级，无临时页面）
        this.showLoadingIndicator();

        try {
            // 动态加载模块文件
            const modulePath = moduleInfo.path;
            
            // 第一步：并行加载 HTML 和 CSS（不加载 JS）
            const [htmlContent] = await Promise.all([
                fetch(`${modulePath}/index.html?_=${Date.now()}`).then(res => res.text()),
                this.loadModuleCSS(moduleId, `${modulePath}/style.css`)
            ]);
            
            // 缓存模块
            this.modules.set(moduleId, {
                id: moduleId,
                info: moduleInfo,
                html: htmlContent
            });
            
            // 隐藏加载指示器
            this.hideLoadingIndicator();
            
            // 第二步：先渲染 HTML 到 DOM（确保 DOM 元素存在），但不触发事件
            this.renderModuleHTML(this.modules.get(moduleId));
            
            // 第三步：HTML 已在 DOM 中，再加载 JS（JS 执行时能找到 DOM 元素）
            await this.loadModuleJS(moduleId, `${modulePath}/main.js`);
            
            // 第四步：JS 加载完毕后，触发 moduleLoaded 事件（JS 中的监听器已注册）
            this.fireModuleLoaded(moduleId, moduleInfo);
            
            console.log('[ModuleLoader] 模块加载成功:', moduleId);
        } catch (error) {
            console.error('[ModuleLoader] 模块加载失败:', moduleId, error);
            this.hideLoadingIndicator();
            this.showUnderDevelopment(moduleInfo);
        }
    }

    /**
     * 加载模块CSS
     */
    loadModuleCSS(moduleId, cssPath) {
        // 检查是否已加载
        if (document.querySelector(`link[data-module="${moduleId}"]`)) {
            return Promise.resolve();
        }
        
        return new Promise((resolve) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssPath;
            link.dataset.module = moduleId;
            link.onload = resolve;
            link.onerror = resolve; // CSS加载失败不阻塞
            document.head.appendChild(link);
        });
    }

    /**
     * 加载模块JS
     */
    async loadModuleJS(moduleId, jsPath) {
        return new Promise((resolve, reject) => {
            // 检查是否已加载
            if (document.querySelector(`script[data-module="${moduleId}"]`)) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = jsPath;
            script.dataset.module = moduleId;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }

    /**
     * 渲染模块HTML到内容区（不触发事件）
     */
    renderModuleHTML(module) {
        if (!this.contentArea) return;
        
        this.currentModule = module.id;
        this.contentArea.innerHTML = module.html;
        
        // 重新初始化图标
        try { lucide.createIcons(); } catch(e) {}
    }

    /**
     * 触发模块加载完成事件
     */
    fireModuleLoaded(moduleId, moduleInfo) {
        const event = new CustomEvent('moduleLoaded', {
            detail: { moduleId, moduleInfo }
        });
        document.dispatchEvent(event);
    }

    /**
     * 渲染模块到内容区（渲染HTML + 触发事件，用于缓存加载）
     */
    renderModule(module) {
        this.renderModuleHTML(module);
        this.fireModuleLoaded(module.id, module.info);
    }

    /**
     * 显示加载指示器（轻量级）
     */
    showLoadingIndicator() {
        if (!this.contentArea) return;
        
        this.contentArea.innerHTML = `
            <div class="module-loading">
                <div class="loading-spinner"></div>
                <p>加载中...</p>
            </div>
        `;
    }

    /**
     * 隐藏加载指示器
     */
    hideLoadingIndicator() {
        // 加载完成后会被新内容覆盖，无需手动清除
    }

    /**
     * 显示开发中占位
     */
    showUnderDevelopment(moduleInfo) {
        if (!this.contentArea) return;
        
        const moduleName = moduleInfo ? moduleInfo.name : '该功能模块';
        const moduleDesc = moduleInfo ? moduleInfo.description : '';
        
        this.contentArea.innerHTML = `
            <div class="under-development">
                <i data-lucide="construction" class="dev-icon"></i>
                <h2>功能开发中</h2>
                <p class="module-name">${moduleName}</p>
                ${moduleDesc ? `<p class="module-desc">${moduleDesc}</p>` : ''}
                <div class="dev-notice">
                    <i data-lucide="info"></i>
                    <span>该模块正在开发中，敬请期待</span>
                </div>
            </div>
        `;
        
        lucide.createIcons();
    }

    /**
     * 卸载模块
     */
    unloadModule(moduleId) {
        // 移除CSS
        const cssLink = document.querySelector(`link[data-module="${moduleId}"]`);
        if (cssLink) cssLink.remove();
        
        // 移除JS
        const jsScript = document.querySelector(`script[data-module="${moduleId}"]`);
        if (jsScript) jsScript.remove();
        
        // 从缓存中移除
        this.modules.delete(moduleId);
        
        console.log('[ModuleLoader] 模块已卸载:', moduleId);
    }

    /**
     * 重新加载模块
     */
    async reloadModule(moduleId) {
        this.unloadModule(moduleId);
        await this.loadModule(moduleId);
    }

    /**
     * 获取当前激活的模块ID
     */
    getCurrentModule() {
        return this.currentModule;
    }

    /**
     * 获取所有已加载的模块
     */
    getLoadedModules() {
        return Array.from(this.modules.keys());
    }
}

// 创建全局模块加载器实例
const moduleLoader = new ModuleLoader();

// 在DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    moduleLoader.init();
});

// 暴露给全局使用
window.moduleLoader = moduleLoader;
