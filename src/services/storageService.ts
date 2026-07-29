import type { DynamicPageConfig } from '../types/dashboard';

const DYNAMIC_PAGES_STORAGE_KEY = 'police_dashboard_dynamic_pages_v1';

export function getSavedDynamicPages(): DynamicPageConfig[] {
  try {
    const raw = localStorage.getItem(DYNAMIC_PAGES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load saved dynamic pages:', e);
    return [];
  }
}

export function saveDynamicPage(page: Omit<DynamicPageConfig, 'id' | 'createdAt'>): DynamicPageConfig {
  const existing = getSavedDynamicPages();
  const newPage: DynamicPageConfig = {
    ...page,
    id: `custom-page-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    createdAt: Date.now(),
    isCustom: true,
  };

  const updated = [...existing, newPage];
  localStorage.setItem(DYNAMIC_PAGES_STORAGE_KEY, JSON.stringify(updated));
  return newPage;
}

export function removeDynamicPage(id: string): DynamicPageConfig[] {
  const existing = getSavedDynamicPages();
  const updated = existing.filter((p) => p.id !== id);
  localStorage.setItem(DYNAMIC_PAGES_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
