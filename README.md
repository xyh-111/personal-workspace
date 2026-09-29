# Personal Workspace

一个**纯前端、零后端**的个人工作台：知识库 + 学习计时 + 求职看板。液态玻璃 UI 风格，白底蓝调，所有数据存在浏览器 `localStorage` 里。

> 灵感来自 Linear / Vercel Dashboard 的现代极简风。

---

## ✨ Features

### 📚 知识库
- 手动新增 / 编辑 / 删除知识条目，Markdown 格式
- **AI 一键导入**：粘贴任意文本 → 配置好的 LLM 自动拆分成结构化知识
  - 支持 DeepSeek / OpenAI / 阿里百炼 / 豆包 / 智谱 / 自定义 OpenAI 兼容接口
  - **API Key 本地 AES-GCM 加密存储**（Web Crypto API，Wrapping Key + Master Key 双层）
  - 批量导入时自动识别并新增分类
- 自定义分类增删，分类取色自动哈希
- 全文搜索（标题 / 内容 / 标签）

### ⏱️ 学习时长记录
- 实时计时器：开始 / 暂停 / 继续 / 重置 / 保存
- 计时器状态**刷新不丢失**（自动持久化到 localStorage）
- 日历热力图，hover 显示当日学习时长
- 今日 / 本月统计 + 学习天数
- 历史记录按日期分组可滚动

### 💼 投递看板
- 6 列看板：已投递 / 笔试 / 技术面试 / HR面试 / Offer / 拒绝
- **自定义状态 & 自定义渠道**：随时增删
- 顶部 4 张 KPI 统计卡（总投递 / 本周新增 / 待办 / 已 Offer）
- 状态分布水平渐变进度条（可点击筛选）
- 卡片底部改状态走**二次选择弹窗**，避免误触
- 渠道支持 3 个预置（Boss直聘 / 智联 / 实习僧）+ 自定义

### 🎨 UI 系统
- **液态玻璃**：半透明白底 + `backdrop-blur` + `saturate` + 顶部高光 + 底部反光
- 浅蓝渐变全局背景 + 光斑 + 微网格纹理
- 状态色竖条 → 已移除（更干净）
- Toast 通知系统（success / error / info）
- 完整动效：fade-up / scale-in / slide-in-right / gradient-x / pulse-glow
- Tailwind v4 `@theme` token 驱动，CSS 变量一层到底

### 🔧 通用
- 路由切换自动回顶 + 顶部渐变滚动进度条
- 所有功能模块左右留白（`max-w-5xl`）

---

## 🧱 技术栈

| | |
|---|---|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 8 |
| 样式 | Tailwind CSS 4（`@theme`） + 纯 CSS 变量 |
| 路由 | React Router v7 |
| 加密 | Web Crypto API（AES-GCM 256-bit） |
| 存储 | `localStorage`（零后端） |
| 代码检查 | OxLint |

---

## 📁 目录结构

```
src/
├── components/
│   ├── ui/                    原子设计系统组件
│   │   ├── GlassCard.tsx      液态玻璃卡片（核心）
│   │   ├── GlassSurface.tsx   厚玻璃容器（模态框）
│   │   ├── StatCard.tsx       KPI 统计卡
│   │   ├── ProgressBar.tsx    水平渐变进度条
│   │   ├── Chip.tsx           筛选胶囊
│   │   ├── ActionBar.tsx      顶部操作栏
│   │   ├── SearchInput.tsx    统一搜索框
│   │   └── Modal.tsx          通用模态框
│   ├── Layout.tsx             顶部栏 + Outlet + 滚动进度条
│   ├── Toast.tsx              Toast 通知
│   └── icons.tsx              统一 SVG 图标
├── pages/
│   ├── StudyTracker/          学习记录（首页）
│   ├── Knowledge/             知识库 + AI 导入
│   └── JobBoard/              求职看板
├── utils/
│   ├── storage.ts             localStorage 封装
│   ├── crypto.ts              AES-GCM 加密（API Key）
│   └── ai.ts                  AI Provider + fetch + JSON 解析
├── types/index.ts             类型定义 + 预置常量
├── App.tsx                    路由
├── main.tsx
└── index.css                  @theme + CSS 变量 + 动效
```

---

## 🚀 快速开始

### 环境要求
- Node.js ≥ 18
- npm ≥ 9

### 三种启动方式

**方式一：双击启动脚本（Windows）**
```
start-workspace.vbs     ← 推荐，完全不依赖 cmd
```
或
```
start-workspace.bat     ← 纯 cmd，无需 PowerShell
```

**方式二：手动启动**
```bash
npm install
npm run dev
```
然后打开 <http://localhost:5173>

**方式三：构建生产版**
```bash
npm run build
npm run preview
```

---

## 🔐 AI API Key 加密说明

### 架构（两层）

```
Master Key K — 256-bit 随机生成（一次性）
     │
     │ 用 Wrapping Key S 加密
     ▼
{ wrappedMasterKey, masterNonce }  →  localStorage

用户 API Key
     │
     │ 用 Master Key K 加密
     ▼
{ encryptedApiKey, apiKeyNonce }  →  localStorage
```

- **Wrapping Key S** 来自源码硬编码 + SHA-256 派生
- 浏览器里永远不出现明文 API Key
- 想彻底保护 Key，不要把 bundle 反编译能力交给不信任的人

### 切换 Provider

知识库 → 右上角「AI 设置」：
1. 选 Provider（DeepSeek 最推荐，`deepseek-chat` / `deepseek-reasoner`）
2. 填 API Key
3. 保存（已加密）

---

## 💾 数据在哪

全部在浏览器 `localStorage`，按浏览器 + 域名隔离。换浏览器 → 数据不共享。

| Key | 内容 |
|-----|------|
| `personal_workspace_knowledge` | 知识库条目 |
| `personal_workspace_study_sessions` | 学习记录 |
| `personal_workspace_study_timer` | 当前计时器状态 |
| `personal_workspace_job_applications` | 投递信息 |
| `personal_workspace_custom_categories` | 知识库自定义分类 |
| `personal_workspace_custom_job_statuses` | 自定义投递状态 |
| `personal_workspace_custom_job_channels` | 自定义投递渠道 |
| `kw_ai_key_chain` | API Key 加密链 |
| `personal_workspace_initialized_v1` | 首次运行标记（防止全删后回灌示例数据） |

---

## 📜 License

MIT
