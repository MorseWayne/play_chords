/**
 * 节奏型偏好管理 Hook
 * 管理每个走向的节奏型偏好设置
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  type RhythmPattern,
  type RhythmPatternPreference,
  type CustomRhythmPattern,
  loadRhythmPatternPreferences,
  saveRhythmPatternPreferences,
  loadCustomRhythmPatterns,
  saveCustomRhythmPatterns,
  getPatternById,
  STRUMMING_PATTERNS,
  ARPEGGIO_PATTERNS,
} from '@/lib/rhythms';

/**
 * 节奏型偏好管理 Hook
 * @param progressionId - 当前走向的 ID
 */
export function useRhythmPatternPreferences(progressionId: string) {
  // 全局偏好（所有走向）
  const [allPreferences, setAllPreferences] = useState<Record<string, RhythmPatternPreference>>(() => {
    return loadRhythmPatternPreferences();
  });

  // 自定义节奏型
  const [customPatterns, setCustomPatterns] = useState<CustomRhythmPattern[]>(() => {
    return loadCustomRhythmPatterns();
  });

  // 当前走向的偏好
  const preference = useMemo(() => {
    return allPreferences[progressionId] ?? null;
  }, [allPreferences, progressionId]);

  // 当前选中的节奏型
  const currentPattern = useMemo((): RhythmPattern | null => {
    if (!preference) return null;
    
    // 先在预置节奏型中查找
    const presetPattern = getPatternById(preference.patternId);
    if (presetPattern) return presetPattern;
    
    // 再在自定义节奏型中查找
    const customPattern = customPatterns.find((p) => p.id === preference.patternId);
    return customPattern ?? null;
  }, [preference, customPatterns]);

  // 设置当前走向的节奏型偏好
  const setPattern = useCallback((type: 'strum' | 'arpeggio', patternId: string) => {
    setAllPreferences((prev) => {
      const updated = {
        ...prev,
        [progressionId]: { type, patternId },
      };
      saveRhythmPatternPreferences(updated);
      return updated;
    });
  }, [progressionId]);

  // 清除当前走向的节奏型偏好
  const clearPattern = useCallback(() => {
    setAllPreferences((prev) => {
      const { [progressionId]: _, ...rest } = prev;
      saveRhythmPatternPreferences(rest);
      return rest;
    });
  }, [progressionId]);

  // 添加自定义节奏型
  const addCustomPattern = useCallback((pattern: RhythmPattern): CustomRhythmPattern => {
    const customPattern: CustomRhythmPattern = {
      ...pattern,
      isCustom: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setCustomPatterns((prev) => {
      const updated = [...prev, customPattern];
      saveCustomRhythmPatterns(updated);
      return updated;
    });
    
    return customPattern;
  }, []);

  // 删除自定义节奏型
  const deleteCustomPattern = useCallback((patternId: string) => {
    setCustomPatterns((prev) => {
      const updated = prev.filter((p) => p.id !== patternId);
      saveCustomRhythmPatterns(updated);
      return updated;
    });
    
    // 同时清除使用该节奏型的偏好
    setAllPreferences((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        if (updated[key].patternId === patternId) {
          delete updated[key];
        }
      });
      saveRhythmPatternPreferences(updated);
      return updated;
    });
  }, []);

  // 更新自定义节奏型
  const updateCustomPattern = useCallback((patternId: string, updates: Partial<RhythmPattern>) => {
    setCustomPatterns((prev) => {
      const updated = prev.map((p): CustomRhythmPattern => {
        if (p.id === patternId) {
          // 保持原有类型
          if (p.type === 'strumming') {
            return { ...p, ...updates, updatedAt: Date.now() } as CustomRhythmPattern;
          } else {
            return { ...p, ...updates, updatedAt: Date.now() } as CustomRhythmPattern;
          }
        }
        return p;
      });
      saveCustomRhythmPatterns(updated);
      return updated;
    });
  }, []);

  // 获取所有可用的扫弦节奏型（预置 + 自定义）
  const allStrummingPatterns = useMemo(() => {
    const customStrum = customPatterns.filter((p) => p.type === 'strumming');
    return [...STRUMMING_PATTERNS, ...customStrum];
  }, [customPatterns]);

  // 获取所有可用的分解节奏型（预置 + 自定义）
  const allArpeggioPatterns = useMemo(() => {
    const customArp = customPatterns.filter((p) => p.type === 'arpeggio');
    return [...ARPEGGIO_PATTERNS, ...customArp];
  }, [customPatterns]);

  // 在组件挂载后从 localStorage 同步
  useEffect(() => {
    setAllPreferences(loadRhythmPatternPreferences());
    setCustomPatterns(loadCustomRhythmPatterns());
  }, []);

  return {
    // 当前走向的偏好
    preference,
    currentPattern,
    setPattern,
    clearPattern,
    
    // 自定义节奏型管理
    customPatterns,
    addCustomPattern,
    deleteCustomPattern,
    updateCustomPattern,
    
    // 所有可用节奏型
    allStrummingPatterns,
    allArpeggioPatterns,
  };
}
