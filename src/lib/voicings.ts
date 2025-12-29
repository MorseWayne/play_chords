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
  maxFret?: number;
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

function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

function rootFretsForString(openMidi: number, rootChroma: number, maxFret: number): number[] {
  const openChroma = mod12(openMidi);
  const base = mod12(rootChroma - openChroma); // 0..11
  const frets: number[] = [];
  for (let f = base; f <= maxFret; f += 12) {
    if (f > 0) frets.push(f); // barre implies non-open
  }
  return frets;
}

// Calculate finger positions and barres for a chord shape
function calculateFingering(frets: number[]): { fingers: number[]; barres: number[]; baseFret: number } {
  const fingers = new Array(6).fill(0);
  const positiveFrets = frets.map((f, i) => ({ fret: f, string: i })).filter(x => x.fret > 0);
  
  if (positiveFrets.length === 0) {
    return { fingers, barres: [], baseFret: 1 };
  }
  
  const minFret = Math.min(...positiveFrets.map(x => x.fret));
  const baseFret = minFret;
  
  // Count strings at each fret position
  const fretCounts = new Map<number, number[]>();
  positiveFrets.forEach(({ fret, string }) => {
    if (!fretCounts.has(fret)) fretCounts.set(fret, []);
    fretCounts.get(fret)!.push(string);
  });
  
  // Detect barres: a fret that has multiple consecutive strings pressed
  const barres: number[] = [];
  fretCounts.forEach((strings, fret) => {
    if (strings.length >= 2 && fret === minFret) {
      const sorted = strings.sort((a, b) => a - b);
      // Check if strings are consecutive or span a range
      if (sorted[sorted.length - 1] - sorted[0] >= 1) {
        barres.push(fret);
      }
    }
  });
  
  // Simple finger assignment algorithm
  // Finger 1 is for barre or lowest fret
  // Fingers 2-4 for other notes
  
  let nextFinger = barres.length > 0 ? 2 : 1;
  
  // Sort by fret, then by string (high to low)
  const sortedNotes = [...positiveFrets].sort((a, b) => {
    if (a.fret !== b.fret) return a.fret - b.fret;
    return b.string - a.string; // higher strings first
  });
  
  const usedFingers = new Map<number, number>(); // fret -> finger
  
  for (const { fret, string } of sortedNotes) {
    // Skip strings that are part of barre
    if (barres.includes(fret)) {
      fingers[string] = 1;
      continue;
    }
    
    // Check if we already assigned a finger to this fret
    if (usedFingers.has(fret)) {
      fingers[string] = usedFingers.get(fret)!;
    } else {
      // Assign next available finger
      const finger = Math.min(nextFinger, 4);
      fingers[string] = finger;
      usedFingers.set(fret, finger);
      nextFinger++;
    }
  }
  
  return { fingers, barres, baseFret };
}

function toChordPosition(frets: number[]): ChordPosition {
  const midi = frets
    .map((f, s) => (f >= 0 ? STANDARD_TUNING_MIDI[s] + f : null))
    .filter((m): m is number => m !== null);
  const midiSorted = midi.slice().sort((a, b) => a - b);
  
  const { fingers, barres, baseFret } = calculateFingering(frets);
  
  return {
    frets,
    fingers,
    baseFret,
    barres,
    midi: uniqSorted(midiSorted),
  };
}

