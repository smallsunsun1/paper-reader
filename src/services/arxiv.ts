import type { ArxivPaper, SearchFilters } from '../types';

const ARXIV_API_BASE = 'https://export.arxiv.org/api/query';

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

export class ArxivService {
  private lastRequestTime: number = 0;
  private cache: Map<string, { data: ArxivPaper[]; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

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
   * 使用更简洁的查询减少服务器负担
   */
  private buildLLMQuery(): string {
    // 只使用最核心的几个关键词，减少查询复杂度
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
   * 获取缓存键
   */
  private getCacheKey(url: string): string {
    return url;
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
   * 执行带重试的请求
   */
  private async fetchWithRetry(url: string, retries: number = MAX_RETRIES): Promise<Response> {
    try {
      await this.throttleRequest();
      
      console.log(`[arXiv] Fetching: ${url}`);
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/atom+xml'
        }
      });

      // 503 错误时重试
      if (response.status === 503 && retries > 0) {
        console.log(`[arXiv] 503 error, retrying in ${RETRY_DELAY}ms... (${retries} retries left)`);
        await this.delay(RETRY_DELAY);
        return this.fetchWithRetry(url, retries - 1);
      }

      return response;
    } catch (error) {
      if (retries > 0) {
        console.log(`[arXiv] Network error, retrying... (${retries} retries left)`);
        await this.delay(RETRY_DELAY);
        return this.fetchWithRetry(url, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Search for papers on arXiv
   * 优化后的搜索，限制范围并添加重试
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
    const max = Math.min(filters?.maxResults || maxResults, 10); // 最多10篇

    // 构建查询：限制在特定分类内搜索，减少服务器负担
    let finalQuery: string;
    if (filters?.category) {
      finalQuery = `cat:${filters.category} AND (${searchQuery})`;
    } else {
      // 使用分类限制 + 关键词搜索
      finalQuery = `(${this.buildCategoryQuery()}) AND (${searchQuery})`;
    }

    const params = new URLSearchParams({
      search_query: finalQuery,
      start: start.toString(),
      max_results: max.toString(),
      sortBy: sortBy,
      sortOrder: sortOrder
    });

    const url = `${ARXIV_API_BASE}?${params.toString()}`;
    
    // 检查缓存
    const cacheKey = this.getCacheKey(url);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      const papers = this.parseAtomXml(xmlText);
      
      // 保存到缓存
      this.setCache(cacheKey, papers);
      
      return papers;
    } catch (error) {
      console.error('[arXiv] Error fetching papers:', error);
      throw error;
    }
  }

  /**
   * Get latest LLM papers - 最简化版本，优先使用分类浏览
   */
  async getLatestPapers(start: number = 0, maxResults: number = 10): Promise<ArxivPaper[]> {
    // 如果 start 为 0，尝试直接获取特定分类的最新论文
    if (start === 0) {
      return this.getRecentPapersFromCategories(maxResults);
    }
    
    // 否则使用搜索
    return this.searchPapers(undefined, start, maxResults, {
      sortBy: 'submittedDate',
      sortOrder: 'descending'
    });
  }

  /**
   * 从特定分类获取最近论文 - 这种方式对服务器负担更小
   */
  private async getRecentPapersFromCategories(maxResults: number = 10): Promise<ArxivPaper[]> {
    const cacheKey = 'recent_categories_' + maxResults;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // 优先从 cs.CL (计算语言学) 获取，这是 LLM 论文最多的分类
    const primaryCategory = 'cs.CL';
    
    const params = new URLSearchParams({
      search_query: `cat:${primaryCategory}`,
      start: '0',
      max_results: maxResults.toString(),
      sortBy: 'submittedDate',
      sortOrder: 'descending'
    });

    const url = `${ARXIV_API_BASE}?${params.toString()}`;
    
    try {
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      const papers = this.parseAtomXml(xmlText);
      
      // 过滤出与 LLM 相关的论文
      const llmPapers = papers.filter(p => this.isLLMPaper(p));
      
      // 如果过滤后太少，补充一些其他论文
      const result = llmPapers.length >= 5 ? llmPapers : papers.slice(0, maxResults);
      
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[arXiv] Error fetching from categories:', error);
      // 出错时返回空数组而不是抛出，避免 UI 崩溃
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
    // 简化用户查询，避免太复杂的查询导致 503
    const simplifiedQuery = query.trim().split(/\s+/).slice(0, 3).join(' OR ');
    return this.searchPapers(simplifiedQuery, start, maxResults, {
      sortBy: 'relevance',
      sortOrder: 'descending'
    });
  }
}

export const arxivService = new ArxivService();
