# AI Relay v2.4 设计规范

> 版本：v1.0 · 设计师：像素姐 · 日期：2026-05-27
> 范围：错误体验优化 / 移动端 Admin 优化

## 1. 设计目标

v2.4 的核心是**让 AI Relay 在异常和小屏幕上也能好用**。

- 错误不再是冰冷的 HTTP 状态码，而是有温度的引导
- 移动端不再是「能看」，而是「能操作」
- 所有新组件对齐现有暗色主题，不引入新设计语言

## 2. 设计令牌

沿用 layout.tsx 中的全局样式：

```
--bg-primary:    #0a0a0f
--bg-surface:    #12121a
--bg-elevated:   #1a1a2e
--bg-hover:      #22223a
--text-primary:  #e0e0e0
--text-secondary:#8888aa
--text-muted:    #555570
--border:        #2a2a40
--accent:        #6366f1    (Indigo — 主操作)
--accent-hover:  #818cf8
--danger:        #ef4444    (错误/危险)
--danger-bg:     #1a0a0a
--success:       #22c55e
--warning:       #f59e0b
--radius-sm:     6px
--radius-md:     10px
--radius-lg:     16px
--radius-full:   9999px
--shadow-sm:     0 1px 3px rgba(0,0,0,.3)
--shadow-md:     0 4px 12px rgba(0,0,0,.4)
--shadow-lg:     0 8px 32px rgba(0,0,0,.6)
```

## 3. 错误体验系统

### 3.1 信息分层

| 层级 | 组件 | 用途 | 持续时间 |
|---|---|---|---|
| L1 | Toast | 简短友好提示 | 4秒自动消失 |
| L2 | Detail Panel | 可展开的错误详情 | 手动关闭 |
| L3 | Action Bar | 重试/切换/文档 | 随详情存在 |

### 3.2 Toast 设计

- 位置：右上角（桌面）/ 顶部居中（移动端）
- 尺寸：max-width 380px，最小高度 48px
- 入场：从右侧滑入 + fade（200ms ease-out）
- 退场：fade out + 向上滑动（150ms ease-in）
- 层级：z-index 9999

状态样式：
- Error: 左边框 3px solid var(--danger)，背景 var(--danger-bg)
- Warning: 左边框 3px solid var(--warning)，背景 #1a1500
- Success: 左边框 3px solid var(--success)，背景 #0a1a0a

### 3.3 Error Detail Panel

嵌入在页面内容流中（非浮层），支持展开/收起：

- 默认收起，只显示一行摘要
- 点击展开显示：错误码、Provider、时间戳、Trace ID
- 展开时显示操作按钮（重试 / 切换 Provider / 查看文档）
- 折叠动画：max-height transition 200ms

### 3.4 操作按钮规范

- 重试：ghost 按钮，icon + 文字
- 切换 Provider：accent 按钮
- 查看文档：文字链接样式，带外链 icon

## 4. 移动端 Admin 优化

### 4.1 断点

- mobile: < 640px
- tablet: 640px - 1024px
- desktop: > 1024px

### 4.2 Bottom Sheet

替代 Modal，用于移动端的：
- Provider 详情/编辑
- Key 管理操作
- 确认对话框

设计规范：
- 圆角：16px（仅顶部）
- 最大高度：85vh
- 拖拽手柄：顶部居中 40x4 圆角条
- 背景遮罩：rgba(0,0,0,.6) + backdrop-filter: blur(4px)
- 关闭方式：下拉手势 / 点击遮罩 / 关闭按钮

### 4.3 移动端导航

Tab 栏改为底部导航栏（< 640px）：
- 最多显示 5 个图标 + 文字
- 更多项收入「更多」抽屉
- 当前项用 accent 色高亮
- 固定底部，高度 56px + safe area

### 4.4 响应式网格

Overview 卡片网格：
- mobile: 1列
- tablet: 2列
- desktop: 3-4列

Provider 表格：
- mobile: 卡片列表（每张卡片 = 一行数据）
- desktop: 保持表格

### 4.5 移动端优化清单

- [ ] 触摸目标 >= 44px
- [ ] 输入框 >= 48px 高度
- [ ] 两列以上表格改为卡片列表
- [ ] Modal 改为 Bottom Sheet
- [ ] 添加底部导航栏
- [ ] 长按显示上下文菜单（Provider 操作）

## 5. 交付物

### 设计规范
- [x] v2.4/DESIGN-SPEC.md — 本文件

### HTML 设计稿
- [x] v2.4/error-experience.html — 错误体验组件交互设计
- [x] v2.4/mobile-admin.html — 移动端 Admin 布局设计
