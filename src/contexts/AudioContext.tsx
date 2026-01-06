'use client';

import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { ModernSoundfontLoader } from '@/lib/soundfont/ModernSoundfontLoader';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

// 音量控制常量
const STORAGE_KEY_VOLUME = 'audio-volume';
const DEFAULT_VOLUME = 70;
const MIN_VOLUME = 0;
const MAX_VOLUME = 100;

// Soundfont 配置
const SOUNDFONT_BASE_URL = (() => {
  const basePath = typeof window !== 'undefined' && process.env.NODE_ENV === 'production' 
    ? '/play_chords' 
    : '';
  return `${basePath}/soundfonts/guitar`;
})();

function midiToNoteName(midi: number): string {
  const pitchClasses = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const pc = pitchClasses[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${pc}${octave}`;
}

function uniqSorted(nums: number[]): number[] {
  return Array.from(new Set(nums.filter((n) => Number.isFinite(n)))).sort((a, b) => a - b);
}

function loadVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_VOLUME;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_VOLUME);
    if (stored) {
      const volume = parseInt(stored, 10);
      if (!isNaN(volume) && volume >= MIN_VOLUME && volume <= MAX_VOLUME) {
        return volume;
      }
    }
  } catch (e) {
    console.warn('Failed to load volume from localStorage:', e);
  }
  return DEFAULT_VOLUME;
}

function saveVolume(volume: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_VOLUME, String(volume));
  } catch (e) {
    console.warn('Failed to save volume to localStorage:', e);
  }
}

function clampVolume(volume: number): number {
  return Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, volume));
}

interface AudioContextValue {
  playStrum: (midiNotes: number[]) => Promise<void>;
  playArpeggio: (midiNotes: number[]) => Promise<void>;
  initAudio: () => Promise<void>;
  state: LoadState;
  isReady: boolean;
  volume: number;
  updateVolume: (newVolume: number) => void;
  minVolume: number;
  maxVolume: number;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  // 使用 ref 存储音频资源，这样在组件重新渲染时不会丢失
  const audioContextRef = useRef<globalThis.AudioContext | null>(null);
  const loaderRef = useRef<ModernSoundfontLoader | null>(null);
  const [state, setState] = useState<LoadState>('idle');
  const [volume, setVolume] = useState(DEFAULT_VOLUME);

  // 在客户端挂载后从 localStorage 加载音量
  useEffect(() => {
    const savedVolume = loadVolume();
    setVolume(savedVolume);
    if (loaderRef.current) {
      loaderRef.current.setMasterGain(savedVolume / 100);
    }
  }, []);

  const initAudio = useCallback(async () => {
    if (loaderRef.current) return;
    if (state === 'loading') return;

    setState('loading');
    try {
      const AudioContextCtor =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx: globalThis.AudioContext = audioContextRef.current ?? new AudioContextCtor();
      audioContextRef.current = ctx;

      if (ctx.state !== 'running') {
        await ctx.resume();
      }

      // 创建现代 soundfont 加载器
      const loader = new ModernSoundfontLoader(ctx, SOUNDFONT_BASE_URL);
      loaderRef.current = loader;

      // 设置音量
      loader.setMasterGain(volume / 100);

      // 预加载吉他常用音符范围
      console.log('[Audio] Preloading guitar range...');
      await loader.preloadGuitarRange();
      console.log('[Audio] Preload complete!');

      setState('ready');
    } catch (e) {
      console.error('[Audio] Failed to init soundfont', e);
      setState('error');
    }
  }, [state, volume]);

  const playStrum = useCallback(
    async (midiNotes: number[]) => {
      await initAudio();
      const loader = loaderRef.current;
      const ctx = audioContextRef.current;
      
      if (!loader || !ctx) {
        console.warn('[Audio] Cannot play: loader or context missing');
        return;
      }

      // 确保 AudioContext 处于运行状态
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const notes = uniqSorted(midiNotes).map(midiToNoteName);
      
      try {
        loader.playStrum(notes, { duration: 2.2, interval: 0.04 });
      } catch (e) {
        console.error('[Audio] Failed to play strum:', e);
      }
    },
    [initAudio],
  );

  const playArpeggio = useCallback(
    async (midiNotes: number[]) => {
      await initAudio();
      const loader = loaderRef.current;
      const ctx = audioContextRef.current;
      
      if (!loader || !ctx) return;

      // 确保 AudioContext 处于运行状态
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const notes = uniqSorted(midiNotes).map(midiToNoteName);
      
      try {
        loader.playArpeggio(notes, { duration: 1.6, interval: 0.22 });
      } catch (e) {
        console.error('[Audio] Failed to play arpeggio:', e);
      }
    },
    [initAudio],
  );

  const updateVolume = useCallback((newVolume: number) => {
    const clampedVolume = clampVolume(newVolume);
    setVolume(clampedVolume);
    saveVolume(clampedVolume);
    
    // 立即更新音量
    if (loaderRef.current) {
      loaderRef.current.setMasterGain(clampedVolume / 100);
    }
  }, []);

  const value: AudioContextValue = {
    playStrum,
    playArpeggio,
    initAudio,
    state,
    isReady: state === 'ready',
    volume,
    updateVolume,
    minVolume: MIN_VOLUME,
    maxVolume: MAX_VOLUME,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
