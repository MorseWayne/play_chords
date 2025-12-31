import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface UseProgressionPlayerParams {
  length: number;
  bpm: number;
  beatsPerChord: number;
  loop: boolean;
  onStep?: (index: number) => void; // called when chord index changes (including start at 0)
}

export interface ProgressionPlayerState {
  isPlaying: boolean;
  currentIndex: number;
  beatInChord: number; // 1..beatsPerChord
}

function clampInt(n: number, min: number, max: number): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

export function useProgressionPlayer(params: UseProgressionPlayerParams) {
  const { length, bpm, beatsPerChord, loop, onStep } = params;

  const safeBpm = useMemo(() => clampInt(bpm, 40, 240), [bpm]);
  const safeBeatsPerChord = useMemo(() => clampInt(beatsPerChord, 1, 16), [beatsPerChord]);
  const safeLength = Math.max(0, Math.floor(length));

  const intervalRef = useRef<number | null>(null);

  const [state, setState] = useState<ProgressionPlayerState>({
    isPlaying: false,
    currentIndex: 0,
    beatInChord: 1,
  });

  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState((s) => ({ ...s, isPlaying: false, beatInChord: 1 }));
  }, []);

  const reset = useCallback(() => {
    setState((s) => ({ ...s, currentIndex: 0, beatInChord: 1 }));
    onStep?.(0);
  }, [onStep]);

  const next = useCallback(() => {
    setState((s) => {
      if (safeLength <= 0) return s;
      const nextIndex = s.currentIndex + 1;
      const wrapped = loop ? nextIndex % safeLength : Math.min(nextIndex, safeLength - 1);
      if (!loop && s.currentIndex === safeLength - 1) return s;
      onStep?.(wrapped);
      return { ...s, currentIndex: wrapped, beatInChord: 1 };
    });
  }, [loop, onStep, safeLength]);

  const prev = useCallback(() => {
    setState((s) => {
      if (safeLength <= 0) return s;
      const prevIndex = s.currentIndex - 1;
      const wrapped = loop ? (prevIndex + safeLength) % safeLength : Math.max(prevIndex, 0);
      if (!loop && s.currentIndex === 0) return s;
      onStep?.(wrapped);
      return { ...s, currentIndex: wrapped, beatInChord: 1 };
    });
  }, [loop, onStep, safeLength]);

  const start = useCallback(() => {
    if (safeLength <= 0) return;
    if (intervalRef.current !== null) return;

    // fire step for current index immediately on start
    setState((s) => {
      onStep?.(s.currentIndex);
      return { ...s, isPlaying: true, beatInChord: 1 };
    });

    const beatMs = Math.round((60_000 / safeBpm) * 1);
    intervalRef.current = window.setInterval(() => {
      setState((s) => {
        if (safeLength <= 0) return s;
        const nextBeat = s.beatInChord + 1;
        if (nextBeat <= safeBeatsPerChord) {
          return { ...s, beatInChord: nextBeat };
        }

        // advance chord
        const nextIndex = s.currentIndex + 1;
        const canAdvance = loop || nextIndex < safeLength;
        if (!canAdvance) {
          // stop at end
          if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return { ...s, isPlaying: false, beatInChord: 1, currentIndex: s.currentIndex };
        }
        const wrapped = loop ? nextIndex % safeLength : nextIndex;
        onStep?.(wrapped);
        return { ...s, currentIndex: wrapped, beatInChord: 1 };
      });
    }, beatMs);
  }, [loop, onStep, safeBpm, safeBeatsPerChord, safeLength]);

  const toggle = useCallback(() => {
    if (intervalRef.current !== null) stop();
    else start();
  }, [start, stop]);

  // restart timer when bpm/beatsPerChord/length changes while playing
  useEffect(() => {
    if (!state.isPlaying) return;
    stop();
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeBpm, safeBeatsPerChord, safeLength, loop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    ...state,
    safeBpm,
    safeBeatsPerChord,
    start,
    stop,
    toggle,
    next,
    prev,
    reset,
    setCurrentIndex: (idx: number) => {
      const v = clampInt(idx, 0, Math.max(0, safeLength - 1));
      setState((s) => ({ ...s, currentIndex: v, beatInChord: 1 }));
      onStep?.(v);
    },
  };
}

