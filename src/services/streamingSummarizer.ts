import type { SummaryResult } from '../types';
import type { SummarizerConfig } from './summarizer';

export interface StreamCallbacks {
  onTitle?: (title: string) => void;
  onKeyPoints?: (points: string[]) => void;
  onMethodology?: (text: string) => void;
  onFindings?: (text: string) => void;
  onImplications?: (text: string) => void;
  onOverallSummary?: (text: string) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
}

export class StreamingSummarizerService {
  private config: SummarizerConfig;

  constructor(config: SummarizerConfig) {
    this.config = {
      model: this.getDefaultModel(config.provider),
      temperature: 0.3,
      ...config
    };
  }

  private getDefaultModel(provider: string): string {
    switch (provider) {
      case 'openai': return 'gpt-4o-mini';
      case 'anthropic': return 'claude-3-sonnet-20240229';
      case 'google': return 'gemini-pro';
      case 'moonshot': return 'kimi-k2-turbo-preview';
      default: return 'gpt-4o-mini';
    }
  }

  private getSystemPrompt(): string {
    return `You are an expert research paper summarizer. Analyze the given academic paper and provide a structured summary.

Provide your summary in the following format, with each section clearly marked:

TITLE: [Brief, clear title for the summary]

KEY_POINTS:
- [Key point 1]
- [Key point 2]
- [Key point 3]

METHODOLOGY: [Description of the methods used]

FINDINGS: [Main findings and results]

IMPLICATIONS: [Implications and significance of this research]

OVERALL_SUMMARY: [A concise 2-3 paragraph summary of the entire paper]

Focus on core contributions, technical approach, key results, and practical applications. Be accurate and concise.`;
  }

  async streamSummarize(
    title: string,
    abstract: string,
    callbacks: StreamCallbacks,
    fullText?: string
  ): Promise<void> {
    if (!this.config.apiKey) {
      callbacks.onError?.('No API key configured');
      return;
    }

    const content = fullText
      ? `Title: ${title}\n\nAbstract: ${abstract}\n\nFull Text (first 8000 chars): ${fullText.slice(0, 8000)}`
      : `Title: ${title}\n\nAbstract: ${abstract}`;

    try {
      switch (this.config.provider) {
        case 'openai':
          await this.streamOpenAI(content, callbacks);
          break;
        case 'moonshot':
          await this.streamMoonshot(content, callbacks);
          break;
        case 'anthropic':
          // Anthropic 流式需要单独实现
          callbacks.onError?.('Streaming not yet supported for Anthropic');
          break;
        case 'google':
          callbacks.onError?.('Streaming not yet supported for Google');
          break;
        default:
          callbacks.onError?.('Streaming not supported for this provider');
      }
    } catch (error) {
      callbacks.onError?.(error instanceof Error ? error.message : 'Streaming error');
    }
  }

  private async streamOpenAI(content: string, callbacks: StreamCallbacks): Promise<void> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: content }
        ],
        temperature: this.config.temperature,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${await response.text()}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    let buffer = '';
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            callbacks.onComplete?.();
            return;
          }

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              this.parseStreamingContent(content, callbacks);
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }

    callbacks.onComplete?.();
  }

  private async streamMoonshot(content: string, callbacks: StreamCallbacks): Promise<void> {
    // Kimi API 兼容 OpenAI 流式格式
    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: content }
        ],
        temperature: this.config.temperature,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Kimi API error: ${await response.text()}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    let buffer = '';
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            callbacks.onComplete?.();
            return;
          }

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              this.parseStreamingContent(content, callbacks);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    callbacks.onComplete?.();
  }

  private currentSection: keyof StreamCallbacks | null = null;
  private buffer: string = '';

  private parseStreamingContent(content: string, callbacks: StreamCallbacks): void {
    this.buffer += content;

    // 检查是否是新段落开始
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('TITLE:')) {
        this.currentSection = 'onTitle';
        callbacks.onTitle?.(trimmed.replace('TITLE:', '').trim());
      } else if (trimmed.startsWith('KEY_POINTS:')) {
        this.currentSection = 'onKeyPoints';
      } else if (trimmed.startsWith('METHODOLOGY:')) {
        this.currentSection = 'onMethodology';
        callbacks.onMethodology?.(trimmed.replace('METHODOLOGY:', '').trim());
      } else if (trimmed.startsWith('FINDINGS:')) {
        this.currentSection = 'onFindings';
        callbacks.onFindings?.(trimmed.replace('FINDINGS:', '').trim());
      } else if (trimmed.startsWith('IMPLICATIONS:')) {
        this.currentSection = 'onImplications';
        callbacks.onImplications?.(trimmed.replace('IMPLICATIONS:', '').trim());
      } else if (trimmed.startsWith('OVERALL_SUMMARY:')) {
        this.currentSection = 'onOverallSummary';
        callbacks.onOverallSummary?.(trimmed.replace('OVERALL_SUMMARY:', '').trim());
      } else if (trimmed.startsWith('- ') && this.currentSection === 'onKeyPoints') {
        // 收集要点
      } else if (this.currentSection && trimmed) {
        // 继续当前段落
        const callback = callbacks[this.currentSection];
        if (callback && typeof callback === 'function') {
          (callback as (text: string) => void)(trimmed + ' ');
        }
      }
    }
  }

  // 非流式摘要用于不支持流式的 provider
  async summarize(
    title: string,
    abstract: string
  ): Promise<SummaryResult> {
    // 这里可以复用原来的 summarizer.ts 逻辑
    // 简化实现，返回默认结构
    return {
      title: title,
      keyPoints: [],
      methodology: '',
      findings: '',
      implications: '',
      overallSummary: abstract.slice(0, 300) + '...'
    };
  }
}
