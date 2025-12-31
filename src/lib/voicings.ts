import { Chord, Note } from '@tonaljs/tonal';
import type { ChordPosition } from '@/lib/chords';

// Standard tuning MIDI notes for strings (low -> high): E2 A2 D3 G3 B3 E4
const STANDARD_TUNING_MIDI = [40, 45, 50, 55, 59, 64];

// ============================================================
// 常见开放和弦数据库
// 这些是经过实践验证的经典开放和弦指法
// ============================================================

interface OpenChordEntry {
  key: string;
  suffix: string;  // 'major', 'minor', '7', 'm7', 'maj7', 'sus4', 'sus2', 'dim', 'aug', '5', '6'
  frets: number[];
}

// 开放和弦数据库 - 常见的开放和弦指法
const OPEN_CHORDS: OpenChordEntry[] = [
  // === C 系列 ===
  { key: 'C', suffix: 'major', frets: [-1, 3, 2, 0, 1, 0] },      // 经典 C
  { key: 'C', suffix: 'major', frets: [0, 3, 2, 0, 1, 0] },       // C 带低音 E
  { key: 'C', suffix: 'major', frets: [-1, 3, 2, 0, 1, 3] },      // C 高把位变体
  { key: 'C', suffix: 'minor', frets: [-1, 3, 1, 0, 1, 3] },      // Cm (需小横按)
  { key: 'C', suffix: '7', frets: [-1, 3, 2, 3, 1, 0] },          // C7
  { key: 'C', suffix: 'maj7', frets: [-1, 3, 2, 0, 0, 0] },       // Cmaj7
  { key: 'C', suffix: 'm7', frets: [-1, 3, 1, 3, 1, 3] },         // Cm7
  { key: 'C', suffix: 'sus4', frets: [-1, 3, 3, 0, 1, 1] },       // Csus4
  { key: 'C', suffix: 'sus2', frets: [-1, 3, 0, 0, 1, 0] },       // Csus2
  { key: 'C', suffix: '6', frets: [-1, 3, 2, 2, 1, 0] },          // C6
  { key: 'C', suffix: 'aug', frets: [-1, 3, 2, 1, 1, 0] },        // Caug
  { key: 'C', suffix: 'dim', frets: [-1, 3, 1, -1, 1, 2] },       // Cdim

  // === D 系列 ===
  { key: 'D', suffix: 'major', frets: [-1, -1, 0, 2, 3, 2] },     // 经典 D
  { key: 'D', suffix: 'major', frets: [-1, 0, 0, 2, 3, 2] },      // D 带低音 A
  { key: 'D', suffix: 'minor', frets: [-1, -1, 0, 2, 3, 1] },     // Dm
  { key: 'D', suffix: 'minor', frets: [-1, 0, 0, 2, 3, 1] },      // Dm 带低音 A
  { key: 'D', suffix: '7', frets: [-1, -1, 0, 2, 1, 2] },         // D7
  { key: 'D', suffix: 'maj7', frets: [-1, -1, 0, 2, 2, 2] },      // Dmaj7
  { key: 'D', suffix: 'm7', frets: [-1, -1, 0, 2, 1, 1] },        // Dm7
  { key: 'D', suffix: 'sus4', frets: [-1, -1, 0, 2, 3, 3] },      // Dsus4
  { key: 'D', suffix: 'sus2', frets: [-1, -1, 0, 2, 3, 0] },      // Dsus2
  { key: 'D', suffix: '6', frets: [-1, -1, 0, 2, 0, 2] },         // D6
  { key: 'D', suffix: 'aug', frets: [-1, -1, 0, 3, 3, 2] },       // Daug
  { key: 'D', suffix: 'dim', frets: [-1, -1, 0, 1, 3, 1] },       // Ddim

  // === E 系列 ===
  { key: 'E', suffix: 'major', frets: [0, 2, 2, 1, 0, 0] },       // 经典 E
  { key: 'E', suffix: 'minor', frets: [0, 2, 2, 0, 0, 0] },       // Em
  { key: 'E', suffix: 'minor', frets: [0, 2, 2, 0, 3, 0] },       // Em 变体
  { key: 'E', suffix: '7', frets: [0, 2, 0, 1, 0, 0] },           // E7
  { key: 'E', suffix: '7', frets: [0, 2, 2, 1, 3, 0] },           // E7 变体
  { key: 'E', suffix: 'maj7', frets: [0, 2, 1, 1, 0, 0] },        // Emaj7
  { key: 'E', suffix: 'm7', frets: [0, 2, 0, 0, 0, 0] },          // Em7
  { key: 'E', suffix: 'm7', frets: [0, 2, 2, 0, 3, 0] },          // Em7 变体
  { key: 'E', suffix: 'sus4', frets: [0, 2, 2, 2, 0, 0] },        // Esus4
  { key: 'E', suffix: 'sus2', frets: [0, 2, 4, 4, 0, 0] },        // Esus2
  { key: 'E', suffix: '5', frets: [0, 2, 2, -1, -1, -1] },        // E5
  { key: 'E', suffix: '6', frets: [0, 2, 2, 1, 2, 0] },           // E6
  { key: 'E', suffix: 'aug', frets: [0, 3, 2, 1, 1, 0] },         // Eaug
  { key: 'E', suffix: 'dim', frets: [-1, -1, 2, 3, 2, 3] },       // Edim

  // === F 系列（半开放/易用形式）===
  { key: 'F', suffix: 'major', frets: [-1, -1, 3, 2, 1, 1] },     // F (简化版)
  { key: 'F', suffix: 'major', frets: [1, -1, 3, 2, 1, 1] },      // F 带低音
  { key: 'F', suffix: 'minor', frets: [-1, -1, 3, 1, 1, 1] },     // Fm (简化版)
  { key: 'F', suffix: '7', frets: [-1, -1, 3, 5, 4, 5] },         // F7
  { key: 'F', suffix: 'maj7', frets: [-1, -1, 3, 2, 1, 0] },      // Fmaj7
  { key: 'F', suffix: 'm7', frets: [-1, -1, 3, 1, 1, 1] },        // Fm7
  { key: 'F', suffix: 'sus4', frets: [-1, -1, 3, 3, 1, 1] },      // Fsus4
  { key: 'F', suffix: 'sus2', frets: [-1, -1, 3, 0, 1, 1] },      // Fsus2

  // === G 系列 ===
  { key: 'G', suffix: 'major', frets: [3, 2, 0, 0, 0, 3] },       // 经典 G
  { key: 'G', suffix: 'major', frets: [3, 2, 0, 0, 3, 3] },       // G 变体
  { key: 'G', suffix: 'major', frets: [3, 0, 0, 0, 0, 3] },       // G (Folk形式)
  { key: 'G', suffix: 'minor', frets: [3, 1, 0, 0, 3, 3] },       // Gm (半开放)
  { key: 'G', suffix: '7', frets: [3, 2, 0, 0, 0, 1] },           // G7
  { key: 'G', suffix: '7', frets: [1, 2, 0, 0, 0, 1] },           // G7 变体
  { key: 'G', suffix: 'maj7', frets: [3, 2, 0, 0, 0, 2] },        // Gmaj7
  { key: 'G', suffix: 'm7', frets: [-1, 1, 0, 0, 3, 3] },         // Gm7 (半开放)
  { key: 'G', suffix: 'sus4', frets: [3, 3, 0, 0, 1, 3] },        // Gsus4
  { key: 'G', suffix: 'sus2', frets: [3, 0, 0, 0, 3, 3] },        // Gsus2
  { key: 'G', suffix: '5', frets: [3, 5, 5, -1, -1, -1] },        // G5
  { key: 'G', suffix: '6', frets: [3, 2, 0, 0, 0, 0] },           // G6
  { key: 'G', suffix: 'aug', frets: [3, 2, 1, 0, 0, 3] },         // Gaug
  { key: 'G', suffix: 'dim', frets: [-1, -1, 5, 3, 2, 3] },       // Gdim

  // === A 系列 ===
  { key: 'A', suffix: 'major', frets: [-1, 0, 2, 2, 2, 0] },      // 经典 A
  { key: 'A', suffix: 'major', frets: [0, 0, 2, 2, 2, 0] },       // A 带低音 E
  { key: 'A', suffix: 'minor', frets: [-1, 0, 2, 2, 1, 0] },      // Am
  { key: 'A', suffix: 'minor', frets: [0, 0, 2, 2, 1, 0] },       // Am 带低音 E
  { key: 'A', suffix: '7', frets: [-1, 0, 2, 0, 2, 0] },          // A7
  { key: 'A', suffix: '7', frets: [-1, 0, 2, 2, 2, 3] },          // A7 变体
  { key: 'A', suffix: 'maj7', frets: [-1, 0, 2, 1, 2, 0] },       // Amaj7
  { key: 'A', suffix: 'm7', frets: [-1, 0, 2, 0, 1, 0] },         // Am7
  { key: 'A', suffix: 'm7', frets: [-1, 0, 2, 2, 1, 3] },         // Am7 变体
  { key: 'A', suffix: 'sus4', frets: [-1, 0, 2, 2, 3, 0] },       // Asus4
  { key: 'A', suffix: 'sus2', frets: [-1, 0, 2, 2, 0, 0] },       // Asus2
  { key: 'A', suffix: '5', frets: [-1, 0, 2, 2, -1, -1] },        // A5
  { key: 'A', suffix: '6', frets: [-1, 0, 2, 2, 2, 2] },          // A6
  { key: 'A', suffix: 'aug', frets: [-1, 0, 3, 2, 2, 1] },        // Aaug
  { key: 'A', suffix: 'dim', frets: [-1, 0, 1, 2, 1, -1] },       // Adim

  // === B 系列 (多为半封闭) ===
  { key: 'B', suffix: 'major', frets: [-1, 2, 4, 4, 4, 2] },      // B (横按)
  { key: 'B', suffix: 'minor', frets: [-1, 2, 4, 4, 3, 2] },      // Bm (横按)
  { key: 'B', suffix: '7', frets: [-1, 2, 1, 2, 0, 2] },          // B7 (开放型)
  { key: 'B', suffix: '7', frets: [-1, 2, 4, 2, 4, 2] },          // B7 (横按)
  { key: 'B', suffix: 'maj7', frets: [-1, 2, 4, 3, 4, 2] },       // Bmaj7
  { key: 'B', suffix: 'm7', frets: [-1, 2, 0, 2, 0, 2] },         // Bm7 (开放型)
  { key: 'B', suffix: 'm7', frets: [-1, 2, 4, 2, 3, 2] },         // Bm7 (横按)
  { key: 'B', suffix: 'sus4', frets: [-1, 2, 4, 4, 5, 2] },       // Bsus4
  { key: 'B', suffix: 'sus2', frets: [-1, 2, 4, 4, 2, 2] },       // Bsus2

  // === Bb/A# 系列 ===
  { key: 'Bb', suffix: 'major', frets: [-1, 1, 3, 3, 3, 1] },     // Bb (横按)
  { key: 'Bb', suffix: 'minor', frets: [-1, 1, 3, 3, 2, 1] },     // Bbm
  { key: 'Bb', suffix: '7', frets: [-1, 1, 3, 1, 3, 1] },         // Bb7
  { key: 'Bb', suffix: 'maj7', frets: [-1, 1, 3, 2, 3, 1] },      // Bbmaj7
  { key: 'Bb', suffix: 'm7', frets: [-1, 1, 3, 1, 2, 1] },        // Bbm7

  // === Eb/D# 系列 ===
  { key: 'Eb', suffix: 'major', frets: [-1, -1, 1, 3, 4, 3] },    // Eb (D型)
  { key: 'Eb', suffix: 'minor', frets: [-1, -1, 1, 3, 4, 2] },    // Ebm
  { key: 'Eb', suffix: '7', frets: [-1, -1, 1, 3, 2, 3] },        // Eb7
  { key: 'Eb', suffix: 'maj7', frets: [-1, -1, 1, 3, 3, 3] },     // Ebmaj7
  { key: 'Eb', suffix: 'm7', frets: [-1, -1, 1, 3, 2, 2] },       // Ebm7

  // === Ab/G# 系列 ===
  { key: 'Ab', suffix: 'major', frets: [4, 6, 6, 5, 4, 4] },      // Ab (E型横按)
  { key: 'Ab', suffix: 'minor', frets: [4, 6, 6, 4, 4, 4] },      // Abm
  { key: 'Ab', suffix: '7', frets: [4, 6, 4, 5, 4, 4] },          // Ab7
  { key: 'Ab', suffix: 'maj7', frets: [4, 6, 5, 5, 4, 4] },       // Abmaj7
  { key: 'Ab', suffix: 'm7', frets: [4, 6, 4, 4, 4, 4] },         // Abm7

  // === C#/Db 系列 ===
  { key: 'C#', suffix: 'major', frets: [-1, 4, 6, 6, 6, 4] },     // C# (A型横按)
  { key: 'C#', suffix: 'minor', frets: [-1, 4, 6, 6, 5, 4] },     // C#m
  { key: 'C#', suffix: '7', frets: [-1, 4, 6, 4, 6, 4] },         // C#7
  { key: 'C#', suffix: 'maj7', frets: [-1, 4, 6, 5, 6, 4] },      // C#maj7
  { key: 'C#', suffix: 'm7', frets: [-1, 4, 6, 4, 5, 4] },        // C#m7

  // === F#/Gb 系列 ===
  { key: 'F#', suffix: 'major', frets: [2, 4, 4, 3, 2, 2] },      // F# (E型横按)
  { key: 'F#', suffix: 'minor', frets: [2, 4, 4, 2, 2, 2] },      // F#m
  { key: 'F#', suffix: '7', frets: [2, 4, 2, 3, 2, 2] },          // F#7
  { key: 'F#', suffix: 'maj7', frets: [2, 4, 3, 3, 2, 2] },       // F#maj7
  { key: 'F#', suffix: 'm7', frets: [2, 4, 2, 2, 2, 2] },         // F#m7
  { key: 'F#', suffix: 'sus4', frets: [2, 4, 4, 4, 2, 2] },       // F#sus4
  { key: 'F#', suffix: 'sus2', frets: [2, 4, 4, 1, 2, 2] },       // F#sus2
];

