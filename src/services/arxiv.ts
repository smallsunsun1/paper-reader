import type { ArxivPaper, SearchFilters } from '../types';

// 主要关注的 arXiv 分类 - 与 AI/ML 相关的
const TARGET_CATEGORIES = [
  'cs.CL',  // 计算与语言
  'cs.LG',  // 机器学习
  'cs.AI',  // 人工智能
  'cs.IR',  // 信息检索
  'cs.CV',  // 计算机视觉（多模态相关）
];

// 请求间隔（毫秒）- arXiv 建议每分钟不超过 1 个请求
const REQUEST_DELAY = 3000;

// 重试配置
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

// CORS 代理列表（用于生产环境备选）
const CORS_PROXIES = [
  '',  // 空字符串表示直接请求（开发环境使用 Vite 代理）
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

export class ArxivService {
  private lastRequestTime: number = 0;
  private cache: Map<string, { data: ArxivPaper[]; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
  private currentProxyIndex = 0;

  /**
   * 获取基础 URL（根据是否使用代理）
   */
  private getBaseUrl(): string {
    const proxy = CORS_PROXIES[this.currentProxyIndex];
    const arxivBase = 'https://export.arxiv.org/api/query';
    
    if (proxy) {
      return proxy + encodeURIComponent(arxivBase);
    }
    
    // 开发环境：使用 Vite 代理
    // 生产环境：如果直接请求失败，会自动切换到代理
    return '/api/arxiv/api/query';
  }

  /**
   * 切换到下一个代理
   */
  private switchToNextProxy(): boolean {
    if (this.currentProxyIndex < CORS_PROXIES.length - 1) {
      this.currentProxyIndex++;
      console.log(`[arXiv] Switching to proxy: ${CORS_PROXIES[this.currentProxyIndex] || 'direct'}`);
      return true;
    }
    return false;
  }

  /**
   * 等待一段时间
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 确保请求间隔，避免触发频率限制
   */
  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < REQUEST_DELAY) {
      const waitTime = REQUEST_DELAY - timeSinceLastRequest;
      console.log(`[arXiv] Throttling request, waiting ${waitTime}ms...`);
      await this.delay(waitTime);
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Build simplified search query for LLM papers
   */
  private buildLLMQuery(): string {
    const coreKeywords = ['"large language model"', 'LLM', 'GPT', 'transformer'];
    return coreKeywords.join(' OR ');
  }

  /**
   * 构建分类过滤查询
   */
  private buildCategoryQuery(): string {
    return TARGET_CATEGORIES.map(cat => `cat:${cat}`).join(' OR ');
  }

  /**
   * Parse Atom XML response into paper objects
   */
  private parseAtomXml(xmlText: string): ArxivPaper[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    const entries = xmlDoc.querySelectorAll('entry');
    const papers: ArxivPaper[] = [];

    entries.forEach(entry => {
      const id = entry.querySelector('id')?.textContent || '';
      const title = entry.querySelector('title')?.textContent?.trim() || '';
      const summary = entry.querySelector('summary')?.textContent?.trim() || '';
      const published = entry.querySelector('published')?.textContent || '';
      const updated = entry.querySelector('updated')?.textContent || '';
      
      // Parse authors
      const authorElements = entry.querySelectorAll('author');
      const authors: string[] = [];
      authorElements.forEach(author => {
        const name = author.querySelector('name')?.textContent;
        if (name) authors.push(name);
      });

      // Parse categories
      const categoryElements = entry.querySelectorAll('category');
      const categories: string[] = [];
      categoryElements.forEach(cat => {
        const term = cat.getAttribute('term');
        if (term) categories.push(term);
      });

      // Get primary category
      const primaryCategory = entry.querySelector('primary_category')?.getAttribute('term') || categories[0] || '';

      // Get PDF link
      const links = entry.querySelectorAll('link');
      let pdfUrl = '';
      let arxivUrl = '';
      links.forEach(link => {
        const type = link.getAttribute('type');
        const href = link.getAttribute('href');
        const title = link.getAttribute('title');
        
        if (type === 'application/pdf' && href) {
          pdfUrl = href;
        } else if (title === 'pdf' && href) {
          pdfUrl = href;
        } else if (!arxivUrl && href && href.includes('abs')) {
          arxivUrl = href;
        }
      });

      // Ensure pdfUrl is set
      if (!pdfUrl && id) {
        const arxivId = id.split('/').pop()?.replace('abs/', '');
        if (arxivId) {
          pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
        }
      }
      if (!arxivUrl && id) {
        arxivUrl = id.replace('/api/query?', '/abs/').replace('/api/query', '/abs');
      }

      papers.push({
        id,
        title: this.cleanText(title),
        summary: this.cleanText(summary),
        authors,
        published,
        updated,
        pdfUrl,
        arxivUrl,
        categories,
        primaryCategory
      });
    });

    return papers;
  }

  /**
   * Clean up text (remove extra whitespace, newlines)
   */
  private cleanText(text: string): string {
    return text
      .replace(/\n\s+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 从缓存获取数据
   */
  private getFromCache(key: string): ArxivPaper[] | null {
    const cached = this.cache.get(key);
    if (cached) {
      const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
      if (!isExpired) {
        console.log('[arXiv] Using cached data');
        return cached.data;
      }
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * 保存到缓存
   */
  private setCache(key: string, data: ArxivPaper[]): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * 执行带重试的请求，自动处理 CORS 问题
   */
  private async fetchWithRetry(
    params: URLSearchParams, 
    retries: number = MAX_RETRIES
  ): Promise<Response> {
    try {
      await this.throttleRequest();
      
      const baseUrl = this.getBaseUrl();
      const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + params.toString();
      
      console.log(`[arXiv] Fetching via: ${baseUrl.includes('proxy') ? 'proxy' : 'direct'}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/atom+xml, application/xml, text/xml',
        },
      });

      // 503 错误时重试
      if (response.status === 503 && retries > 0) {
        console.log(`[arXiv] 503 error, retrying in ${RETRY_DELAY}ms... (${retries} retries left)`);
        await this.delay(RETRY_DELAY);
        return this.fetchWithRetry(params, retries - 1);
      }

      return response;
    } catch (error) {
      const isCORSError = error instanceof TypeError && 
        (error.message.includes('CORS') || error.message.includes('Failed to fetch'));
      
      // CORS 错误时尝试切换代理
      if (isCORSError && this.switchToNextProxy()) {
        console.log('[arXiv] CORS error detected, trying alternative...');
        return this.fetchWithRetry(params, retries);
      }
      
      // 网络错误时重试
      if (retries > 0) {
        console.log(`[arXiv] Network error, retrying... (${retries} retries left)`);
        await this.delay(RETRY_DELAY);
        return this.fetchWithRetry(params, retries - 1);
      }
      
      throw error;
    }
  }

  /**
   * Search for papers on arXiv
   */
  async searchPapers(
    query?: string,
    start: number = 0,
    maxResults: number = 10,
    filters?: Partial<SearchFilters>
  ): Promise<ArxivPaper[]> {
    const searchQuery = query || this.buildLLMQuery();
    const sortBy = filters?.sortBy || 'submittedDate';
    const sortOrder = filters?.sortOrder || 'descending';
    const max = Math.min(filters?.maxResults || maxResults, 10);

    // 构建查询
    let finalQuery: string;
    if (filters?.category) {
      finalQuery = `cat:${filters.category} AND (${searchQuery})`;
    } else {
      finalQuery = `(${this.buildCategoryQuery()}) AND (${searchQuery})`;
    }

    const params = new URLSearchParams({
      search_query: finalQuery,
      start: start.toString(),
      max_results: max.toString(),
      sortBy: sortBy,
      sortOrder: sortOrder
    });

    const cacheKey = params.toString();
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
      const response = await this.fetchWithRetry(params);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      const papers = this.parseAtomXml(xmlText);
      
      this.setCache(cacheKey, papers);
      
      // 成功后重置代理索引
      this.currentProxyIndex = 0;
      
      return papers;
    } catch (error) {
      console.error('[arXiv] Error fetching papers:', error);
      throw error;
    }
  }

  /**
   * Get latest LLM papers
   */
  async getLatestPapers(start: number = 0, maxResults: number = 10): Promise<ArxivPaper[]> {
    if (start === 0) {
      return this.getRecentPapersFromCategories(maxResults);
    }
    
    return this.searchPapers(undefined, start, maxResults, {
      sortBy: 'submittedDate',
      sortOrder: 'descending'
    });
  }

  /**
   * 从特定分类获取最近论文
   */
  private async getRecentPapersFromCategories(maxResults: number = 10): Promise<ArxivPaper[]> {
    const cacheKey = 'recent_categories_' + maxResults;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const primaryCategory = 'cs.CL';
    
    const params = new URLSearchParams({
      search_query: `cat:${primaryCategory}`,
      start: '0',
      max_results: maxResults.toString(),
      sortBy: 'submittedDate',
      sortOrder: 'descending'
    });

    try {
      const response = await this.fetchWithRetry(params);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      const papers = this.parseAtomXml(xmlText);
      
      const llmPapers = papers.filter(p => this.isLLMPaper(p));
      const result = llmPapers.length >= 5 ? llmPapers : papers.slice(0, maxResults);
      
      this.setCache(cacheKey, result);
      
      // 成功后重置代理索引
      this.currentProxyIndex = 0;
      
      return result;
    } catch (error) {
      console.error('[arXiv] Error fetching from categories:', error);
      
      // 如果是 CORS 错误，给用户提供更清晰的提示
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('CORS') || errorMsg.includes('Failed to fetch')) {
        throw new Error('CORS 错误：无法直接访问 arXiv API。请检查网络连接或使用代理。');
      }
      
      return [];
    }
  }

  /**
   * 判断是否为 LLM 相关论文
   */
  private isLLMPaper(paper: ArxivPaper): boolean {
    const text = (paper.title + ' ' + paper.summary).toLowerCase();
    const llmTerms = [
      'language model', 'llm', 'gpt', 'transformer', 'bert', 
      'generative', 'chatgpt', 'claude', 'gemini', 'foundation model',
      'prompt', 'fine-tuning', 'rlhf', 'multimodal', 'rag'
    ];
    return llmTerms.some(term => text.includes(term));
  }

  /**
   * Search papers by custom query
   */
  async searchCustom(query: string, start: number = 0, maxResults: number = 10): Promise<ArxivPaper[]> {
    const simplifiedQuery = query.trim().split(/\s+/).slice(0, 3).join(' OR ');
    return this.searchPapers(simplifiedQuery, start, maxResults, {
      sortBy: 'relevance',
      sortOrder: 'descending'
    });
  }
}

export const arxivService = new ArxivService();
