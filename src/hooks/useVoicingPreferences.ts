import { useCallback, useMemo, useState } from 'react';

const STORAGE_KEY = 'progression-voicing-preferences';

type VoicingPreferences = Record<string, Record<number, number>>;

const EMPTY_PREFERENCES: Record<number, number> = {};

function loadPreferences(): VoicingPreferences {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (error) {
    console.error('Failed to load voicing preferences:', error);
    return {};
  }
}

function savePreferences(preferences: VoicingPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save voicing preferences:', error);
  }
}

export function useVoicingPreferences(progressionId: string) {
  const [allPreferences, setAllPreferences] = useState<VoicingPreferences>(loadPreferences);
  
  // 使用 useMemo 保持稳定的引用，避免无限循环
  const preferences = useMemo(() => {
    return allPreferences[progressionId] ?? EMPTY_PREFERENCES;
  }, [allPreferences, progressionId]);

  const setVoicing = useCallback((chordIndex: number, voicingIndex: number) => {
    setAllPreferences(prev => {
      const updated = {
        ...prev,
        [progressionId]: {
          ...(prev[progressionId] ?? {}),
          [chordIndex]: voicingIndex,
        },
      };
      savePreferences(updated);
      return updated;
    });
  }, [progressionId]);

  const clearPreferences = useCallback(() => {
    setAllPreferences(prev => {
      const updated = { ...prev };
      delete updated[progressionId];
      savePreferences(updated);
      return updated;
    });
  }, [progressionId]);

  return { preferences, setVoicing, clearPreferences };
}
