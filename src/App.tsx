import { useState, useEffect, useCallback, useRef } from 'react';
import type { ArxivPaper, SummaryResult } from './types';
import { arxivService } from './services/arxiv';
import { SummarizerService, type SummarizerConfig } from './services/summarizer';
import { PaperCard } from './components/PaperCard';
import { PaperListSkeleton } from './components/PaperCardSkeleton';
import { SummaryModal } from './components/SummaryModal';
import { SettingsModal } from './components/SettingsModal';
import { LibraryModal } from './components/LibraryModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { 
  Search, 
  RefreshCw, 
  BookOpen, 
  Settings, 
  AlertCircle,
  Sparkles,
  Github,
  Clock,
  WifiOff,
  Library,
  Keyboard,
  X
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
  
  // Library state
  const [showLibrary, setShowLibrary] = useState(false);
  
  // Keyboard shortcuts help
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  
  // Refs for navigation
  const searchInputRef = useRef<HTMLInputElement>(null);
  const paperRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [selectedPaperIndex, setSelectedPaperIndex] = useState(-1);

  // Initialize summarizer
  const summarizer = new SummarizerService(config);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSearch: () => searchInputRef.current?.focus(),
    onRefresh: () => loadPapers(true),
    onSettings: () => setShowSettings(true),
    onLibrary: () => setShowLibrary(true),
    onNextPaper: () => {
      setSelectedPaperIndex(prev => {
        const next = Math.min(prev + 1, papers.length - 1);
        paperRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return next;
      });
    },
    onPrevPaper: () => {
      setSelectedPaperIndex(prev => {
        const next = Math.max(prev - 1, 0);
        paperRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return next;
      });
    },
  }, !showSummary && !showSettings && !showLibrary && !showShortcutsHelp);

  // 单独的 ? 快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          setShowShortcutsHelp(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      
      // 针对各种错误的特殊提示
      if (errorMsg.includes('503')) {
        setError('arXiv 服务暂时不可用 (503)，请稍后再试。建议减少搜索频率，等待几秒后重试。');
      } else if (errorMsg.includes('CORS') || errorMsg.includes('Failed to fetch')) {
        setError('CORS 跨域错误：无法访问 arXiv API。请确保使用正确的开发服务器 (npm run dev) 或检查网络连接。');
      } else if (errorMsg.includes('NetworkError') || errorMsg.includes('network')) {
        setError('网络错误：无法连接到 arXiv。请检查网络连接。');
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
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索论文 (/ 快捷键)..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg text-sm transition-all outline-none"
                />
              </div>
            </form>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowShortcutsHelp(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="快捷键 (? )"
              >
                <Keyboard className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowLibrary(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="我的图书馆 (L)"
              >
                <Library className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="设置 (S)"
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
            <PaperListSkeleton count={5} />
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
              {papers.map((paper, index) => (
                <div
                  key={paper.id}
                  ref={el => { paperRefs.current[index] = el; }}
                  className={selectedPaperIndex === index ? 'ring-2 ring-blue-500 rounded-xl' : ''}
                >
                  <PaperCard
                    paper={paper}
                    onSummarize={handleSummarize}
                    isSummarizing={isSummarizing && selectedPaper?.id === paper.id}
                  />
                </div>
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

      <LibraryModal
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
      />

      {/* Keyboard Shortcuts Help */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowShortcutsHelp(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">键盘快捷键</h2>
              <button onClick={() => setShowShortcutsHelp(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {[
                { key: '/', desc: '聚焦搜索框' },
                { key: 'R', desc: '刷新论文列表' },
                { key: 'S', desc: '打开设置' },
                { key: 'L', desc: '打开图书馆' },
                { key: 'J / K', desc: '下一条 / 上一条论文' },
                { key: '?', desc: '显示快捷键帮助' },
              ].map(({ key, desc }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-gray-600">{desc}</span>
                  <kbd className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-mono">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
