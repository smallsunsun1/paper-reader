import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

const DB_NAME = 'paper-reader-db';
const DB_VERSION = 1;

export interface FavoritePaper {
  id: string;
  title: string;
  authors: string[];
  summary: string;
  pdfUrl: string;
  arxivUrl: string;
  primaryCategory: string;
  categories: string[];
  published: string;
  addedAt: string;
}

export interface ReadingHistory {
  id: string;
  title: string;
  authors: string[];
  pdfUrl: string;
  arxivUrl: string;
  primaryCategory: string;
  readAt: string;
  readCount: number;
}

interface PaperReaderDB extends DBSchema {
  favorites: {
    key: string;
    value: FavoritePaper;
    indexes: { 'by-date': string };
  };
  history: {
    key: string;
    value: ReadingHistory;
    indexes: { 'by-date': string };
  };
}

class DatabaseService {
  private db: IDBPDatabase<PaperReaderDB> | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<PaperReaderDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 创建收藏表
        if (!db.objectStoreNames.contains('favorites')) {
          const favoriteStore = db.createObjectStore('favorites', { keyPath: 'id' });
          favoriteStore.createIndex('by-date', 'addedAt', { unique: false });
        }

        // 创建历史记录表
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', { keyPath: 'id' });
          historyStore.createIndex('by-date', 'readAt', { unique: false });
        }
      },
    });

    console.log('[DB] Database initialized');
  }

  // 收藏功能
  async addFavorite(paper: Omit<FavoritePaper, 'addedAt'>): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const favorite: FavoritePaper = {
      ...paper,
      addedAt: new Date().toISOString(),
    };

    await this.db.put('favorites', favorite);
    console.log('[DB] Added to favorites:', paper.id);
  }

  async removeFavorite(paperId: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.delete('favorites', paperId);
    console.log('[DB] Removed from favorites:', paperId);
  }

  async isFavorite(paperId: string): Promise<boolean> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const favorite = await this.db.get('favorites', paperId);
    return !!favorite;
  }

  async getFavorites(limit: number = 100): Promise<FavoritePaper[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const favorites = await this.db.getAllFromIndex('favorites', 'by-date');
    return favorites.reverse().slice(0, limit);
  }

  // 阅读历史
  async addToHistory(paper: Omit<ReadingHistory, 'readAt' | 'readCount'>): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const existing = await this.db.get('history', paper.id);
    
    const history: ReadingHistory = {
      ...paper,
      readAt: new Date().toISOString(),
      readCount: existing ? existing.readCount + 1 : 1,
    };

    await this.db.put('history', history);
    console.log('[DB] Added to history:', paper.id);
  }

  async getHistory(limit: number = 50): Promise<ReadingHistory[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const history = await this.db.getAllFromIndex('history', 'by-date');
    return history.reverse().slice(0, limit);
  }

  async clearHistory(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    await this.db.clear('history');
    console.log('[DB] History cleared');
  }

  // 统计数据
  async getStats(): Promise<{ favorites: number; history: number }> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const favorites = await this.db.count('favorites');
    const history = await this.db.count('history');

    return { favorites, history };
  }
}

export const dbService = new DatabaseService();
