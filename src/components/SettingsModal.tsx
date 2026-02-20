import { useState } from 'react';
import { X, Key, Settings2, AlertCircle, Check } from 'lucide-react';
import type { SummarizerConfig } from '../services/summarizer';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: SummarizerConfig) => void;
  currentConfig: SummarizerConfig;
}

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo'] },
  { id: 'anthropic', name: 'Anthropic', models: ['claude-3-sonnet-20240229', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'] },
  { id: 'google', name: 'Google Gemini', models: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
  { id: 'moonshot', name: 'Kimi (月之暗面)', models: ['kimi-k2-turbo-preview', 'kimi-k2-turbo', 'kimi-k2.5'] },
  { id: 'local', name: '本地模式 (无AI)', models: ['local'] },
];

export function SettingsModal({ isOpen, onClose, onSave, currentConfig }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <SettingsModalContent
      onClose={onClose}
      onSave={onSave}
      currentConfig={currentConfig}
    />
  );
}

// 内部组件 - 每次父组件重新渲染都会重新挂载，自动获取最新配置
function SettingsModalContent({
  onClose,
  onSave,
  currentConfig,
}: Omit<SettingsModalProps, 'isOpen'>) {
  // 使用传入的配置初始化状态
  const [config, setConfig] = useState<SummarizerConfig>(currentConfig);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectedProvider = PROVIDERS.find(p => p.id === config.provider);

  const handleSave = () => {
    onSave(config);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">设置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI 提供商
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setConfig({ ...config, provider: provider.id as SummarizerConfig['provider'] })}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${config.provider === provider.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {provider.name}
                </button>
              ))}
            </div>
          </div>

          {/* Model Selection */}
          {config.provider !== 'local' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                模型
              </label>
              <select
                value={config.model || ''}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              >
                {selectedProvider?.models.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
          )}

          {/* API Key */}
          {config.provider !== 'local' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={config.apiKey || ''}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder={`输入 ${selectedProvider?.name} API Key`}
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
                >
                  {showKey ? '隐藏' : '显示'}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                您的 API Key 仅存储在本地浏览器中，不会发送到我们的服务器。
              </p>
            </div>
          )}

          {/* Local Mode Info */}
          {config.provider === 'local' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-amber-800">本地模式</h4>
                  <p className="text-xs text-amber-700 mt-1">
                    本地模式仅提供基础的摘要提取功能，无法生成智能分析。如需完整 AI 摘要功能，请选择其他提供商并配置 API Key。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Provider-specific info */}
          {config.provider === 'openai' && (
            <p className="text-xs text-gray-500">
              获取 API Key: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI Platform</a>
            </p>
          )}
          {config.provider === 'anthropic' && (
            <p className="text-xs text-gray-500">
              获取 API Key: <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Anthropic Console</a>
            </p>
          )}
          {config.provider === 'google' && (
            <p className="text-xs text-gray-500">
              获取 API Key: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a>
            </p>
          )}
          {config.provider === 'moonshot' && (
            <p className="text-xs text-gray-500">
              获取 API Key: <a href="https://platform.moonshot.cn/console/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Kimi 开放平台</a>
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                已保存
              </>
            ) : (
              '保存设置'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
