import { useState, useEffect, useCallback } from 'react';
import { X, BookOpen, Heart, History, Trash2, ExternalLink, FileText } from 'lucide-react';
import { dbService, type FavoritePaper, type ReadingHistory } from '../services/db';

type TabType = 'favorites' | 'history';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LibraryModal({ isOpen, onClose }: LibraryModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('favorites');
  const [favorites, setFavorites] = useState<FavoritePaper[]>([]);
  const [history, setHistory] = useState<ReadingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ favorites: 0, history: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [favData, histData, statsData] = await Promise.all([
        dbService.getFavorites(),
        dbService.getHistory(),
        dbService.getStats(),
      ]);
      setFavorites(favData);
      setHistory(histData);
      setStats(statsData);
    } catch (error) {
      console.error('[LibraryModal] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const handleRemoveFavorite = async (id: string) => {
    try {
      await dbService.removeFavorite(id);
      setFavorites(prev => prev.filter(f => f.id !== id));
      setStats(prev => ({ ...prev, favorites: prev.favorites - 1 }));
    } catch (error) {
      console.error('[LibraryModal] Error removing favorite:', error);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('确定要清空所有阅读历史吗？')) return;
    
    try {
      await dbService.clearHistory();
      setHistory([]);
      setStats(prev => ({ ...prev, history: 0 }));
    } catch (error) {
      console.error('[LibraryModal] Error clearing history:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">我的图书馆</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 py-3 border-b bg-gray-50">
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'favorites'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Heart className="w-4 h-4" />
            收藏 ({stats.favorites})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <History className="w-4 h-4" />
            历史 ({stats.history})
          </button>
          
          {activeTab === 'history' && history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              清空
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : activeTab === 'favorites' ? (
            favorites.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Heart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>暂无收藏论文</p>
                <p className="text-sm mt-1">点击论文卡片上的心形图标收藏</p>
              </div>
            ) : (
              <div className="space-y-3">
                {favorites.map((paper) => (
                  <div
                    key={paper.id}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 line-clamp-1">
                        {paper.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {paper.authors.slice(0, 3).join(', ')}
                        {paper.authors.length > 3 && ' et al.'}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {paper.primaryCategory}
                        </span>
                        <span className="text-xs text-gray-400">
                          收藏于 {formatDate(paper.addedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={paper.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="PDF"
                      >
                        <FileText className="w-4 h-4" />
                      </a>
                      <a
                        href={paper.arxivUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="arXiv"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleRemoveFavorite(paper.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="取消收藏"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            history.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>暂无阅读历史</p>
                <p className="text-sm mt-1">点击 PDF 链接阅读论文</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {item.authors.slice(0, 3).join(', ')}
                        {item.authors.length > 3 && ' et al.'}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {item.primaryCategory}
                        </span>
                        <span className="text-xs text-gray-400">
                          阅读 {item.readCount} 次 · 最近 {formatDate(item.readAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={item.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="PDF"
                      >
                        <FileText className="w-4 h-4" />
                      </a>
                      <a
                        href={item.arxivUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="arXiv"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
