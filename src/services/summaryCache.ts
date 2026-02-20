import type { SummaryResult } from '../types';

interface CachedSummary {
  paperId: string;
  summary: SummaryResult;
  createdAt: number;
  provider: string;
  model: string;
}

const CACHE_KEY = 'paper-reader-summary-cache';
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30天
const MAX_CACHE_SIZE = 50; // 最多缓存50篇

class SummaryCacheService {
  private cache: Map<string, CachedSummary> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(CACHE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as Record<string, CachedSummary>;
        const now = Date.now();
        
        // 只加载未过期的缓存
        Object.entries(parsed).forEach(([key, value]) => {
          if (now - value.createdAt < CACHE_DURATION) {
            this.cache.set(key, value);
          }
        });
        
        console.log('[SummaryCache] Loaded', this.cache.size, 'cached summaries');
      }
    } catch (error) {
      console.error('[SummaryCache] Failed to load cache:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.cache);
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[SummaryCache] Failed to save cache:', error);
    }
  }

  private getCacheKey(paperId: string, provider: string, model: string): string {
    return `${paperId}:${provider}:${model}`;
  }

  get(paperId: string, provider: string, model: string): SummaryResult | null {
    const key = this.getCacheKey(paperId, provider, model);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // 检查是否过期
    if (Date.now() - cached.createdAt > CACHE_DURATION) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }
    
    console.log('[SummaryCache] Cache hit for', paperId);
    return cached.summary;
  }

  set(paperId: string, summary: SummaryResult, provider: string, model: string): void {
    // 如果缓存满了，删除最旧的
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldest = Array.from(this.cache.entries())
        .sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
      if (oldest) {
        this.cache.delete(oldest[0]);
      }
    }

    const key = this.getCacheKey(paperId, provider, model);
    this.cache.set(key, {
      paperId,
      summary,
      createdAt: Date.now(),
      provider,
      model,
    });
    
    this.saveToStorage();
    console.log('[SummaryCache] Saved cache for', paperId);
  }

  has(paperId: string, provider: string, model: string): boolean {
    return this.get(paperId, provider, model) !== null;
  }

  clear(): void {
    this.cache.clear();
    localStorage.removeItem(CACHE_KEY);
    console.log('[SummaryCache] Cache cleared');
  }

  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: MAX_CACHE_SIZE,
    };
  }
}

export const summaryCache = new SummaryCacheService();
