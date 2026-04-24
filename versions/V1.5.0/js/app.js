/**
 * 灵机系统 - 主应用逻辑 v2.0
 * 简化版应用程序
 */

// 应用初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('灵机系统已启动 - v2.0');
    
    // 初始化功能
    initApp();
});

// 初始化应用
function initApp() {
    console.log('应用初始化完成');
    console.log('项目重置成功，准备开始分步骤开发');
    
    // 显示欢迎信息
    showWelcomeMessage();
}

// 显示欢迎信息
function showWelcomeMessage() {
    setTimeout(() => {
        console.log('%c欢迎使用灵机系统！', 'color: #1e40af; font-size: 16px; font-weight: bold;');
        console.log('%c项目采用简化架构，分步骤逐个功能开发', 'color: #6b7280; font-size: 14px;');
    }, 500);
}

// 工具函数：格式化日期
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 工具函数：格式化数字
function formatNumber(num) {
    return num.toLocaleString('zh-CN');
}

// 导出到全局
window.LingjiApp = {
    formatDate,
    formatNumber
};
