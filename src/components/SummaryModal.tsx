import type { SummaryResult } from '../types';
import { X, Lightbulb, FlaskConical, Target, TrendingUp, FileText, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: SummaryResult | null;
  paperTitle: string;
}

export function SummaryModal({ isOpen, onClose, summary, paperTitle }: SummaryModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !summary) return null;

  const handleCopy = async () => {
    const text = `# ${summary.title}\n\n## 核心要点\n${summary.keyPoints.map(p => `- ${p}`).join('\n')}\n\n## 研究方法\n${summary.methodology}\n\n## 主要发现\n${summary.findings}\n\n## 研究意义\n${summary.implications}\n\n## 总体摘要\n${summary.overallSummary}`;
    
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
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="复制摘要"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
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

          {/* Summary Title */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900">{summary.title}</h3>
          </div>

          {/* Key Points */}
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-purple-600" />
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">核心要点</h4>
            </div>
            <ul className="space-y-2">
              {summary.keyPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2 text-gray-700">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 shrink-0" />
                  <span className="text-sm leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Methodology */}
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">研究方法</h4>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed bg-blue-50 p-4 rounded-lg">
              {summary.methodology}
            </p>
          </section>

          {/* Findings */}
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">主要发现</h4>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed bg-green-50 p-4 rounded-lg">
              {summary.findings}
            </p>
          </section>

          {/* Implications */}
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-amber-600" />
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">研究意义</h4>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed bg-amber-50 p-4 rounded-lg">
              {summary.implications}
            </p>
          </section>

          {/* Overall Summary */}
          <section className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-gray-600" />
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">总体摘要</h4>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              {summary.overallSummary.split('\n\n').map((para, idx) => (
                <p key={idx} className="text-sm text-gray-700 leading-relaxed mb-3 last:mb-0">
                  {para}
                </p>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
