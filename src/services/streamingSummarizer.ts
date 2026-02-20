import type { SummaryResult } from '../types';
import type { SummarizerConfig } from './summarizer';
import { summaryCache } from './summaryCache';

export interface StreamCallbacks {
  onChunk?: (chunk: string, partialSummary: SummaryResult | null) => void;
  onComplete?: (fullText: string, summary: SummaryResult) => void;
  onError?: (error: string) => void;
}

export class StreamingSummarizerService {
  private config: SummarizerConfig;
  private pendingUpdate: boolean = false;
  private lastFullText: string = '';

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
    return `You are an expert research paper summarizer. Analyze the given academic paper and provide a structured summary in JSON format.

Return your response in this exact JSON structure:
{
  "title": "Brief, clear title for the summary",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "methodology": "Description of the methods used",
  "findings": "Main findings and results",
  "implications": "Implications and significance of this research",
  "overallSummary": "A concise 2-3 paragraph summary of the entire paper"
}

Focus on core contributions, technical approach, key results, and practical applications. Be accurate and concise. Output ONLY the JSON, no markdown formatting.`;
  }

  /**
   * Check if there's a cached summary
   */
  getCachedSummary(paperId: string): SummaryResult | null {
    return summaryCache.get(paperId, this.config.provider || 'local', this.config.model || '');
  }

  /**
   * Stream summarize a paper with real-time token-by-token updates
   */
  async streamSummarize(
    paperId: string,
    title: string,
    abstract: string,
    callbacks: StreamCallbacks
  ): Promise<boolean> {
    // Check cache first
    const cached = this.getCachedSummary(paperId);
    if (cached) {
      console.log('[Streaming] Using cached summary for', paperId);
      callbacks.onComplete?.('', cached);
      return true;
    }

    if (!this.config.apiKey) {
      callbacks.onError?.('No API key configured');
      return false;
    }

    const supportsStreaming = this.config.provider === 'openai' || this.config.provider === 'moonshot';
    if (!supportsStreaming) {
      callbacks.onError?.('Provider does not support streaming');
      return false;
    }

    try {
      const fullText = await this.doStreamRequest(title, abstract, callbacks);
      
      // Parse final result
      const finalSummary = this.parseStreamedResponse(fullText);
      if (finalSummary) {
        // Save to cache
        summaryCache.set(paperId, finalSummary, this.config.provider || 'local', this.config.model || '');
        callbacks.onComplete?.(fullText, finalSummary);
        return true;
      } else {
        callbacks.onError?.('Failed to parse summary');
        return false;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Streaming error';
      callbacks.onError?.(msg);
      return false;
    }
  }

  private async doStreamRequest(
    title: string,
    abstract: string,
    callbacks: StreamCallbacks
  ): Promise<string> {
    const content = `Title: ${title}\n\nAbstract: ${abstract}`;
    const url = this.config.provider === 'moonshot' 
      ? 'https://api.moonshot.cn/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(url, {
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
      throw new Error(`API error: ${await response.text()}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    let fullText = '';
    this.lastFullText = '';
    this.pendingUpdate = false;
    
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                this.scheduleUpdate(fullText, callbacks);
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Final update
    if (!this.pendingUpdate) {
      const partial = this.parseStreamedResponse(fullText);
      callbacks.onChunk?.('', partial);
    }

    return fullText;
  }

  /**
   * Schedule UI update using requestAnimationFrame for smooth rendering
   */
  private scheduleUpdate(fullText: string, callbacks: StreamCallbacks): void {
    if (this.pendingUpdate) return;
    
    this.pendingUpdate = true;
    this.lastFullText = fullText;
    
    requestAnimationFrame(() => {
      this.pendingUpdate = false;
      const partial = this.parseStreamedResponse(this.lastFullText);
      callbacks.onChunk?.('', partial);
    });
  }

  /**
   * Parse the streamed JSON response into SummaryResult
   */
  parseStreamedResponse(text: string): SummaryResult | null {
    // First try: full JSON parse
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text;
      const parsed = JSON.parse(jsonStr);
      
      return {
        title: parsed.title || '',
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        methodology: parsed.methodology || parsed.methods || '',
        findings: parsed.findings || parsed.results || '',
        implications: parsed.implications || parsed.significance || '',
        overallSummary: parsed.overallSummary || parsed.summary || parsed.abstract || ''
      };
    } catch {
      // Fall through to partial parsing
    }

    // Second try: extract whatever fields we can
    return this.extractPartialFields(text);
  }

  /**
   * Extract partial fields from incomplete JSON
   */
  private extractPartialFields(text: string): SummaryResult | null {
    const result: SummaryResult = {
      title: '',
      keyPoints: [],
      methodology: '',
      findings: '',
      implications: '',
      overallSummary: ''
    };

    let hasAnyField = false;

    // Extract title - match "title": "..." (handles escaped quotes)
    const titleMatch = text.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)/);
    if (titleMatch) {
      result.title = titleMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
      hasAnyField = true;
    }

    // Extract keyPoints - match array content
    const keyPointsMatch = text.match(/"keyPoints"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
    if (keyPointsMatch) {
      const pointsText = keyPointsMatch[1];
      // Match individual string items in array
      const points = pointsText.match(/"((?:[^"\\]|\\.)*)"/g);
      if (points) {
        result.keyPoints = points
          .map(p => p.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n'))
          .filter(p => p.length > 0);
        hasAnyField = true;
      }
    }

    // Extract methodology
    const methodologyMatch = text.match(/"methodology"\s*:\s*"((?:[^"\\]|\\.)*)/);
    if (methodologyMatch) {
      result.methodology = methodologyMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
      hasAnyField = true;
    }

    // Extract findings
    const findingsMatch = text.match(/"findings"\s*:\s*"((?:[^"\\]|\\.)*)/);
    if (findingsMatch) {
      result.findings = findingsMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
      hasAnyField = true;
    }

    // Extract implications
    const implicationsMatch = text.match(/"implications"\s*:\s*"((?:[^"\\]|\\.)*)/);
    if (implicationsMatch) {
      result.implications = implicationsMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
      hasAnyField = true;
    }

    // Extract overallSummary
    const overallMatch = text.match(/"overallSummary"\s*:\s*"((?:[^"\\]|\\.)*)/);
    if (overallMatch) {
      result.overallSummary = overallMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
      hasAnyField = true;
    }

    return hasAnyField ? result : null;
  }
}
