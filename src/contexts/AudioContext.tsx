'use client';

import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { ModernSoundfontLoader } from '@/lib/soundfont/ModernSoundfontLoader';
import type { StrummingPattern, ArpeggioPattern } from '@/lib/rhythms';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

// 音量控制常量
const STORAGE_KEY_VOLUME = 'audio-volume';
const DEFAULT_VOLUME = 70;
const MIN_VOLUME = 0;
const MAX_VOLUME = 100;

// 标准调弦的 MIDI 音高 (低到高): E2=40, A2=45, D3=50, G3=55, B3=59, E4=64
const STANDARD_TUNING_MIDI = [40, 45, 50, 55, 59, 64];

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

/**
 * 和弦把位类型（用于节奏型播放）
 */
export interface ChordVoicing {
  frets: number[];  // 每根弦的品位，-1 表示不弹
}

interface AudioContextValue {
  playStrum: (midiNotes: number[]) => Promise<void>;
  playArpeggio: (midiNotes: number[]) => Promise<void>;
  playWithStrummingPattern: (voicing: ChordVoicing, pattern: StrummingPattern, bpm: number) => void;
  playWithArpeggioPattern: (voicing: ChordVoicing, pattern: ArpeggioPattern, bpm: number) => void;
  stopPatternPlayback: () => void;
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
  const patternTimeoutsRef = useRef<number[]>([]);
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

  /**
   * 停止当前节奏型播放
   */
  const stopPatternPlayback = useCallback(() => {
    patternTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    patternTimeoutsRef.current = [];
  }, []);

  /**
   * 根据和弦把位获取 MIDI 音符
   */
  const getVoicingMidiNotes = useCallback((voicing: ChordVoicing): number[] => {
    return voicing.frets
      .map((fret, idx) => (fret >= 0 ? STANDARD_TUNING_MIDI[idx] + fret : -1))
      .filter((n) => n >= 0);
  }, []);

  /**
   * 获取特定弦的 MIDI 音符
   */
  const getStringMidi = useCallback((voicing: ChordVoicing, stringNum: number): number | null => {
    // stringNum: 1=高音e弦, 6=低音E弦
    // 数组索引: 0=低音E弦, 5=高音e弦
    const idx = 6 - stringNum;
    if (idx < 0 || idx > 5) return null;
    const fret = voicing.frets[idx];
    if (fret < 0) return null;
    return STANDARD_TUNING_MIDI[idx] + fret;
  }, []);

  /**
   * 使用扫弦节奏型播放和弦
   */
  const playWithStrummingPattern = useCallback(
    (voicing: ChordVoicing, pattern: StrummingPattern, bpm: number) => {
      const loader = loaderRef.current;
      const ctx = audioContextRef.current;
      
      if (!loader || !ctx) {
        console.warn('[Audio] Cannot play pattern: loader or context missing');
        return;
      }

      // 清除之前的播放
      stopPatternPlayback();

      // 计算时值
      const beatMs = 60000 / bpm;
      const sixteenthMs = beatMs / 4; // 十六分音符

      // 获取所有 MIDI 音符
      const allMidi = getVoicingMidiNotes(voicing);
      if (allMidi.length === 0) return;

      // 计算总时值用于归一化
      const totalDuration = pattern.sequence.reduce((sum, a) => sum + (a.duration ?? 1), 0);
      const avgDuration = totalDuration / pattern.sequence.length;

      let currentTime = 0;

      pattern.sequence.forEach((action, idx) => {
        const duration = (action.duration ?? 1) / avgDuration * sixteenthMs;
        
        const timeoutId = window.setTimeout(() => {
          // 根据扫弦方向排序音符
          const sortedMidi = action.direction === 'down'
            ? [...allMidi].sort((a, b) => a - b)  // 从低到高
            : [...allMidi].sort((a, b) => b - a); // 从高到低

          const notes = sortedMidi.map(midiToNoteName);
          const gain = action.accent ? 1.2 : action.mute ? 0.3 : 1.0;
          const noteDuration = action.mute ? 0.1 : 1.5;

          if (action.mute) {
            // 闷音：快速轻弹
            loader.playStrum(notes, { duration: noteDuration, interval: 0.01, gain });
          } else {
            // 正常扫弦
            loader.playStrum(notes, { duration: noteDuration, interval: 0.03, gain });
          }
        }, currentTime);

        patternTimeoutsRef.current.push(timeoutId);
        currentTime += duration;
      });
    },
    [stopPatternPlayback, getVoicingMidiNotes],
  );

  /**
   * 使用分解节奏型播放和弦
   */
  const playWithArpeggioPattern = useCallback(
    (voicing: ChordVoicing, pattern: ArpeggioPattern, bpm: number) => {
      const loader = loaderRef.current;
      const ctx = audioContextRef.current;
      
      if (!loader || !ctx) {
        console.warn('[Audio] Cannot play pattern: loader or context missing');
        return;
      }

      // 清除之前的播放
      stopPatternPlayback();

      // 计算时值
      const beatMs = 60000 / bpm;
      const noteInterval = beatMs / 2; // 默认每个音符占半拍

      let currentTime = 0;

      pattern.sequence.forEach((note, idx) => {
        const midi = getStringMidi(voicing, note.string);
        if (midi === null) return;

        const duration = (note.duration ?? 1) * noteInterval;
        
        const timeoutId = window.setTimeout(() => {
          const noteName = midiToNoteName(midi);
          const gain = note.accent ? 1.3 : 1.0;
          
          loader.play(noteName, 0, { duration: 1.2, gain });
        }, currentTime);

        patternTimeoutsRef.current.push(timeoutId);
        currentTime += duration;
      });
    },
    [stopPatternPlayback, getStringMidi],
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
    playWithStrummingPattern,
    playWithArpeggioPattern,
    stopPatternPlayback,
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
