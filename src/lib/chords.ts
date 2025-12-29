import guitarChords from '@tombatossals/chords-db/lib/guitar.json';

export interface ChordPosition {
  frets: number[];
  fingers: number[];
  baseFret: number;
  barres: number[];
  midi: number[];
  capo?: boolean;
}

export interface ChordData {
  key: string;
  suffix: string;
  positions: ChordPosition[];
}

export const KEYS = [
  'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'
];

export const SUFFIXES = [
  'major', 'minor', '7', 'maj7', 'm7', 'sus4', 'sus2', '9', 'm9', 'maj9', 'dim', 'aug', '6', '69', '11', '13'
];

export function getAvailableKeys(): string[] {
  return KEYS;
}

export function getSuffixesForKey(key: string): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keyData = (guitarChords as any).chords[key];
  if (!keyData || !Array.isArray(keyData)) return [];
  
  // Extract all available suffixes from the data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const availableSuffixes = new Set(keyData.map((c: any) => c.suffix));
  
  // Filter our predefined SUFFIXES list to only include ones that actually exist for this key
  // This ensures we show common chords in a specific order, and filter out obscure ones
  return SUFFIXES.filter(s => availableSuffixes.has(s));
}

export function getChordData(key: string, suffix: string): ChordData | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keyData = (guitarChords as any).chords[key];
  if (!keyData || !Array.isArray(keyData)) return null;
  
  // Find the specific chord entry by suffix
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chordEntry = keyData.find((c: any) => c.suffix === suffix);
  if (!chordEntry) return null;

  return {
    key,
    suffix,
    positions: chordEntry.positions
  };
}

export function formatSuffix(suffix: string): string {
  if (suffix === 'major') return '';
  if (suffix === 'minor') return 'm';
  return suffix;
}

export function getSuffixLabel(suffix: string): string {
  const map: Record<string, string> = {
    major: '大三 (Major)',
    minor: '小三 (Minor)',
    '7': '属七 (7)',
    maj7: '大七 (Maj7)',
    m7: '小七 (m7)',
    sus4: '挂四 (sus4)',
    sus2: '挂二 (sus2)',
    '9': '属九 (9)',
    m9: '小九 (m9)',
    maj9: '大九 (Maj9)',
    dim: '减 (dim)',
    aug: '增 (aug)',
    '6': '六 (6)',
    '69': '六九 (6/9)',
    '11': '十一 (11)',
    '13': '十三 (13)',
  };
  return map[suffix] ?? suffix;
}
