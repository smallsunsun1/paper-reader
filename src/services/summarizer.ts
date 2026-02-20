import type { SummaryResult } from '../types';

export interface SummarizerConfig {
  apiKey?: string;
  provider: 'openai' | 'anthropic' | 'google' | 'local';
  model?: string;
  temperature?: number;
}

export class SummarizerService {
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
      case 'openai':
        return 'gpt-4o-mini';
      case 'anthropic':
        return 'claude-3-sonnet-20240229';
      case 'google':
        return 'gemini-pro';
      case 'local':
        return 'llama2';
      default:
        return 'gpt-4o-mini';
    }
  }

  private getSystemPrompt(): string {
    return `You are an expert research paper summarizer. Your task is to analyze the given academic paper and provide a structured summary.

Please provide your summary in the following JSON format:
{
  "title": "Brief, clear title for the summary",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "methodology": "Description of the methods used",
  "findings": "Main findings and results",
  "implications": "Implications and significance of this research",
  "overallSummary": "A concise 2-3 paragraph summary of the entire paper"
}

Focus on:
- Core contributions and innovations
- Technical approach and methodology  
- Key results and their significance
- Practical applications and future directions

Be accurate, concise, and avoid hype. Use technical terminology appropriately.`;
  }

  private async callOpenAI(title: string, abstract: string, fullText?: string): Promise<SummaryResult> {
    const content = fullText 
      ? `Title: ${title}\n\nAbstract: ${abstract}\n\nFull Text (first 8000 chars): ${fullText.slice(0, 8000)}`
      : `Title: ${title}\n\nAbstract: ${abstract}`;

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
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return this.validateAndNormalizeResult(result);
  }

  private async callAnthropic(title: string, abstract: string, fullText?: string): Promise<SummaryResult> {
    const content = fullText 
      ? `Title: ${title}\n\nAbstract: ${abstract}\n\nFull Text (first 8000 chars): ${fullText.slice(0, 8000)}`
      : `Title: ${title}\n\nAbstract: ${abstract}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 4096,
        messages: [
          { role: 'user', content: `${this.getSystemPrompt()}\n\n${content}\n\nPlease respond with the JSON summary.` }
        ],
        temperature: this.config.temperature
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data = await response.json();
    // Extract JSON from response text
    const text = data.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
    return this.validateAndNormalizeResult(result);
  }

  private async callGoogle(title: string, abstract: string, fullText?: string): Promise<SummaryResult> {
    const content = fullText 
      ? `Title: ${title}\n\nAbstract: ${abstract}\n\nFull Text (first 8000 chars): ${fullText.slice(0, 8000)}`
      : `Title: ${title}\n\nAbstract: ${abstract}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${this.getSystemPrompt()}\n\n${content}`
          }]
        }],
        generationConfig: {
          temperature: this.config.temperature,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API error: ${error}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.candidates[0].content.parts[0].text);
    return this.validateAndNormalizeResult(result);
  }

  /**
   * Local summarizer using a simple extractive approach
   * (Fallback when no API key is available)
   */
  private async localSummarize(title: string, abstract: string): Promise<SummaryResult> {
    // Simple heuristic-based summarization
    const sentences = abstract.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    // Extract key points (first sentence + any sentence with keywords)
    const keywords = ['propose', 'introduce', 'develop', 'achieve', 'demonstrate', 'show', 'result', 'method', 'approach'];
    const keyPoints = sentences
      .filter(s => keywords.some(kw => s.toLowerCase().includes(kw)))
      .slice(0, 3)
      .map(s => s.trim());

    // If no key points found, use first few sentences
    if (keyPoints.length === 0 && sentences.length > 0) {
      keyPoints.push(sentences[0].trim());
    }

    return {
      title: title,
      keyPoints: keyPoints.length > 0 ? keyPoints : ['See full abstract for details'],
      methodology: 'Methodology details not available in local mode. Please use an AI provider for full analysis.',
      findings: 'Detailed findings require full paper analysis. Please use an AI provider for comprehensive results.',
      implications: 'Implications analysis requires AI summarization. Please configure an API key.',
      overallSummary: abstract.length > 300 ? abstract.slice(0, 300) + '...' : abstract
    };
  }

  private validateAndNormalizeResult(result: any): SummaryResult {
    return {
      title: result.title || 'Summary',
      keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : [result.keyPoints || ''],
      methodology: result.methodology || result.methods || 'Not specified',
      findings: result.findings || result.results || 'Not specified',
      implications: result.implications || result.significance || 'Not specified',
      overallSummary: result.overallSummary || result.summary || result.abstract || 'No summary available'
    };
  }

  /**
   * Summarize a paper
   */
  async summarize(
    title: string, 
    abstract: string, 
    fullText?: string
  ): Promise<SummaryResult> {
    // If no API key configured, use local fallback
    if (!this.config.apiKey && this.config.provider !== 'local') {
      console.warn('No API key provided, falling back to local summarization');
      return this.localSummarize(title, abstract);
    }

    try {
      switch (this.config.provider) {
        case 'openai':
          return await this.callOpenAI(title, abstract, fullText);
        case 'anthropic':
          return await this.callAnthropic(title, abstract, fullText);
        case 'google':
          return await this.callGoogle(title, abstract, fullText);
        case 'local':
        default:
          return await this.localSummarize(title, abstract);
      }
    } catch (error) {
      console.error('Summarization error:', error);
      // Fallback to local summarization on error
      return this.localSummarize(title, abstract);
    }
  }

  /**
   * Check if the service is configured
   */
  isConfigured(): boolean {
    return this.config.provider === 'local' || !!this.config.apiKey;
  }
}

export const createSummarizer = (config: SummarizerConfig) => new SummarizerService(config);
