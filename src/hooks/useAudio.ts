import { useCallback, useRef, useState } from 'react';
import Soundfont from 'soundfont-player';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

type SoundfontInstrument = Awaited<ReturnType<typeof Soundfont.instrument>>;

const SOUNDFONT_NAME = 'MusyngKite';
const SOUNDFONT_FORMAT: 'mp3' | 'ogg' = 'mp3';
const INSTRUMENT_NAME = 'acoustic_guitar_steel';

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

function localNameToUrl(name: string, sf?: string, format?: string): string {
  const realSf = sf === 'FluidR3_GM' ? sf : SOUNDFONT_NAME;
  const realFormat = format === 'ogg' ? 'ogg' : SOUNDFONT_FORMAT;
  return `/soundfonts/${realSf}/${name}-${realFormat}.js`;
}

export function useAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const instrumentRef = useRef<SoundfontInstrument | null>(null);
  const [state, setState] = useState<LoadState>('idle');

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

      // Prefer local SoundFont under /public/soundfonts/... (works offline), fallback to CDN if needed.
      let instrument: SoundfontInstrument | null = null;
      try {
        instrument = await Soundfont.instrument(ctx, INSTRUMENT_NAME, {
          soundfont: SOUNDFONT_NAME,
          format: SOUNDFONT_FORMAT,
          nameToUrl: localNameToUrl,
          gain: 0.9,
        });
      } catch {
        instrument = await Soundfont.instrument(ctx, INSTRUMENT_NAME, {
          soundfont: SOUNDFONT_NAME,
          format: SOUNDFONT_FORMAT,
          gain: 0.9,
        });
      }

      instrumentRef.current = instrument;
      setState('ready');
    } catch (e) {
      console.error('Failed to init SoundFont guitar', e);
      setState('error');
    }
  }, [state]);

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
        instrument.play(note, now + index * 0.04, { duration: 2.2, gain: 0.9 });
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
        instrument.play(note, now + index * 0.22, { duration: 1.6, gain: 0.85 });
      });
    },
    [initAudio],
  );

  return {
    playStrum,
    playArpeggio,
    initAudio,
    state,
    isReady: state === 'ready',
  };
}

