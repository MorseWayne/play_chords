import { useCallback, useEffect, useRef, useState } from 'react';

// 存储键
const STORAGE_KEYS = {
  bpm: 'metronome-bpm',
  timeSignature: 'metronome-time-signature',
  volume: 'metronome-volume',
};

// 默认值
const DEFAULT_BPM = 120;
const MIN_BPM = 40;
const MAX_BPM = 240;
const DEFAULT_TIME_SIGNATURE = '4/4' as TimeSignature;
const DEFAULT_VOLUME = 70;
const MIN_VOLUME = 0;
const MAX_VOLUME = 100;

// 强拍和弱拍的频率（Hz）和增益
const STRONG_BEAT_FREQ = 800;
const WEAK_BEAT_FREQ = 600;
const STRONG_BEAT_GAIN = 0.7;
const WEAK_BEAT_GAIN = 0.5;

// 音效持续时间（秒）
const STRONG_BEAT_DURATION = 0.05;
const WEAK_BEAT_DURATION = 0.03;

// 拍号类型定义
export type TimeSignature = '4/4' | '3/4' | '6/8' | '2/4';

// 拍号配置
interface TimeSignatureConfig {
  beats: number;           // 总拍数
  strongBeats: number[];   // 强拍位置（1-based）
  label: string;           // 显示名称
  description: string;     // 音乐风格说明
}

// 拍号配置映射
export const TIME_SIGNATURES: Record<TimeSignature, TimeSignatureConfig> = {
  '4/4': {
    beats: 4,
    strongBeats: [1],
    label: '4/4 拍',
    description: '通用拍（摇滚、流行）',
  },
  '3/4': {
    beats: 3,
    strongBeats: [1],
    label: '3/4 拍',
    description: '华尔兹、圆舞曲',
  },
  '6/8': {
    beats: 6,
    strongBeats: [1, 4],
    label: '6/8 拍',
    description: '行进曲、民谣',
  },
  '2/4': {
    beats: 2,
    strongBeats: [1],
    label: '2/4 拍',
    description: '进行曲、波尔卡',
  },
};

/**
 * 从 localStorage 读取保存的 BPM
 */
function loadBPM(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.bpm);
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
 * 从 localStorage 读取保存的拍号
 */
function loadTimeSignature(): TimeSignature {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.timeSignature);
    if (stored && stored in TIME_SIGNATURES) {
      return stored as TimeSignature;
    }
  } catch (e) {
    console.warn('Failed to load time signature from localStorage:', e);
  }
  return DEFAULT_TIME_SIGNATURE;
}

/**
 * 从 localStorage 读取保存的音量
 */
function loadVolume(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.volume);
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

/**
 * 保存 BPM 到 localStorage
 */
function saveBPM(bpm: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.bpm, String(bpm));
  } catch (e) {
    console.warn('Failed to save BPM to localStorage:', e);
  }
}

/**
 * 保存拍号到 localStorage
 */
function saveTimeSignature(timeSignature: TimeSignature): void {
  try {
    localStorage.setItem(STORAGE_KEYS.timeSignature, timeSignature);
  } catch (e) {
    console.warn('Failed to save time signature to localStorage:', e);
  }
}

/**
 * 保存音量到 localStorage
 */
function saveVolume(volume: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.volume, String(volume));
  } catch (e) {
    console.warn('Failed to save volume to localStorage:', e);
  }
}

/**
 * 限制数值在有效范围内
 */
function clampBPM(bpm: number): number {
  return Math.max(MIN_BPM, Math.min(MAX_BPM, bpm));
}

function clampVolume(volume: number): number {
  return Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, volume));
}

