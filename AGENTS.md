# PaperReader - LLM 论文阅读助手

## 项目概述

PaperReader 是一个基于 React + TypeScript 的论文阅读网站，自动获取 arXiv 上最新的大语言模型 (LLM) 相关论文，并提供 AI 智能摘要功能。

### 核心功能

- **自动获取论文**: 自动从 arXiv 获取最新的 LLM 相关论文
- **智能搜索**: 支持按关键词搜索论文
- **AI 摘要**: 使用 OpenAI、Anthropic Claude、Google Gemini 或 Kimi (月之暗面) 生成结构化论文摘要
  - 核心要点提取
  - 研究方法分析
  - 主要发现总结
  - 研究意义解读
  - 总体摘要
- **流式摘要**: 支持 OpenAI 和 Kimi 的流式输出，实时显示 AI 分析结果
- **多语言支持**: 支持中文、英文、日文界面切换 (react-i18next)
- **个人图书馆**: 
  - 收藏论文功能（使用 IndexedDB 本地存储）
  - 阅读历史记录
  - 收藏和阅读统计
- **键盘快捷键**: 支持 Vim 风格的快捷键导航
- **本地模式**: 无需 API Key 也可使用基础摘要功能
- **响应式设计**: 支持桌面和移动设备

## 技术栈

| 类别 | 技术 |
|------|------|
| **前端框架** | React 19 + TypeScript 5.9 |
| **构建工具** | Vite 7 |
| **样式方案** | Tailwind CSS 4 |
| **图标库** | Lucide React |
| **本地存储** | IndexedDB (via idb) |
| **国际化** | react-i18next + i18next-browser-languagedetector |
| **代码检查** | ESLint 9 + typescript-eslint |

## 项目结构

```
paper-reader/
├── src/
│   ├── components/               # React 组件
│   │   ├── PaperCard.tsx         # 论文卡片组件（展示单篇论文信息，支持收藏）
│   │   ├── PaperCardSkeleton.tsx # 论文卡片骨架屏（加载状态）
│   │   ├── SummaryModal.tsx      # 摘要弹窗组件（展示 AI 生成的摘要）
│   │   ├── SettingsModal.tsx     # 设置弹窗组件（配置 AI 提供商和 API Key）
│   │   └── LibraryModal.tsx      # 图书馆弹窗（收藏和历史记录管理）
│   ├── i18n/                     # 国际化配置
│   │   ├── index.ts              # i18n 初始化配置
│   │   └── locales/              # 翻译文件
│   │       ├── zh.json           # 中文翻译
│   │       ├── en.json           # 英文翻译
│   │       └── ja.json           # 日文翻译
│   ├── services/                 # 业务服务层
│   │   ├── arxiv.ts              # arXiv API 服务（获取论文数据）
│   │   ├── summarizer.ts         # AI 摘要服务（支持多提供商，非流式）
│   │   ├── streamingSummarizer.ts# 流式 AI 摘要服务（OpenAI/Kimi）
│   │   └── db.ts                 # IndexedDB 数据库服务（收藏和历史）
│   ├── hooks/                    # 自定义 React Hooks
│   │   └── useKeyboardShortcuts.ts # 键盘快捷键管理
│   ├── types.ts                  # TypeScript 类型定义
│   ├── App.tsx                   # 主应用组件
│   ├── main.tsx                  # 应用入口文件
│   ├── index.css                 # 全局样式（含 Tailwind 导入）
│   └── App.css                   # App 组件样式
├── index.html                    # HTML 入口文件
├── package.json                  # 项目依赖和脚本
├── vite.config.ts                # Vite 配置（含代理设置）
├── tsconfig.json                 # TypeScript 配置（引用配置）
├── tsconfig.app.json             # 应用 TypeScript 配置
├── tsconfig.node.json            # Node 环境 TypeScript 配置
├── eslint.config.js              # ESLint 配置
├── postcss.config.js             # PostCSS 配置（Tailwind）
└── README.md                     # 项目说明文档
```

