import { useEffect, useCallback } from 'react';

export interface KeyboardShortcuts {
  onSearch?: () => void;
  onRefresh?: () => void;
  onSettings?: () => void;
  onLibrary?: () => void;
  onNextPaper?: () => void;
  onPrevPaper?: () => void;
  onFavorite?: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts, enabled: boolean = true): void {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // 忽略输入框中的快捷键
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const key = event.key.toLowerCase();

    switch (key) {
      case '/':
        event.preventDefault();
        shortcuts.onSearch?.();
        break;
      case 'r':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          shortcuts.onRefresh?.();
        }
        break;
      case 's':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          shortcuts.onSettings?.();
        }
        break;
      case 'l':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          shortcuts.onLibrary?.();
        }
        break;
      case 'j':
        event.preventDefault();
        shortcuts.onNextPaper?.();
        break;
      case 'k':
        event.preventDefault();
        shortcuts.onPrevPaper?.();
        break;
      case 'f':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          shortcuts.onFavorite?.();
        }
        break;
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

// 快捷键帮助文本
export const KEYBOARD_SHORTCUTS_HELP = [
  { key: '/', description: '聚焦搜索框' },
  { key: 'R', description: '刷新论文列表' },
  { key: 'S', description: '打开设置' },
  { key: 'L', description: '打开图书馆' },
  { key: 'J / K', description: '下一条 / 上一条论文' },
  { key: 'F', description: '收藏当前论文' },
];
