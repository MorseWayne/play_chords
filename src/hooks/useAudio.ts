import { useCallback, useRef, useState } from 'react';
import Soundfont from 'soundfont-player';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

type SoundfontInstrument = Awaited<ReturnType<typeof Soundfont.instrument>>;

const SOUNDFONT_NAME = 'MusyngKite';
const SOUNDFONT_FORMAT: 'mp3' | 'ogg' = 'mp3';
const INSTRUMENT_NAME = 'acoustic_guitar_steel';

// 音量控制常量
const STORAGE_KEY_VOLUME = 'audio-volume';
const DEFAULT_VOLUME = 70;
const MIN_VOLUME = 0;
const MAX_VOLUME = 100;

function midiToNoteName(midi: number): string {
  // MIDI: 60 -> C4
  const pitchClasses = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const pc = pitchClasses[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${pc}${octave}`;
}

function uniqSorted(nums: number[]): number[] {
  return Array.from(new Set(nums.filter((n) => Number.isFinite(n)))).sort((a, b) => a - b);
}

/**
 * 从 localStorage 读取保存的音量
 */
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

/**
 * 保存音量到 localStorage
 */
function saveVolume(volume: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_VOLUME, String(volume));
  } catch (e) {
    console.warn('Failed to save volume to localStorage:', e);
  }
}

/**
 * 限制音量在有效范围内
 */
function clampVolume(volume: number): number {
  return Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, volume));
}

function localNameToUrl(name: string, sf?: string, format?: string): string {
  const realSf = sf === 'FluidR3_GM' ? sf : SOUNDFONT_NAME;
  const realFormat = format === 'ogg' ? 'ogg' : SOUNDFONT_FORMAT;
  return `/soundfonts/${realSf}/${name}-${realFormat}.js`;
}

export function useAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const instrumentRef = useRef<SoundfontInstrument | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const [state, setState] = useState<LoadState>('idle');
  const [volume, setVolume] = useState(() => loadVolume());

  const initAudio = useCallback(async () => {
    if (instrumentRef.current) return;
    if (state === 'loading') return;

    setState('loading');
    try {
      const AudioContextCtor =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = audioContextRef.current ?? new AudioContextCtor();
      audioContextRef.current = ctx;

      if (ctx.state !== 'running') {
        await ctx.resume();
      }

      // 创建主音量节点
      if (!gainNodeRef.current) {
        const gainNode = ctx.createGain();
        gainNode.connect(ctx.destination);
        gainNode.gain.value = volume / 100;
        gainNodeRef.current = gainNode;
      }

      // Prefer local SoundFont under /public/soundfonts/... (works offline), fallback to CDN if needed.
      let instrument: SoundfontInstrument | null = null;
      try {
        instrument = await Soundfont.instrument(ctx, INSTRUMENT_NAME, {
          soundfont: SOUNDFONT_NAME,
          format: SOUNDFONT_FORMAT,
          nameToUrl: localNameToUrl,
          gain: 0.9,
          destination: gainNodeRef.current,
        });
      } catch {
        instrument = await Soundfont.instrument(ctx, INSTRUMENT_NAME, {
          soundfont: SOUNDFONT_NAME,
          format: SOUNDFONT_FORMAT,
          gain: 0.9,
          destination: gainNodeRef.current,
        });
      }

      instrumentRef.current = instrument;
      setState('ready');
    } catch (e) {
      console.error('Failed to init SoundFont guitar', e);
      setState('error');
    }
  }, [state, volume]);

  const playStrum = useCallback(
    async (midiNotes: number[]) => {
      await initAudio();
      const instrument = instrumentRef.current;
      const ctx = audioContextRef.current;
      if (!instrument || !ctx) return;

      const notes = uniqSorted(midiNotes).map(midiToNoteName);
      const now = ctx.currentTime;
      // Low -> high strum
      notes.forEach((note, index) => {
        instrument.play(note, now + index * 0.04, { duration: 2.2 });
      });
    },
    [initAudio],
  );

  const playArpeggio = useCallback(
    async (midiNotes: number[]) => {
      await initAudio();
      const instrument = instrumentRef.current;
      const ctx = audioContextRef.current;
      if (!instrument || !ctx) return;

      const notes = uniqSorted(midiNotes).map(midiToNoteName);
      const now = ctx.currentTime;
      notes.forEach((note, index) => {
        instrument.play(note, now + index * 0.22, { duration: 1.6 });
      });
    },
    [initAudio],
  );

  /**
   * 设置音量（带验证和持久化）
   */
  const updateVolume = useCallback((newVolume: number) => {
    const clampedVolume = clampVolume(newVolume);
    setVolume(clampedVolume);
    saveVolume(clampedVolume);
    
    // 立即更新主音量节点
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = clampedVolume / 100;
    }
  }, []);

  return {
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
}

