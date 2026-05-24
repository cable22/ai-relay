# AI Relay 首页重新设计 — PRD

> 版本: v1.0 · 作者: 饼哥(产品) + 小赫(协调) · 日期: 2026-05-24

## 1. 需求背景

AI Relay 是团队自研的轻量级 AI API 中转站（https://airelay.izmw.me），当前首页 `src/app/page.tsx` 是一个简单的深色单页，内容包括：
- 标题 + 副标题
- 快速开始代码示例（curl）
- API 端点表格
- 支持的模型列表（动态获取）
- 功能特性列表
- 底部版本信息

**问题**：当前页面过于简单，像一个技术文档页面，不像一个正式开源项目的 landing page。

## 2. 目标

1. **产品化**：从"技术文档页"升级为"开源项目官网"
2. **国际化**：支持中英文双语切换（默认中文）
3. **深色主题**：保持现有深色风格，提升视觉层次
4. **信息完整**：覆盖产品介绍、快速上手、特性展示、部署方式等核心内容

## 3. 页面信息架构（IA）

### Section 1: Hero 区域
- **Logo** + **项目名** "AI Relay"
- **副标题**：轻量级开源 AI API 中转服务 / Lightweight Open-Source AI API Relay
- **CTA 按钮**：
  - "快速开始"（锚点跳转到 Quick Start）
  - "GitHub"（外链到仓库）
- **语言切换**：右上角 🌐 中/EN 切换

### Section 2: 特性概览（Feature Cards）
- 以卡片网格布局展示核心特性，每个卡片包含图标 + 标题 + 简介
- **P0 特性**（必须展示）：
  - 🔄 多 Key 轮换 — Round-Robin + 429 自动退避
  - 🔀 多 Provider 路由 — OpenAI / Claude / DeepSeek / MiMo / 自定义
  - 🔁 多级 Fallback — Provider → Key 链式故障转移
  - 🛡️ 100% OpenAI 兼容 — 零改动接入
  - 📊 Admin 后台 — 密钥管理、用量统计、模型测试
  - ⚡ 一键部署 — 2 分钟部署到 Vercel
- **P1 特性**（第二行展示）：
  - 📡 流式响应 SSE 透传
  - 🔔 Webhook 通知（企微/飞书/钉钉/Slack）
  - 🔑 临时 API Key（HMAC 签名）
  - 🧩 虚拟模型映射
  - 🚨 错误追踪 + 熔断器

### Section 3: 快速开始（Quick Start）
- **4 步骤卡片式流程**（参考 README）：
  1. 部署（Deploy with Vercel 按钮）
  2. 验证（curl health check）
  3. 添加密钥（Admin 后台）
  4. 开始调用（curl 示例）
- 每步配一个代码块 + 简短说明
- 代码块支持一键复制

### Section 4: API 端点参考
- 精简表格，列出主要端点
- 中英文双语表头

### Section 5: 支持的模型
- 动态展示（从 `getAllProviders()` 获取）
- 按 Provider 分组，显示模型名 + 上下文窗口

### Section 6: 架构概览
- 简化的架构流程图（纯 CSS/SVG）
- Client → AI Relay → Provider → Key Pool
- 突出"透明代理"概念

### Section 7: Footer
- 版本号 + MIT License
- GitHub / 文档链接
- "Powered by Vercel Edge + KV"

## 4. 中英文双语方案

### 实现方式
- **客户端切换**：使用 React state + Context
- **默认语言**：中文（检测浏览器语言，fallback 到中文）
- **切换方式**：右上角语言切换按钮（🌐 中/EN）
- **URL 方案**：不使用 `/en` 路径前缀（单页应用，state 控制即可）

### 文案组织
```typescript
const i18n = {
  zh: {
    hero: { title: 'AI Relay', subtitle: '轻量级开源 AI API 中转服务', ... },
    features: { ... },
    quickstart: { ... },
  },
  en: {
    hero: { title: 'AI Relay', subtitle: 'Lightweight Open-Source AI API Relay', ... },
    features: { ... },
    quickstart: { ... },
  }
}
```

## 5. 功能优先级

| 优先级 | 内容 | 说明 |
|--------|------|------|
| **P0** | Hero + 特性卡片 + 快速开始 + Footer | 核心展示，必须在首版完成 |
| **P0** | 中英文双语切换 | 默认中文，支持切换 |
| **P1** | API 端点表格 + 模型列表 | 技术参考，保留但简化展示 |
| **P1** | 架构概览图 | 增加技术可信度 |
| **P2** | 代码一键复制 | 提升体验 |
| **P2** | 动画/过渡效果 | 视觉增强，不阻塞发布 |

## 6. 技术约束

- **框架**：Next.js App Router（现有）
- **样式**：CSS-in-JS（现有行内样式）或 CSS Modules
- **部署**：Vercel（现有）
- **动态数据**：模型列表仍从 `getAllProviders()` 获取
- **SEO**：单页应用，SEO 影响有限，暂不考虑 SSR/SSG 预渲染
- **文件**：主要修改 `src/app/page.tsx`，新增 i18n 配置文件

## 7. 验收标准

1. ✅ 页面包含上述所有 P0 Section
2. ✅ 中英文切换流畅，无遗漏文案
3. ✅ 深色主题视觉层次分明，不像"技术文档"
4. ✅ 模型列表动态加载正常
5. ✅ 移动端基本可用（响应式）
6. ✅ Vercel 部署无报错
7. ✅ 页面加载性能不低于当前版本

## 8. 参考项目

| 项目 | 参考点 |
|------|--------|
| [Vercel](https://vercel.com) | Hero 区域设计、深色主题 |
| [Next.js](https://nextjs.org) | 特性卡片布局、文档式结构 |
| [Supabase](https://supabase.com) | 深色 landing page、代码示例 |
| [Resend](https://resend.com) | 简洁 landing page、CTA 设计 |
| [Cal.com](https://cal.com) | 开源项目 landing page 标准 |

## 9. 后续迭代（不在本次范围）

- 用户注册/登录（多租户 API Key 管理）
- 在线 Playground（直接在页面测试 API）
- 文档站（独立 /docs 路径）
- 博客/更新日志