// 获取特定 key/suffix 的开放和弦
function getOpenChordsForKey(key: string, suffix: string): number[][] {
  const normalizedKey = normalizeKey(key);
  return OPEN_CHORDS
    .filter(c => normalizeKey(c.key) === normalizedKey && c.suffix === suffix)
    .map(c => c.frets);
}

// 标准化 key 名称 (处理等音名)
function normalizeKey(key: string): string {
  const enharmonics: Record<string, string> = {
    'Db': 'C#',
    'D#': 'Eb',
    'Gb': 'F#',
    'G#': 'Ab',
    'A#': 'Bb',
  };
  return enharmonics[key] ?? key;
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
    positions.push(toChordPosition(shape));
  }

  // C-shape (root on A string, higher voicing)
  // 这是 CAGED 系统中的 C型指法，根音在 A 弦
  // Major: [-1, f, f+2, f-1, f+1, f]  (需要 f >= 3)
  for (const f of aRoots) {
    if (f < 3) continue; // C型需要足够的把位空间
    const shape = (() => {
      switch (tonalSuffix) {
        case '':
          return [-1, f, f + 2, f - 1, f + 1, f];
        case 'm':
          return [-1, f, f + 2, f - 1, f, f];
        case '7':
          return [-1, f, f + 2, f + 1, f + 1, f];
        case 'maj7':
          return [-1, f, f + 2, f - 1, f, f];
        default:
          return null;
      }
    })();
    if (!shape) continue;
    if (shape.some((x) => x !== -1 && (x < 0 || x > maxFret))) continue;
    positions.push(toChordPosition(shape));
  }

  // D-shape (root on D string)
  // 这是 CAGED 系统中的 D型指法，根音在 D 弦
  const dRoots = rootFretsForString(STANDARD_TUNING_MIDI[2], rootChroma, maxFret);
  for (const f of dRoots) {
    if (f < 2) continue; // D型需要足够把位空间
    const shape = (() => {
      switch (tonalSuffix) {
        case '':
          return [-1, -1, f, f + 2, f + 3, f + 2];
        case 'm':
          return [-1, -1, f, f + 2, f + 3, f + 1];
        case '7':
          return [-1, -1, f, f + 2, f + 1, f + 2];
        case 'm7':
          return [-1, -1, f, f + 2, f + 1, f + 1];
        case 'maj7':
          return [-1, -1, f, f + 2, f + 2, f + 2];
        case 'sus4':
          return [-1, -1, f, f + 2, f + 3, f + 3];
        case 'sus2':
          return [-1, -1, f, f + 2, f + 3, f];
        default:
          return null;
      }
    })();
    if (!shape) continue;
    if (shape.some((x) => x !== -1 && x > maxFret)) continue;
    positions.push(toChordPosition(shape));
  }

  // G-shape (root on low E string, different fingering)
  // 这是 CAGED 系统中的 G型指法
  for (const f of eRoots) {
    if (f < 3) continue; // G型需要足够把位空间
    const shape = (() => {
      switch (tonalSuffix) {
        case '':
          return [f, f + 2, f - 1, f - 1, f - 1, f];
        case 'm':
          return [f, f + 2, f - 1, f - 1, f - 2, f];
        case '7':
          return [f, f + 2, f - 1, f - 1, f - 1, f - 2];
        default:
          return null;
      }
    })();
    if (!shape) continue;
    if (shape.some((x) => x !== -1 && (x < 0 || x > maxFret))) continue;
    positions.push(toChordPosition(shape));
  }

  // 额外的小横按/半横按形式（更易于演奏的变体）
  // Am型 (root on high E string) - 常见的高把位小横按
  const highERoots = rootFretsForString(STANDARD_TUNING_MIDI[5], rootChroma, maxFret);
  for (const f of highERoots) {
    if (f < 3 || f > maxFret - 2) continue;
    const shape = (() => {
      switch (tonalSuffix) {
        case '':
          return [-1, -1, f + 2, f + 2, f + 1, f];
        case 'm':
          return [-1, -1, f + 2, f + 2, f, f];
        default:
          return null;
      }
    })();
    if (!shape) continue;
    if (shape.some((x) => x !== -1 && x > maxFret)) continue;
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
  const minVoicings = 5; // 每个和弦至少返回 5 个把位

  const chordSymbol = `${key}${suffixToTonalSymbol(suffix)}`;
  const chord = Chord.get(chordSymbol);
  if (chord.empty) return fromDb.slice(0, limit);

  const chordChromas = new Set<number>((chord.notes ?? []).map((n) => Note.chroma(n)).filter((c) => c >= 0));
  const rootChroma = Note.chroma(key);
  const minSoundingStrings =
    chordChromas.size <= 2 ? 2 : chordChromas.size >= 4 ? 4 : 3;

  type Scored = { pos: ChordPosition; score: number; src: 'db' | 'gen' | 'open' };
  const scored: Scored[] = [];

  const add = (pos: ChordPosition, src: 'db' | 'gen' | 'open', bonus = 0) => {
    const score = practicalScore({
      frets: pos.frets,
      chordChromas,
      rootChroma,
      minSoundingStrings,
    });
    if (!Number.isFinite(score)) return;
    // Prefer DB and open shapes slightly when scores are close
    const srcBonus = src === 'db' ? -6 : src === 'open' ? -10 : 0;
    scored.push({ pos, score: score + srcBonus + bonus, src });
  };

  // 1. 获取开放和弦（最高优先级）
  const openChordFrets = getOpenChordsForKey(key, suffix);
  openChordFrets.forEach((frets) => {
    const pos = toChordPosition(frets);
    add(pos, 'open', -15); // 开放和弦给予额外优先级
  });

  // 2. 数据库中的指法
  fromDb.forEach((p) => add(p, 'db'));

  // 3. 生成的封闭和弦和 CAGED 形状
  const barre = generateCommonBarreVoicings(key, suffix, maxFret);
  barre.forEach((p) => add(p, 'gen', -8)); // 经典封闭和弦形状优先

  // 4. 其他生成的指法
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

  // Bucket selection: ensure we keep some from each position range
  const low: ChordPosition[] = [];   // 0-4品
  const mid: ChordPosition[] = [];   // 5-8品
  const high: ChordPosition[] = [];  // 9+品

  for (const s of sorted) {
    const maxFretUsed = Math.max(...s.pos.frets.filter((f) => f > 0), 0);
    if (maxFretUsed <= 4) low.push(s.pos);
    else if (maxFretUsed <= 8) mid.push(s.pos);
    else high.push(s.pos);
  }

  const pick: ChordPosition[] = [];

  // 确保低把位至少有 2-3 个选择
  const quotaLow = Math.min(Math.max(3, Math.ceil(limit * 0.4)), low.length);
  // 中把位也要有 1-2 个
  const quotaMid = Math.min(Math.max(2, Math.ceil(limit * 0.3)), mid.length);
  // 高把位 1-2 个
  const quotaHigh = Math.min(Math.max(1, Math.ceil(limit * 0.2)), high.length);

  pick.push(...low.slice(0, quotaLow));
  pick.push(...mid.slice(0, quotaMid));
  pick.push(...high.slice(0, quotaHigh));

  // 如果还没达到最小数量，继续添加
  if (pick.length < minVoicings) {
    const rest = [...low.slice(quotaLow), ...mid.slice(quotaMid), ...high.slice(quotaHigh)];
    for (const p of rest) {
      if (pick.length >= Math.max(minVoicings, limit)) break;
      if (!pick.find((x) => x.frets.join(',') === p.frets.join(','))) pick.push(p);
    }
  }

  // 如果还是不够，从 sorted 中继续添加
  if (pick.length < minVoicings) {
    for (const s of sorted) {
      if (pick.length >= Math.max(minVoicings, limit)) break;
      if (!pick.find((x) => x.frets.join(',') === s.pos.frets.join(','))) {
        pick.push(s.pos);
      }
    }
  }

  return pick.slice(0, limit);
}


