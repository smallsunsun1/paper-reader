import { useState, useEffect, useCallback } from 'react';
import type { ArxivPaper, SummaryResult } from './types';
import { arxivService } from './services/arxiv';
import { SummarizerService, type SummarizerConfig } from './services/summarizer';
import { PaperCard } from './components/PaperCard';
import { SummaryModal } from './components/SummaryModal';
import { SettingsModal } from './components/SettingsModal';
import { 
  Search, 
  RefreshCw, 
  BookOpen, 
  Settings, 
  AlertCircle,
  Sparkles,
  Github,
  Clock,
  WifiOff
} from 'lucide-react';

const DEFAULT_CONFIG: SummarizerConfig = {
  provider: 'local',
};

function App() {
  // State
  const [papers, setPapers] = useState<ArxivPaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [start, setStart] = useState(0);
  const [pageSize] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  
  // Summary state
  const [selectedPaper, setSelectedPaper] = useState<ArxivPaper | null>(null);
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  // Settings state
  const [config, setConfig] = useState<SummarizerConfig>(() => {
    const saved = localStorage.getItem('paper-reader-config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });
  const [showSettings, setShowSettings] = useState(false);

  // Initialize summarizer
  const summarizer = new SummarizerService(config);

  // Load papers with better error handling
  const loadPapers = useCallback(async (reset: boolean = false) => {
    setLoading(true);
    if (reset) {
      setError(null);
      setRetryCount(0);
    }
    
    try {
      const newStart = reset ? 0 : start;
      let newPapers: ArxivPaper[];
      
      if (searchQuery.trim()) {
        newPapers = await arxivService.searchCustom(searchQuery, newStart, pageSize);
      } else {
        newPapers = await arxivService.getLatestPapers(newStart, pageSize);
      }
      
      // 如果返回空数组且不是重置，说明没有更多了
      if (newPapers.length === 0 && !reset) {
        setHasMore(false);
      } else if (newPapers.length < pageSize) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      
      if (reset) {
        setPapers(newPapers);
        setStart(pageSize);
      } else {
        setPapers(prev => newStart === 0 ? newPapers : [...prev, ...newPapers]);
        setStart(newStart + pageSize);
      }
      
      // 成功加载后重置重试计数
      if (newPapers.length > 0) {
        setRetryCount(0);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '加载论文失败';
      
      // 针对 503 错误的特殊提示
      if (errorMsg.includes('503') || errorMsg.includes('timeout')) {
        setError('arXiv 服务暂时不可用 (503)，请稍后再试。建议减少搜索频率，等待几秒后重试。');
      } else {
        setError(errorMsg);
      }
      
      console.error('[App] Error loading papers:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, start, pageSize]);

  // Initial load - 只在组件挂载时执行一次
  useEffect(() => {
    loadPapers(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setStart(0);
    setHasMore(true);
    loadPapers(true);
  };

  // Handle retry with delay
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    // 添加延迟后重试
    setTimeout(() => {
      loadPapers(true);
    }, 2000);
  };

  // Handle summarize
  const handleSummarize = async (paper: ArxivPaper) => {
    setSelectedPaper(paper);
    setIsSummarizing(true);
    setShowSummary(true);
    setSummary(null);
    
    try {
      const result = await summarizer.summarize(paper.title, paper.summary);
      setSummary(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '摘要生成失败');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Save config
  const handleSaveConfig = (newConfig: SummarizerConfig) => {
    setConfig(newConfig);
    localStorage.setItem('paper-reader-config', JSON.stringify(newConfig));
  };

  // Load more
  const handleLoadMore = () => {
    loadPapers(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                PaperReader
              </h1>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索论文 (例如: transformer, GPT, LLM)..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg text-sm transition-all outline-none"
                />
              </div>
            </form>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="设置"
              >
                <Settings className="w-5 h-5" />
              </button>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="mb-8 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">LLM 论文阅读助手</h2>
              <p className="text-gray-600 mt-1">
                自动获取 arXiv 上最新的大语言模型相关论文。点击「AI 摘要」使用 AI 分析论文要点、方法和意义。
              </p>
              {config.provider === 'local' && (
                <p className="text-amber-600 text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  当前使用本地模式，如需 AI 摘要请配置 API Key。
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700">{error}</p>
                {error.includes('503') && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-red-600">
                    <Clock className="w-3.5 h-3.5" />
                    <span>arXiv API 有频率限制，建议等待几秒后重试</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleRetry}
                  disabled={loading}
                  className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
                >
                  {loading ? '重试中...' : '重试'}
                </button>
                <button 
                  onClick={() => setError(null)}
                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Papers Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {searchQuery ? `搜索结果: "${searchQuery}"` : '最新论文'}
              <span className="ml-2 text-sm font-normal text-gray-500">({papers.length} 篇)</span>
            </h3>
            <button
              onClick={() => loadPapers(true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>

          {papers.length === 0 && loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              <p className="mt-4 text-gray-500">正在从 arXiv 获取论文...</p>
              <p className="mt-2 text-xs text-gray-400">首次加载可能需要几秒，请耐心等待</p>
            </div>
          ) : papers.length === 0 && error ? (
            <div className="text-center py-16">
              <WifiOff className="w-16 h-16 text-gray-300 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">加载失败</h3>
              <p className="mt-1 text-gray-500 max-w-md mx-auto">
                无法从 arXiv 获取论文数据。这可能是由于网络问题或 arXiv 服务暂时不可用。
              </p>
              <button
                onClick={handleRetry}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                重新加载
              </button>
            </div>
          ) : papers.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">暂无论文</h3>
              <p className="mt-1 text-gray-500">尝试调整搜索条件或刷新页面</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {papers.map((paper) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  onSummarize={handleSummarize}
                  isSummarizing={isSummarizing && selectedPaper?.id === paper.id}
                />
              ))}
            </div>
          )}

          {/* Load More */}
          {papers.length > 0 && hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    加载中...
                  </>
                ) : (
                  '加载更多'
                )}
              </button>
            </div>
          )}

          {/* No More Data */}
          {papers.length > 0 && !hasMore && (
            <div className="text-center pt-4 text-sm text-gray-500">
              已加载全部论文
            </div>
          )}

          {/* Pagination Info */}
          {papers.length > 0 && (
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500 pt-2">
              <span>已显示 {papers.length} 篇论文</span>
              {retryCount > 0 && (
                <span className="text-amber-600">(已重试 {retryCount} 次)</span>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>数据来源: arXiv.org API</p>
            <p className="text-xs">
              由于 arXiv API 频率限制，请避免频繁刷新
            </p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <SummaryModal
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        summary={summary}
        paperTitle={selectedPaper?.title || ''}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveConfig}
        currentConfig={config}
      />
    </div>
  );
}

export default App;
