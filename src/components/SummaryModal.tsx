import type { SummaryResult } from '../types';
import { X, Lightbulb, FlaskConical, Target, TrendingUp, FileText, Copy, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: SummaryResult | null;
  paperTitle: string;
  isLoading?: boolean;
}

export function SummaryModal({ isOpen, onClose, summary, paperTitle, isLoading }: SummaryModalProps) {
  const [copied, setCopied] = useState(false);

  // ESC 键关闭弹窗
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!summary) return;
    const text = `# ${summary.title}

## 核心要点
${summary.keyPoints.map(p => `- ${p}`).join('\n')}

## 研究方法
${summary.methodology}

## 主要发现
${summary.findings}

## 研究意义
${summary.implications}

## 总体摘要
${summary.overallSummary}`;
    
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-white">AI 论文摘要</h2>
            {isLoading && (
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-xs text-white">
                分析中
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {summary && (
              <button
                onClick={handleCopy}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="复制摘要"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Original Title */}
          <div className="mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">原始论文</p>
            <p className="text-sm text-gray-700 font-medium">{paperTitle}</p>
          </div>

          {/* Loading State */}
          {isLoading && !summary && (
            <div className="py-12">
              <div className="flex items-center gap-3 text-purple-600">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm font-medium">AI 正在分析论文...</span>
              </div>
              <div className="mt-6 space-y-4">
                <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
                <div className="h-20 bg-gray-100 rounded animate-pulse" />
                <div className="h-20 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          )}

          {/* Summary Content */}
          {summary && (
            <>
              {/* Summary Title */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">{summary.title || '分析中...'}</h3>
              </div>

              {/* Key Points */}
              <section className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">核心要点</h4>
                  {isLoading && summary.keyPoints.length === 0 && (
                    <span className="ml-2 text-xs text-purple-500">●</span>
                  )}
                </div>
                {summary.keyPoints.length > 0 ? (
                  <ul className="space-y-2">
                    {summary.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 shrink-0" />
                        <span className="text-sm leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                ) : isLoading ? (
                  <div className="h-16 bg-purple-50 rounded-lg animate-pulse" />
                ) : null}
              </section>

              {/* Methodology */}
              <section className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <FlaskConical className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">研究方法</h4>
                  {isLoading && !summary.methodology && (
                    <span className="ml-2 text-xs text-blue-500">●</span>
                  )}
                </div>
                {summary.methodology ? (
                  <p className="text-sm text-gray-700 leading-relaxed bg-blue-50 p-4 rounded-lg">
                    {summary.methodology}
                  </p>
                ) : isLoading ? (
                  <div className="h-20 bg-blue-50 rounded-lg animate-pulse" />
                ) : null}
              </section>

              {/* Findings */}
              <section className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">主要发现</h4>
                  {isLoading && !summary.findings && (
                    <span className="ml-2 text-xs text-green-500">●</span>
                  )}
                </div>
                {summary.findings ? (
                  <p className="text-sm text-gray-700 leading-relaxed bg-green-50 p-4 rounded-lg">
                    {summary.findings}
                  </p>
                ) : isLoading ? (
                  <div className="h-20 bg-green-50 rounded-lg animate-pulse" />
                ) : null}
              </section>

              {/* Implications */}
              <section className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">研究意义</h4>
                  {isLoading && !summary.implications && (
                    <span className="ml-2 text-xs text-amber-500">●</span>
                  )}
                </div>
                {summary.implications ? (
                  <p className="text-sm text-gray-700 leading-relaxed bg-amber-50 p-4 rounded-lg">
                    {summary.implications}
                  </p>
                ) : isLoading ? (
                  <div className="h-20 bg-amber-50 rounded-lg animate-pulse" />
                ) : null}
              </section>

              {/* Overall Summary */}
              <section className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">总体摘要</h4>
                  {isLoading && !summary.overallSummary && (
                    <span className="ml-2 text-xs text-gray-500">●</span>
                  )}
                </div>
                {summary.overallSummary ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {summary.overallSummary.split('\n\n').map((para, idx) => (
                      <p key={idx} className="text-sm text-gray-700 leading-relaxed mb-3 last:mb-0">
                        {para}
                      </p>
                    ))}
                  </div>
                ) : isLoading ? (
                  <div className="h-24 bg-gray-50 rounded-lg animate-pulse" />
                ) : null}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