export function useMetronome() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const metronomeGainNodeRef = useRef<GainNode | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  // 使用默认值初始化，避免 hydration 错误
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>(DEFAULT_TIME_SIGNATURE);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [currentBeat, setCurrentBeat] = useState(0); // 0 表示未开始，1-N 表示当前拍
  
  // 用于存储下一次节拍的调度时间和定时器
  const nextBeatTimeRef = useRef<number>(0);
  const schedulerIdRef = useRef<number | null>(null);
  const beatCountRef = useRef<number>(0); // 追踪已播放的拍数
  
  // 客户端首次加载时从 localStorage 恢复状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBpm(loadBPM());
      setTimeSignature(loadTimeSignature());
      setVolume(loadVolume());
    }
  }, []);

  /**
   * 初始化 AudioContext 和主音量节点
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
      
      // 创建节拍器主音量节点
      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
      metronomeGainNodeRef.current = gainNode;
      
      return ctx;
    } catch (e) {
      console.error('Failed to create AudioContext:', e);
      return null;
    }
  }, []);

  /**
   * 播放一次节拍音效
   * @param beatNumber 拍号（1-N，N 为当前拍号的总拍数）
   * @param time 播放时间（AudioContext.currentTime）
   */
  const playBeat = useCallback((beatNumber: number, time: number) => {
    const ctx = getAudioContext();
    const masterGainNode = metronomeGainNodeRef.current;
    if (!ctx || !masterGainNode) return;

    // 获取当前拍号配置
    const config = TIME_SIGNATURES[timeSignature];
    const isStrongBeat = config.strongBeats.includes(beatNumber);
    
    const frequency = isStrongBeat ? STRONG_BEAT_FREQ : WEAK_BEAT_FREQ;
    const gain = isStrongBeat ? STRONG_BEAT_GAIN : WEAK_BEAT_GAIN;
    const duration = isStrongBeat ? STRONG_BEAT_DURATION : WEAK_BEAT_DURATION;

    // 创建振荡器（音源）
    const oscillator = ctx.createOscillator();
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    // 创建音效增益节点（强拍/弱拍音量）
    const beatGainNode = ctx.createGain();
    beatGainNode.gain.setValueAtTime(gain, time);
    // 音效结束时淡出，避免"咔嗒"声
    beatGainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);

    // 更新主音量节点（用户音量控制，0-100 映射到 0.0-1.0）
    masterGainNode.gain.value = volume / 100;

    // 连接节点：振荡器 -> 音效增益 -> 主音量 -> 输出
    oscillator.connect(beatGainNode);
    beatGainNode.connect(masterGainNode);

    // 在指定时间播放
    oscillator.start(time);
    oscillator.stop(time + duration);
  }, [getAudioContext, timeSignature, volume]);

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

    // 获取当前拍号配置
    const config = TIME_SIGNATURES[timeSignature];
    const totalBeats = config.beats;

    // 调度所有在窗口内的节拍
    while (nextBeatTimeRef.current < currentTime + scheduleAheadTime) {
      // 如果是第一次调度，使用当前时间
      const scheduleTime = nextBeatTimeRef.current === 0 ? currentTime : nextBeatTimeRef.current;
      
      // 计算当前拍号（1-N 循环，N 为总拍数）
      const beat = (beatCountRef.current % totalBeats) + 1;
      
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
      
      beatCountRef.current++;
    }
  }, [bpm, timeSignature, playBeat]);

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
    beatCountRef.current = 0;
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
    beatCountRef.current = 0;

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
   * 设置拍号（带验证和持久化）
   */
  const updateTimeSignature = useCallback((newTimeSignature: TimeSignature) => {
    setTimeSignature(newTimeSignature);
    saveTimeSignature(newTimeSignature);
    
    // 如果正在播放，重置到新拍号的第 1 拍
    if (isPlaying) {
      stop();
      // 等待当前拍播放完成后再重启（避免中断）
      setTimeout(() => {
        start();
      }, 100);
    }
  }, [isPlaying, stop, start]);

  /**
   * 设置音量（带验证和持久化）
   */
  const updateVolume = useCallback((newVolume: number) => {
    const clampedVolume = clampVolume(newVolume);
    setVolume(clampedVolume);
    saveVolume(clampedVolume);
    
    // 立即更新主音量节点
    if (metronomeGainNodeRef.current) {
      metronomeGainNodeRef.current.gain.value = clampedVolume / 100;
    }
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
    timeSignature,
    volume,
    currentBeat,
    start,
    stop,
    toggle,
    updateBPM,
    updateTimeSignature,
    updateVolume,
    minBPM: MIN_BPM,
    maxBPM: MAX_BPM,
    minVolume: MIN_VOLUME,
    maxVolume: MAX_VOLUME,
    timeSignatureConfig: TIME_SIGNATURES[timeSignature],
  };
}

