# PaperReader - LLM 论文阅读助手

一个基于 React + TypeScript 的论文阅读网站，自动获取 arXiv 上最新的大语言模型 (LLM) 相关论文，并提供 AI 智能摘要功能。

## 功能特性

- **自动获取论文**: 自动从 arXiv 获取最新的 LLM 相关论文
- **智能搜索**: 支持按关键词搜索论文
- **AI 摘要**: 使用 OpenAI、Anthropic Claude 或 Google Gemini 生成论文摘要
  - 核心要点提取
  - 研究方法分析
  - 主要发现总结
  - 研究意义解读
  - 总体摘要
- **本地模式**: 无需 API Key 也可使用基础摘要功能
- **响应式设计**: 支持桌面和移动设备

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **图标**: Lucide React

## 快速开始

### 1. 安装依赖

```bash
cd paper-reader
npm install
```

### 2. 开发模式运行

```bash
npm run dev
```

访问 http://localhost:5173

### 3. 构建生产版本

```bash
npm run build
```

## 使用指南

### 配置 AI 摘要

1. 点击右上角的 **设置** 图标
2. 选择 AI 提供商:
   - **OpenAI**: 需要 OpenAI API Key
   - **Anthropic**: 需要 Claude API Key  
   - **Google**: 需要 Gemini API Key
   - **本地模式**: 无需 API Key（基础功能）
3. 输入对应的 API Key
4. 点击保存

### 获取 API Key

- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/settings/keys
- **Google Gemini**: https://aistudio.google.com/app/apikey
- **Kimi**: https://platform.moonshot.cn/console/api-keys

> 注意：API Key 仅存储在浏览器本地，不会发送到任何第三方服务器。

### 使用搜索

- 在顶部搜索框输入关键词（如 "transformer"、"RAG"、"fine-tuning"）
- 按回车或点击搜索按钮

### 阅读论文

- 点击 **AI 摘要** 生成智能摘要
- 点击 **arXiv** 访问论文详情页
- 点击 **PDF** 直接下载 PDF 文件

## 项目结构

```
paper-reader/
├── src/
│   ├── components/
│   │   ├── PaperCard.tsx      # 论文卡片组件
│   │   ├── SummaryModal.tsx   # 摘要弹窗组件
│   │   └── SettingsModal.tsx  # 设置弹窗组件
│   ├── services/
│   │   ├── arxiv.ts           # arXiv API 服务
│   │   └── summarizer.ts      # AI 摘要服务
│   ├── types.ts               # 类型定义
│   ├── App.tsx                # 主应用组件
│   └── main.tsx               # 入口文件
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

## API 说明

### arXiv API

项目使用 arXiv 公开 API 获取论文数据:
- API 地址: `https://export.arxiv.org/api/query`
- 默认搜索 LLM 相关关键词
- 支持分页加载

### AI 摘要 API

支持多种 AI 提供商:
- OpenAI GPT-4 / GPT-3.5
- Anthropic Claude
- Google Gemini

## 注意事项

1. **arXiv API 限制**: 请遵守 arXiv API 使用条款，避免频繁请求
2. **API Key 安全**: API Key 仅存储在浏览器本地存储中
3. **CORS 问题**: 开发模式下使用 Vite 代理解决 CORS 问题

## License

MIT
