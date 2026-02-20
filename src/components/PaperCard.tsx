import { useState, useEffect, useCallback } from 'react';
import type { ArxivPaper } from '../types';
import { dbService } from '../services/db';
import { 
  Calendar, 
  User, 
  FileText, 
  ExternalLink, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Tag,
  Heart
} from 'lucide-react';

interface PaperCardProps {
  paper: ArxivPaper;
  onSummarize: (paper: ArxivPaper) => void;
  isSummarizing: boolean;
  onViewPDF?: (paper: ArxivPaper) => void;
}

export function PaperCard({ paper, onSummarize, isSummarizing, onViewPDF }: PaperCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);

  // 检查是否已收藏
  useEffect(() => {
    const checkFavorite = async () => {
      try {
        const favorite = await dbService.isFavorite(paper.id);
        setIsFavorite(favorite);
      } catch (error) {
        console.error('[PaperCard] Error checking favorite:', error);
      }
    };
    checkFavorite();
  }, [paper.id]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const truncateAuthors = (authors: string[], max: number = 3) => {
    if (authors.length <= max) return authors.join(', ');
    return `${authors.slice(0, max).join(', ')} +${authors.length - max} more`;
  };

  const handleToggleFavorite = useCallback(async () => {
    if (isLoadingFavorite) return;
    
    setIsLoadingFavorite(true);
    try {
      if (isFavorite) {
        await dbService.removeFavorite(paper.id);
        setIsFavorite(false);
      } else {
        await dbService.addFavorite({
          id: paper.id,
          title: paper.title,
          authors: paper.authors,
          summary: paper.summary,
          pdfUrl: paper.pdfUrl,
          arxivUrl: paper.arxivUrl,
          primaryCategory: paper.primaryCategory,
          categories: paper.categories,
          published: paper.published,
        });
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('[PaperCard] Error toggling favorite:', error);
    } finally {
      setIsLoadingFavorite(false);
    }
  }, [isFavorite, isLoadingFavorite, paper]);

  const handleViewPDF = useCallback(async () => {
    // 添加到阅读历史
    try {
      await dbService.addToHistory({
        id: paper.id,
        title: paper.title,
        authors: paper.authors,
        pdfUrl: paper.pdfUrl,
        arxivUrl: paper.arxivUrl,
        primaryCategory: paper.primaryCategory,
      });
    } catch (error) {
      console.error('[PaperCard] Error adding to history:', error);
    }

    // 调用外部处理或默认打开
    if (onViewPDF) {
      onViewPDF(paper);
    }
  }, [paper, onViewPDF]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">
            {paper.title}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
              {paper.primaryCategory}
            </span>
            {/* 收藏按钮 */}
            <button
              onClick={handleToggleFavorite}
              disabled={isLoadingFavorite}
              className={`p-1.5 rounded-lg transition-colors ${
                isFavorite 
                  ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                  : 'text-gray-400 hover:text-red-500 hover:bg-gray-100'
              }`}
              title={isFavorite ? '取消收藏' : '收藏'}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Authors */}
        <div className="mt-2 flex items-center text-sm text-gray-600">
          <User className="w-4 h-4 mr-1.5 text-gray-400" />
          <span className="truncate">{truncateAuthors(paper.authors)}</span>
        </div>

        {/* Dates */}
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-1" />
            发布: {formatDate(paper.published)}
          </span>
        </div>

        {/* Categories */}
        <div className="mt-3 flex flex-wrap gap-1">
          {paper.categories.slice(0, 3).map((cat, idx) => (
            <span 
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
            >
              <Tag className="w-3 h-3 mr-1" />
              {cat}
            </span>
          ))}
          {paper.categories.length > 3 && (
            <span className="text-xs text-gray-400 px-1">
              +{paper.categories.length - 3}
            </span>
          )}
        </div>

        {/* Abstract */}
        <div className="mt-4">
          <p className={`text-sm text-gray-600 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
            {paper.summary}
          </p>
          {paper.summary.length > 200 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center"
            >
              {expanded ? (
                <>收起 <ChevronUp className="w-3 h-3 ml-0.5" /></>
              ) : (
                <>展开 <ChevronDown className="w-3 h-3 ml-0.5" /></>
              )}
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => onSummarize(paper)}
            disabled={isSummarizing}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSummarizing ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                AI 摘要
              </>
            )}
          </button>
          
          <a
            href={paper.arxivUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            arXiv
          </a>
          
          <a
            href={paper.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              // 先记录历史，再打开
              handleViewPDF();
            }}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </a>
        </div>
      </div>
    </div>
  );
}
