import { useCallback, useState } from 'react';
import type { ProgressionDefinition } from '@/lib/progressions';

export interface CustomProgressionDefinition extends ProgressionDefinition {
  createdAt: number;
  updatedAt: number;
  isCustom: true;
}

const STORAGE_KEY = 'custom-progressions';

function loadProgressions(): CustomProgressionDefinition[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load custom progressions:', error);
    return [];
  }
}

function saveProgressions(progressions: CustomProgressionDefinition[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progressions));
  } catch (error) {
    console.error('Failed to save custom progressions:', error);
    // Handle quota exceeded
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      alert('存储空间不足，请清理一些自定义走向后重试。');
    }
  }
}

export function useCustomProgressions() {
  const [progressions, setProgressions] = useState<CustomProgressionDefinition[]>(loadProgressions);

  const addProgression = useCallback((progression: Omit<CustomProgressionDefinition, 'createdAt' | 'updatedAt' | 'isCustom'>) => {
    const now = Date.now();
    const newProgression: CustomProgressionDefinition = {
      ...progression,
      createdAt: now,
      updatedAt: now,
      isCustom: true,
    };

    setProgressions(prev => {
      const updated = [...prev, newProgression];
      saveProgressions(updated);
      return updated;
    });

    return newProgression;
  }, []);

  const updateProgression = useCallback((id: string, updates: Partial<Omit<CustomProgressionDefinition, 'id' | 'createdAt' | 'isCustom'>>) => {
    setProgressions(prev => {
      const updated = prev.map(p => 
        p.id === id 
          ? { ...p, ...updates, updatedAt: Date.now() }
          : p
      );
      saveProgressions(updated);
      return updated;
    });
  }, []);

  const deleteProgression = useCallback((id: string) => {
    setProgressions(prev => {
      const updated = prev.filter(p => p.id !== id);
      saveProgressions(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setProgressions([]);
    saveProgressions([]);
  }, []);

  return {
    progressions,
    addProgression,
    updateProgression,
    deleteProgression,
    clearAll,
  };
}