## 开发命令

```bash
# 进入项目目录
cd paper-reader

# 安装依赖
npm install

# 启动开发服务器
npm run dev
# 服务地址: http://localhost:5173

# 构建生产版本
npm run build
# 输出目录: dist/

# 预览生产构建
npm run preview

# 代码检查
npm run lint
```

## 代码规范

### TypeScript 配置

- **Target**: ES2022
- **Module**: ESNext
- **严格模式**: 启用 (`strict: true`)
- **未使用变量检查**: 启用 (`noUnusedLocals: true`)
- **JSX**: `react-jsx`（自动导入 React）

### ESLint 规则

- 使用 `@eslint/js` 推荐规则
- 使用 `typescript-eslint` 推荐规则
- 使用 `react-hooks` 插件
- 使用 `react-refresh` 插件（Vite 集成）

### 代码风格约定

1. **组件命名**: 使用 PascalCase（如 `PaperCard.tsx`）
2. **类型定义**: 使用接口（`interface`）定义数据结构
3. **导入排序**: 先导入 React/第三方库，再导入本地模块
4. **注释语言**: 使用中文注释业务逻辑
5. **类型导出**: 使用 `type` 关键字导出类型（如 `type { ArxivPaper }`）

### 命名规范

- **组件**: PascalCase（如 `SummaryModal`）
- **类型/接口**: PascalCase（如 `ArxivPaper`, `SummarizerConfig`）
- **服务类**: PascalCase（如 `ArxivService`, `SummarizerService`）
- **实例**: camelCase（如 `arxivService`）
- **方法**: camelCase（如 `fetchWithRetry`, `localSummarize`）

## 架构设计

### 数据流

```
用户操作 → App.tsx (状态管理) → Services (API 调用) → 外部 API
                                            ↓
                              Components (UI 渲染) ← 数据返回
```

### 核心模块

#### 1. ArxivService (`src/services/arxiv.ts`)

- 封装 arXiv API 调用
- 实现请求限流（3秒间隔）
- 自动 CORS 代理切换（支持多个备选代理）
- 5分钟缓存机制
- 自动重试机制（最多3次）
- LLM 论文智能过滤

**主要方法:**
- `searchPapers()` - 搜索论文
- `getLatestPapers()` - 获取最新论文
- `searchCustom()` - 自定义关键词搜索

#### 2. SummarizerService (`src/services/summarizer.ts`)

- 支持多 AI 提供商：OpenAI、Anthropic、Google Gemini、Kimi (Moonshot)
- 本地降级模式（无需 API Key）
- 结构化 JSON 输出

**主要方法:**
- `summarize()` - 生成论文摘要
- `isConfigured()` - 检查配置状态

#### 3. StreamingSummarizerService (`src/services/streamingSummarizer.ts`)

- 流式 AI 摘要服务
- 支持 OpenAI 和 Kimi 的流式输出
- **每10个token更新一次UI**，实现真正的实时效果
- 智能JSON解析，支持流式输出的部分解析
- 自动缓存结果到 SummaryCache

**主要方法:**
- `streamSummarize()` - 流式生成摘要
- `parseStreamedResponse()` - 解析流式JSON响应
- `getCachedSummary()` - 获取缓存的摘要

**流式优化:**
- Token缓冲机制：累积10个token后统一更新UI
- 部分JSON解析：即使JSON不完整也尝试提取可用字段
- 实时预览：摘要内容逐步显示，无需等待完整响应

#### 4. SummaryCacheService (`src/services/summaryCache.ts`)

- AI摘要结果缓存服务
- **避免重复生成**，节省API token费用
- 基于 localStorage 持久化
- 智能过期策略（30天）
- LRU淘汰机制（最多50条）

