# 素材查询与申用 设计规范

## 色彩系统

### 主色系（腾讯蓝）
| 颜色 | 色值 | 用途 |
|------|------|------|
| 主色 | #006eff | 主要按钮、重要强调 |
| 主色浅色 | #3d8eff | 悬停状态、次要强调 |
| 主色深色 | #0050cc | 激活状态、文字链接 |
| 主色超浅 | #e6f2ff | 背景高亮、标签背景 |

### IP等级色系
| 等级 | 颜色 | CSS |
|------|------|-----|
| S+ | 金色渐变 | `linear-gradient(135deg, #ffd700 0%, #ffb700 100%)` |
| S | 紫色 | #8b5cf6 |
| A | 蓝色 | #3b82f6 |
| B | 灰蓝 | #64748b |

### 功能色
| 类型 | 颜色 | 用途 |
|------|------|------|
| 成功 | #00b578 | 成功状态 |
| 警告 | #ff8f1f | 警告提示 |
| 错误 | #ee3f4d | 错误状态 |
| 信息 | #1890ff | 信息提示 |

## 组件规范

### 按钮

#### 主要按钮
```css
.btn-primary {
    background: linear-gradient(135deg, #006eff 0%, #3d8eff 100%);
    color: white;
    padding: 10px 24px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    border: none;
    box-shadow: 0 2px 8px 0 rgba(0, 110, 255, 0.2);
}
```

#### 次要按钮
```css
.btn-secondary {
    background: white;
    color: #006eff;
    border: 1px solid #006eff;
    padding: 10px 24px;
    border-radius: 6px;
}
```

### 卡片

#### IP卡片
```css
.ip-card {
    background: white;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    transition: all 0.3s ease;
}

.ip-card:hover {
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    transform: translateY(-2px);
}
```

#### 素材卡片
```css
.material-card {
    background: white;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    padding: 16px;
}

.material-card.selected {
    border-color: #006eff;
    box-shadow: 0 0 0 2px rgba(0, 110, 255, 0.2);
}
```

### 海报容器（3:4比例）
```css
.poster-container {
    position: relative;
    width: 100%;
    padding-top: 133.33%; /* 3:4 = 4/3 = 133.33% */
    border-radius: 6px;
    overflow: hidden;
}

.poster-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}
```

### 筛选器
```css
.material-filters {
    background: white;
    border-radius: 12px;
    padding: 16px 20px;
    padding-right: 140px; /* 为全选按钮预留空间 */
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    position: relative;
}

.select-all-btn {
    position: absolute;
    right: 20px;
    bottom: 16px;
}
```

## 间距规范

| 变量 | 值 | 用途 |
|------|-----|------|
| spacing-xs | 4px | 超小间距 |
| spacing-sm | 8px | 小间距 |
| spacing-md | 16px | 标准间距 |
| spacing-lg | 24px | 大间距 |
| spacing-xl | 32px | 超大间距 |

## 圆角规范

| 类型 | 值 | 用途 |
|------|-----|------|
| 超小 | 4px | 标签、徽章 |
| 小 | 6px | 按钮、输入框 |
| 标准 | 8px | 卡片、面板 |
| 大 | 12px | 弹窗、大容器 |

## 阴影规范

```css
--shadow-xs: 0 1px 2px rgba(0,0,0,0.03);
--shadow-sm: 0 2px 8px rgba(0,0,0,0.04);
--shadow-md: 0 4px 16px rgba(0,0,0,0.08);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.10);
```

## 响应式断点

| 设备 | 断点 |
|------|------|
| 移动端 | max-width: 767px |
| 平板 | 768px - 1023px |
| 桌面 | 1024px - 1439px |
| 大屏 | min-width: 1440px |

## 动画规范

```css
/* 标准过渡 */
transition: all 0.3s ease;

/* 快速过渡 */
transition: all 0.2s ease;

/* 悬停效果 */
:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}
```