function generateCommonBarreVoicings(key: string, suffix: string, maxFret: number): ChordPosition[] {
  const rootChroma = Note.chroma(key);
  if (rootChroma < 0) return [];

  const tonalSuffix = suffixToTonalSymbol(suffix);
  const chord = Chord.get(`${key}${tonalSuffix}`);
  if (chord.empty) return [];

  const supported = new Set(['', 'm', 'dim', 'aug', '5','7', 'm7', 'maj7', 'sus4', 'sus2']);
  if (!supported.has(tonalSuffix)) return [];

  const positions: ChordPosition[] = [];

  // E-shape (root on low E string)
  // Major:  [f, f+2, f+2, f+1, f, f]
  // Minor:  [f, f+2, f+2, f,   f, f]
  // 7:      [f, f+2, f,   f+1, f, f]
  // m7:     [f, f+2, f,   f,   f, f]
  // maj7:   [f, f+2, f+1, f+1, f, f]
  // sus4:   [f, f+2, f+2, f+2, f, f]
  // sus2:   [f, f+2, f+4, f+4, f, f] (common alt; still playable)
  const eRoots = rootFretsForString(STANDARD_TUNING_MIDI[0], rootChroma, maxFret);
  for (const f of eRoots) {
    const shape = (() => {
      switch (tonalSuffix) {
        case '':
          return [f, f + 2, f + 2, f + 1, f, f];
        case 'm':
          return [f, f + 2, f + 2, f, f, f];
        case 'dim':
          return [f, f + 1, f + 2, f, -1, -1];
        case 'aug':
          return [f, f + 3, f + 2, f + 1, -1, -1];
        case '5':
          return [f, f + 2, f + 2, -1, -1, -1];
        case '7':
          return [f, f + 2, f, f + 1, f, f];
        case 'm7':
          return [f, f + 2, f, f, f, f];
        case 'maj7':
          return [f, f + 2, f + 1, f + 1, f, f];
        case 'sus4':
          return [f, f + 2, f + 2, f + 2, f, f];
        case 'sus2':
          return [f, f + 2, f + 4, f + 4, f, f];
        default:
          return null;
      }
    })();
    if (!shape) continue;
    if (shape.some((x) => x > maxFret)) continue;
    positions.push(toChordPosition(shape));
  }

  // A-shape (root on A string)
  // Major: [-1, f, f+2, f+2, f+2, f]
  // Minor: [-1, f, f+2, f+2, f+1, f]
  // 7:     [-1, f, f+2, f,   f+2, f]
  // m7:    [-1, f, f+2, f,   f+1, f]
  // maj7:  [-1, f, f+2, f+1, f+2, f]
  // sus4:  [-1, f, f+2, f+2, f+3, f]
  // sus2:  [-1, f, f+2, f+2, f,   f]
  const aRoots = rootFretsForString(STANDARD_TUNING_MIDI[1], rootChroma, maxFret);
  for (const f of aRoots) {
    const shape = (() => {
      switch (tonalSuffix) {
        case '':
          return [-1, f, f + 2, f + 2, f + 2, f];
        case 'm':
          return [-1, f, f + 2, f + 2, f + 1, f];
        case 'dim':
          return [-1, f, f + 1, f + 2, f + 1, -1];
        case 'aug':
          return [-1, f, f + 3, f + 2, f + 2, -1];
        case '5':
          return [-1, f, f + 2, f + 2, -1, -1];
        case '7':
          return [-1, f, f + 2, f, f + 2, f];
        case 'm7':
          return [-1, f, f + 2, f, f + 1, f];
        case 'maj7':
          return [-1, f, f + 2, f + 1, f + 2, f];
        case 'sus4':
          return [-1, f, f + 2, f + 2, f + 3, f];
        case 'sus2':
          return [-1, f, f + 2, f + 2, f, f];
        default:
          return null;
      }
    })();
    if (!shape) continue;
    if (shape.some((x) => x > maxFret)) continue;
    // Avoid the very low A-shape at f=1 that collides with open-ish shapes; keep but score will decide.
    positions.push(toChordPosition(shape));
  }

  // De-dupe by fret pattern
  const seen = new Set<string>();
  return positions.filter((p) => {
    const k = p.frets.join(',');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
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

  // Detect barre-like shape (many strings on the same fret and no open strings)
  const minPos = positiveFrets.length ? Math.min(...positiveFrets) : 0;
  const barreCount = frets.filter((f) => f === minPos).length;
  const barreLike = minPos > 0 && barreCount >= 3 && opens === 0;

  // Strongly prefer low position & compact, few mutes, no weird gaps.
  // Also prefer root in bass.
  const score =
    span * 10 +
    gaps * 12 +
    mutes * 10 +
    avgFret * 1.2 +
    maxFretUsed * 0.6 +
    (maxFretUsed > 7 ? 14 : 0) +
    (maxFretUsed > 10 ? 28 : 0) +
    (bassIsRoot ? 0 : 18) +
    opens * -2 +
    (barreLike ? -10 : 0);

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

  return deduped.map((r) => {
    const { fingers, barres, baseFret } = calculateFingering(r.frets);
    return {
      frets: r.frets,
      fingers,
      baseFret,
      barres,
      midi: r.midi,
    };
  });
}

export function pickPracticalVoicings(
  key: string,
  suffix: string,
  fromDb: ChordPosition[] = [],
  generated: ChordPosition[] = [],
  options: PickPracticalOptions = {},
): ChordPosition[] {
  const limit = options.limit ?? 10;
  const maxFret = options.maxFret ?? 15;

  const chordSymbol = `${key}${suffixToTonalSymbol(suffix)}`;
  const chord = Chord.get(chordSymbol);
  if (chord.empty) return fromDb.slice(0, limit);

  const chordChromas = new Set<number>((chord.notes ?? []).map((n) => Note.chroma(n)).filter((c) => c >= 0));
  const rootChroma = Note.chroma(key);
  const minSoundingStrings =
    chordChromas.size <= 2 ? 2 : chordChromas.size >= 4 ? 4 : 3;

  type Scored = { pos: ChordPosition; score: number; src: 'db' | 'gen' };
  const scored: Scored[] = [];

  const add = (pos: ChordPosition, src: 'db' | 'gen', bonus = 0) => {
    const score = practicalScore({
      frets: pos.frets,
      chordChromas,
      rootChroma,
      minSoundingStrings,
    });
    if (!Number.isFinite(score)) return;
    // Prefer DB shapes slightly when scores are close
    scored.push({ pos, score: score + (src === 'db' ? -6 : 0) + bonus, src });
  };

  const barre = generateCommonBarreVoicings(key, suffix, maxFret);

  fromDb.forEach((p) => add(p, 'db'));
  // Strongly prefer classic barre shapes when they exist
  barre.forEach((p) => add(p, 'gen', -8));
  generated.forEach((p) => add(p, 'gen'));

  const seen = new Set<string>();
  const sorted = scored
    .sort((a, b) => a.score - b.score)
    .filter((s) => {
      const k = s.pos.frets.join(',');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  // Bucket selection: ensure we keep some higher-position barres if available
  const low: ChordPosition[] = [];
  const mid: ChordPosition[] = [];
  const high: ChordPosition[] = [];

  for (const s of sorted) {
    const maxFretUsed = Math.max(...s.pos.frets.filter((f) => f > 0), 0);
    if (maxFretUsed <= 4) low.push(s.pos);
    else if (maxFretUsed <= 8) mid.push(s.pos);
    else high.push(s.pos);
  }

  const pick: ChordPosition[] = [];
  const quotaLow = Math.min(4, limit);
  const quotaMid = Math.min(3, Math.max(0, limit - quotaLow));
  const quotaHigh = Math.max(0, limit - quotaLow - quotaMid);

  pick.push(...low.slice(0, quotaLow));
  pick.push(...mid.slice(0, quotaMid));
  pick.push(...high.slice(0, quotaHigh));

  if (pick.length < limit) {
    const rest = [...low.slice(quotaLow), ...mid.slice(quotaMid), ...high.slice(quotaHigh)];
    for (const p of rest) {
      if (pick.length >= limit) break;
      // de-dupe again
      if (!pick.find((x) => x.frets.join(',') === p.frets.join(','))) pick.push(p);
    }
  }

  return pick.slice(0, limit);
}