**主要功能:**
- `get()` - 获取缓存的摘要
- `set()` - 保存摘要到缓存
- `has()` - 检查是否已缓存
- `clear()` - 清空缓存
- `getStats()` - 获取缓存统计

**缓存键设计:**
```
{paperId}:{provider}:{model}
```
不同provider/model的摘要是独立缓存的

#### 5. DatabaseService (`src/services/db.ts`)

- 基于 IndexedDB 的本地数据存储
- 使用 `idb` 库简化 IndexedDB 操作

**主要功能:**
- 收藏管理：`addFavorite()`, `removeFavorite()`, `isFavorite()`, `getFavorites()`
- 阅读历史：`addToHistory()`, `getHistory()`, `clearHistory()`
- 统计信息：`getStats()`

#### 6. 组件层

- **PaperCard**: 展示论文基本信息，支持展开/收起摘要、收藏功能
- **PaperCardSkeleton**: 论文列表加载骨架屏
- **SummaryModal**: 展示 AI 摘要结果，支持复制
- **SettingsModal**: 配置 AI 提供商和 API Key
- **LibraryModal**: 个人图书馆，管理收藏和阅读历史

#### 7. 国际化模块 (`src/i18n/`)

- **i18n 配置**: 使用 `react-i18next` + `i18next-browser-languagedetector`
- **语言检测**: 自动检测浏览器语言，默认回退到中文
- **语言切换**: 通过 header 中的地球图标切换（中文/英文/日文）
- **持久化**: 语言偏好存储在 localStorage

**翻译文件结构:**
```
locales/
├── zh.json    # 中文
├── en.json    # 英文
└── ja.json    # 日文
```

**使用方式:**
```typescript
import { useTranslation } from 'react-i18next';
const { t, i18n } = useTranslation();

// 翻译文本
<h1>{t('app.title')}</h1>

// 带变量的翻译
<span>{t('paper.papersCount', { count: 10 })}</span>

// 切换语言
i18n.changeLanguage('en');
```

#### 8. Keyboard Shortcuts (`src/hooks/useKeyboardShortcuts.ts`)

支持以下快捷键：

| 快捷键 | 功能 |
|--------|------|
| `/` | 聚焦搜索框 |
| `R` | 刷新论文列表 |
| `S` | 打开设置 |
| `L` | 打开图书馆 |
| `J` | 下一条论文 |
| `K` | 上一条论文 |
| `F` | 收藏当前论文 |
| `?` | 显示快捷键帮助 |
| `ESC` | 关闭弹窗 |

#### 9. 自定义 SVG 图标 (`public/`)

项目使用自定义 SVG 图标替代默认的 Vite 图标：

- **logo.svg**: 应用主图标，紫色到蓝色渐变背景，带有文档和放大镜元素
- **favicon.svg**: 浏览器标签页图标，简化版 logo
- **icon-empty.svg**: 空状态图标，用于无数据展示

**图标设计特点:**
- 统一使用渐变色主题（紫色 `#8B5CF6` → 蓝色 `#3B82F6`）
- 简洁的线性设计风格
- 支持任意尺寸缩放

### 状态管理

使用 React 原生 Hooks（`useState`, `useEffect`, `useCallback`）管理状态：

```typescript
// App.tsx 中的主要状态
const [papers, setPapers] = useState<ArxivPaper[]>([]);
const [loading, setLoading] = useState(false);
const [config, setConfig] = useState<SummarizerConfig>(...);
const [showLibrary, setShowLibrary] = useState(false);
// ...其他状态
```

配置持久化到 `localStorage`，收藏和历史记录存储在 `IndexedDB`。

## API 集成

### arXiv API

- **端点**: `https://export.arxiv.org/api/query`
- **代理**: 开发环境使用 Vite 代理（`/api/arxiv`）
- **格式**: Atom XML
- **限制**: 每分钟最多 1 个请求（内部限制 3 秒间隔）
- **分类**: 主要关注 `cs.CL`, `cs.LG`, `cs.AI`, `cs.IR`, `cs.CV`

