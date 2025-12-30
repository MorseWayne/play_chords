import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'metronome-bpm';
const DEFAULT_BPM = 120;
const MIN_BPM = 40;
const MAX_BPM = 240;

// 强拍和弱拍的频率（Hz）和音量
const STRONG_BEAT_FREQ = 800;
const WEAK_BEAT_FREQ = 600;
const STRONG_BEAT_GAIN = 0.7;
const WEAK_BEAT_GAIN = 0.5;

// 音效持续时间（秒）
const STRONG_BEAT_DURATION = 0.05;
const WEAK_BEAT_DURATION = 0.03;

/**
 * 从 localStorage 读取保存的 BPM，如果无效则返回默认值
 */
function loadBPM(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const bpm = parseInt(stored, 10);
      if (!isNaN(bpm) && bpm >= MIN_BPM && bpm <= MAX_BPM) {
        return bpm;
      }
    }
  } catch (e) {
    console.warn('Failed to load BPM from localStorage:', e);
  }
  return DEFAULT_BPM;
}

/**
 * 保存 BPM 到 localStorage
 */
function saveBPM(bpm: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(bpm));
  } catch (e) {
    console.warn('Failed to save BPM to localStorage:', e);
  }
}

/**
 * 限制 BPM 在有效范围内
 */
function clampBPM(bpm: number): number {
  return Math.max(MIN_BPM, Math.min(MAX_BPM, bpm));
}

export function useMetronome() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(DEFAULT_BPM); // 使用默认值避免 hydration mismatch
  const [currentBeat, setCurrentBeat] = useState(0); // 0 表示未开始，1-4 表示当前拍
  
  // 用于存储下一次节拍的调度时间和定时器
  const nextBeatTimeRef = useRef<number>(0);
  const schedulerIdRef = useRef<number | null>(null);

  /**
   * 在客户端加载保存的 BPM（仅在挂载后执行，避免 hydration mismatch）
   */
  useEffect(() => {
    const savedBPM = loadBPM();
    if (savedBPM !== DEFAULT_BPM) {
      setBpm(savedBPM);
    }
  }, []);

  /**
   * 初始化 AudioContext
   */
  const getAudioContext = useCallback((): AudioContext | null => {
    if (audioContextRef.current) {
      return audioContextRef.current;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioContextCtor = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextCtor() as AudioContext;
      audioContextRef.current = ctx;
      return ctx;
    } catch (e) {
      console.error('Failed to create AudioContext:', e);
      return null;
    }
  }, []);

  /**
   * 播放一次节拍音效
   * @param beatNumber 拍号（1-4）
   * @param time 播放时间（AudioContext.currentTime）
   */
  const playBeat = useCallback((beatNumber: number, time: number) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const isStrongBeat = beatNumber === 1;
    const frequency = isStrongBeat ? STRONG_BEAT_FREQ : WEAK_BEAT_FREQ;
    const gain = isStrongBeat ? STRONG_BEAT_GAIN : WEAK_BEAT_GAIN;
    const duration = isStrongBeat ? STRONG_BEAT_DURATION : WEAK_BEAT_DURATION;

    // 创建振荡器（音源）
    const oscillator = ctx.createOscillator();
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    // 创建增益节点（音量控制）
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(gain, time);
    // 音效结束时淡出，避免"咔嗒"声
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);

    // 连接节点：振荡器 -> 增益 -> 输出
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // 在指定时间播放
    oscillator.start(time);
    oscillator.stop(time + duration);
  }, [getAudioContext]);

  /**
   * 调度器：提前调度未来的节拍
   * 使用 Web Audio API 的精确时钟而非 setTimeout
   */
  const scheduler = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    // 调度窗口：提前 100ms 调度节拍
    const scheduleAheadTime = 0.1;
    const currentTime = ctx.currentTime;

    // 每拍的时间间隔（秒）
    const beatInterval = 60.0 / bpm;

    // 调度所有在窗口内的节拍
    while (nextBeatTimeRef.current < currentTime + scheduleAheadTime) {
      // 计算当前拍号（1-4 循环）
      const beat = ((nextBeatTimeRef.current === 0 ? 0 : Math.floor((nextBeatTimeRef.current - ctx.currentTime) / beatInterval)) % 4) + 1;
      
      // 如果是第一次调度，使用当前时间
      const scheduleTime = nextBeatTimeRef.current === 0 ? currentTime : nextBeatTimeRef.current;
      
      playBeat(beat, scheduleTime);
      
      // 在主线程更新 UI（稍微延迟以同步视觉效果）
      const delay = Math.max(0, (scheduleTime - currentTime) * 1000);
      setTimeout(() => {
        setCurrentBeat(beat);
      }, delay);

      // 计算下一拍的时间
      nextBeatTimeRef.current = nextBeatTimeRef.current === 0 
        ? currentTime + beatInterval 
        : nextBeatTimeRef.current + beatInterval;
    }
  }, [bpm, playBeat]);

  /**
   * 启动节拍器
   */
  const start = useCallback(async () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    // 恢复 AudioContext（浏览器可能自动暂停）
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // 重置调度器
    nextBeatTimeRef.current = 0;
    setCurrentBeat(0);
    setIsPlaying(true);

    // 立即调度第一批节拍
    scheduler();

    // 每 25ms 检查一次是否需要调度新的节拍
    const id = window.setInterval(() => {
      scheduler();
    }, 25);

    schedulerIdRef.current = id;
  }, [getAudioContext, scheduler]);

  /**
   * 停止节拍器
   */
  const stop = useCallback(() => {
    setIsPlaying(false);
    setCurrentBeat(0);
    nextBeatTimeRef.current = 0;

    if (schedulerIdRef.current !== null) {
      clearInterval(schedulerIdRef.current);
      schedulerIdRef.current = null;
    }
  }, []);

  /**
   * 切换播放/停止状态
   */
  const toggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  }, [isPlaying, start, stop]);

  /**
   * 设置 BPM（带验证和持久化）
   */
  const updateBPM = useCallback((newBPM: number) => {
    const clampedBPM = clampBPM(newBPM);
    setBpm(clampedBPM);
    saveBPM(clampedBPM);
    
    // 如果正在播放，BPM 变化会在下一次调度时生效（无需重启）
  }, []);

  /**
   * 组件卸载时清理资源
   */
  useEffect(() => {
    return () => {
      if (schedulerIdRef.current !== null) {
        clearInterval(schedulerIdRef.current);
      }
      // AudioContext 保持活跃，因为可能被其他组件（如 useAudio）共享
    };
  }, []);

  return {
    isPlaying,
    bpm,
    currentBeat,
    start,
    stop,
    toggle,
    updateBPM,
    minBPM: MIN_BPM,
    maxBPM: MAX_BPM,
  };
}

