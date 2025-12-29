import { Chord, Note } from '@tonaljs/tonal';
import type { ChordPosition } from '@/lib/chords';

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

// Standard tuning MIDI notes for strings (low -> high): E2 A2 D3 G3 B3 E4
const STANDARD_TUNING_MIDI = [40, 45, 50, 55, 59, 64];

function midiToPitchClass(midi: number): string {
  const pc = PITCH_CLASSES[((midi % 12) + 12) % 12];
  return pc;
}

function suffixToTonalSymbol(suffix: string): string {
  // Map our suffix keys to a Tonal chord symbol suffix
  // major: ''  minor: 'm'
  // Others: keep as-is for common types
  if (suffix === 'major') return '';
  if (suffix === 'minor') return 'm';
  return suffix;
}

function uniqSorted(nums: number[]): number[] {
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

export interface GenerateVoicingsOptions {
  maxFret?: number; // inclusive
  maxSpan?: number; // max fret span (excluding open strings)
  maxResults?: number;
}

export interface PickPracticalOptions {
  limit?: number;
}

function countGapsBetweenSoundingStrings(fretsLowToHigh: number[]): number {
  // Penalize shapes like: sounding, mute, sounding (gaps in middle strings)
  let started = false;
  let lastWasSounding = false;
  let gaps = 0;
  for (const f of fretsLowToHigh) {
    const sounding = f >= 0;
    if (sounding) {
      if (started && !lastWasSounding) gaps += 1;
      started = true;
      lastWasSounding = true;
    } else if (started) {
      lastWasSounding = false;
    }
  }
  return gaps;
}

function practicalScore(params: {
  frets: number[];
  chordChromas: Set<number>;
  rootChroma: number;
  minSoundingStrings: number;
}): number {
  const { frets, chordChromas, rootChroma, minSoundingStrings } = params;
  const midi: number[] = [];
  const chromasUsed = new Set<number>();
  let sounding = 0;
  let minF = Infinity;
  let maxF = -Infinity;
  let mutes = 0;
  let opens = 0;

  for (let s = 0; s < 6; s += 1) {
    const f = frets[s];
    if (f >= 0) {
      sounding += 1;
      if (f === 0) opens += 1;
      const m = STANDARD_TUNING_MIDI[s] + f;
      midi.push(m);
      chromasUsed.add(m % 12);
      if (f > 0) {
        minF = Math.min(minF, f);
        maxF = Math.max(maxF, f);
      }
    } else {
      mutes += 1;
    }
  }

  if (sounding < minSoundingStrings) return Infinity;

  const span = minF === Infinity ? 0 : maxF - minF;
  const missing = Array.from(chordChromas).filter((c) => !chromasUsed.has(c)).length;

  // Require root somewhere (practical in most contexts)
  if (rootChroma >= 0 && !chromasUsed.has(rootChroma)) return Infinity;

  // For 4-note chords, allow missing 1; otherwise require full coverage (triads/power chords)
  if (chordChromas.size >= 4) {
    if (missing > 1) return Infinity;
  } else if (missing > 0) {
    return Infinity;
  }

  const midiSorted = midi.slice().sort((a, b) => a - b);
  const bassMidi = midiSorted[0];
  const bassIsRoot = rootChroma >= 0 ? bassMidi % 12 === rootChroma : true;

  const positiveFrets = frets.filter((f) => f > 0);
  const avgFret = positiveFrets.length ? positiveFrets.reduce((a, b) => a + b, 0) / positiveFrets.length : 0;
  const maxFretUsed = positiveFrets.length ? Math.max(...positiveFrets) : 0;

  const gaps = countGapsBetweenSoundingStrings(frets);

  // Strongly prefer low position & compact, few mutes, no weird gaps.
  // Also prefer root in bass.
  const score =
    span * 10 +
    gaps * 12 +
    mutes * 10 +
    avgFret * 1.2 +
    maxFretUsed * 0.8 +
    (maxFretUsed > 7 ? 30 : 0) +
    (maxFretUsed > 10 ? 60 : 0) +
    (bassIsRoot ? 0 : 18) +
    opens * -2;

  return score;
}

export function generateGuitarVoicings(
  key: string,
  suffix: string,
  options: GenerateVoicingsOptions = {},
): ChordPosition[] {
  const maxFret = options.maxFret ?? 12;
  const maxSpan = options.maxSpan ?? 5;
  const maxResults = options.maxResults ?? 30;

  const chordSymbol = `${key}${suffixToTonalSymbol(suffix)}`;
  const chord = Chord.get(chordSymbol);
  if (chord.empty) return [];

  const chordChromas = new Set<number>((chord.notes ?? []).map((n) => Note.chroma(n)).filter((c) => c >= 0));
  const rootChroma = Note.chroma(key);

  // Practical: prefer fuller grips
  const minSoundingStrings =
    chordChromas.size <= 2 ? 2 : chordChromas.size >= 4 ? 4 : 3;

  // Candidate frets per string (excluding mute which we'll add separately)
  const candidatesByString: number[][] = STANDARD_TUNING_MIDI.map((openMidi) => {
    const frets: number[] = [];
    for (let f = 0; f <= maxFret; f += 1) {
      const chroma = (openMidi + f) % 12;
      if (chordChromas.has(chroma)) frets.push(f);
    }
    // Prefer smaller frets early (for pruning/score)
    return frets;
  });

  type Candidate = {
    frets: number[]; // length 6, low->high
    midi: number[];
    score: number;
  };

  const results: Candidate[] = [];

  const frets: number[] = new Array(6).fill(-1);

  function pushResult() {
    const midi: number[] = [];
    const chromasUsed = new Set<number>();
    let sounding = 0;
    let minF = Infinity;
    let maxF = -Infinity;

    for (let s = 0; s < 6; s += 1) {
      const f = frets[s];
      if (f >= 0) {
        sounding += 1;
        const m = STANDARD_TUNING_MIDI[s] + f;
        midi.push(m);
        chromasUsed.add(m % 12);
        if (f > 0) {
          minF = Math.min(minF, f);
          maxF = Math.max(maxF, f);
        }
      }
    }

    if (sounding < minSoundingStrings) return;

    // Compute span ignoring open strings
    const span = minF === Infinity ? 0 : maxF - minF;
    if (span > maxSpan) return;

    const midiSorted = midi.slice().sort((a, b) => a - b);

    const score = practicalScore({
      frets: frets.slice(),
      chordChromas,
      rootChroma,
      minSoundingStrings,
    });
    if (!Number.isFinite(score)) return;

    results.push({
      frets: frets.slice(),
      midi: uniqSorted(midiSorted),
      score,
    });
  }

  function backtrack(stringIndex: number, sounding: number, minF: number, maxF: number) {
    if (stringIndex === 6) {
      pushResult();
      return;
    }

    // Option 1: mute
    frets[stringIndex] = -1;
    backtrack(stringIndex + 1, sounding, minF, maxF);

    const candidates = candidatesByString[stringIndex];
    for (const f of candidates) {
      frets[stringIndex] = f;
      const nextSounding = sounding + 1;
      let nextMinF = minF;
      let nextMaxF = maxF;
      if (f > 0) {
        nextMinF = Math.min(nextMinF, f);
        nextMaxF = Math.max(nextMaxF, f);
        if (nextMinF !== Infinity && nextMaxF - nextMinF > maxSpan) continue;
      }

      // Simple pruning: don't allow too many muted strings if we want "full" voicings.
      // (still allows, but reduces explosion)
      if (nextSounding > 6) continue;
      backtrack(stringIndex + 1, nextSounding, nextMinF, nextMaxF);
    }
  }

  backtrack(0, 0, Infinity, -Infinity);

  // De-duplicate by fret pattern
  const seen = new Set<string>();
  const deduped = results
    .sort((a, b) => a.score - b.score)
    .filter((r) => {
      const key = r.frets.join(',');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxResults);

  return deduped.map((r) => ({
    frets: r.frets,
    fingers: new Array(6).fill(0),
    baseFret: 1,
    barres: [],
    midi: r.midi,
  }));
}

export function pickPracticalVoicings(
  key: string,
  suffix: string,
  fromDb: ChordPosition[] = [],
  generated: ChordPosition[] = [],
  options: PickPracticalOptions = {},
): ChordPosition[] {
  const limit = options.limit ?? 10;

  const chordSymbol = `${key}${suffixToTonalSymbol(suffix)}`;
  const chord = Chord.get(chordSymbol);
  if (chord.empty) return fromDb.slice(0, limit);

  const chordChromas = new Set<number>((chord.notes ?? []).map((n) => Note.chroma(n)).filter((c) => c >= 0));
  const rootChroma = Note.chroma(key);
  const minSoundingStrings =
    chordChromas.size <= 2 ? 2 : chordChromas.size >= 4 ? 4 : 3;

  type Scored = { pos: ChordPosition; score: number; src: 'db' | 'gen' };
  const scored: Scored[] = [];

  const add = (pos: ChordPosition, src: 'db' | 'gen') => {
    const score = practicalScore({
      frets: pos.frets,
      chordChromas,
      rootChroma,
      minSoundingStrings,
    });
    if (!Number.isFinite(score)) return;
    // Prefer DB shapes slightly when scores are close
    scored.push({ pos, score: score + (src === 'db' ? -6 : 0), src });
  };

  fromDb.forEach((p) => add(p, 'db'));
  generated.forEach((p) => add(p, 'gen'));

  const seen = new Set<string>();
  return scored
    .sort((a, b) => a.score - b.score)
    .filter((s) => {
      const k = s.pos.frets.join(',');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, limit)
    .map((s) => s.pos);
}