### AI 摘要 API

支持以下提供商：

| 提供商 | 默认模型 | API 端点 | 流式支持 |
|--------|----------|----------|----------|
| OpenAI | gpt-4o-mini | `https://api.openai.com/v1/chat/completions` | ✅ |
| Anthropic | claude-3-sonnet | `https://api.anthropic.com/v1/messages` | ❌ |
| Google | gemini-pro | `https://generativelanguage.googleapis.com/v1beta/models/...` | ❌ |
| Kimi (Moonshot) | kimi-k2-turbo-preview | `https://api.moonshot.cn/v1/chat/completions` | ✅ |

## 安全配置

### API Key 处理

- API Key 仅存储在浏览器 `localStorage` 中
- 不会发送到任何第三方服务器（直接发送到对应 AI 提供商）
- 输入框支持显示/隐藏切换

### CORS 处理

- 开发环境使用 Vite 代理解决 CORS
- 生产环境自动切换到 CORS 代理服务（allorigins, corsproxy.io）

### 本地数据安全

- 收藏和阅读历史存储在浏览器 IndexedDB 中
- 数据不会同步到任何服务器
- 清除浏览器数据会导致丢失

## 部署说明

### 生产构建

```bash
npm run build
```

构建输出位于 `dist/` 目录，包含：
- 优化的静态资源
- 源代码映射（用于调试）

### 部署注意事项

1. **arXiv API 限制**: 生产环境需考虑 API 频率限制
2. **CORS 代理**: 确保 CORS 代理服务可用
3. **环境变量**: 本项目无服务器端，所有配置存储在客户端
4. **IndexedDB**: 确保目标浏览器支持 IndexedDB

## 故障排除

### 常见问题

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 503 错误 | arXiv 服务暂时不可用 | 等待几秒后重试 |
| CORS 错误 | 跨域限制 | 使用 `npm run dev` 启动开发服务器 |
| 网络错误 | 连接问题 | 检查网络连接 |
| 收藏丢失 | 浏览器数据清除 | IndexedDB 数据随浏览器清理而删除 |
| 快捷键失效 | 焦点在输入框内 | 确保不在输入框/文本域内使用快捷键 |
| 摘要生成慢 | 非流式provider | 使用 OpenAI 或 Kimi 启用流式 |
| Token消耗快 | 重复生成摘要 | 摘要会自动缓存30天，无需重复生成 |

### 调试日志

开启浏览器控制台可查看详细日志：
- `[arXiv]` - arXiv 服务相关日志
- `[DB]` - 数据库操作日志
- `[Vite Proxy]` - 代理请求日志
- `[PaperCard]` - 论文卡片交互日志
- `[SummaryCache]` - 摘要缓存命中/保存日志
- `[Streaming]` - 流式生成进度日志
- `[PaperCard]` - 论文卡片交互日志

## 扩展开发

### 添加新的 AI 提供商

1. 在 `SummarizerConfig` 接口中添加新提供商类型
2. 在 `PROVIDERS` 数组中添加配置（SettingsModal.tsx）
3. 实现对应的 `callXXX()` 方法
4. 在 `summarize()` 方法中添加路由
5. 如需流式支持，在 `StreamingSummarizerService` 中实现

### 修改搜索逻辑

编辑 `src/services/arxiv.ts` 中的：
- `TARGET_CATEGORIES` - 修改关注的论文分类
- `buildLLMQuery()` - 修改 LLM 关键词过滤
- `isLLMPaper()` - 修改论文相关性判断

### 添加新的数据库功能

编辑 `src/services/db.ts`：
1. 在 `PaperReaderDB` 接口中添加新的 object store 定义
2. 在 `upgrade` 回调中创建新的 store（注意增加 DB_VERSION）
3. 添加对应的业务方法

## 许可证

MIT
