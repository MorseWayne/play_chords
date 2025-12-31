import { Scale } from '@tonaljs/tonal';
import { KEYS } from '@/lib/chords';

export type ProgressionMode = 'major' | 'minor';

export type PlayStyle = 'strum' | 'arpeggio';

export interface ProgressionDefinition {
  id: string;
  name: string;
  romanNumerals: string[];
  tags: string[];
  defaultBpm: number;
  notes?: string;
}

export interface GeneratedProgressionChord {
  roman: string;
  key: string; // root note (project key name, e.g. Eb not D#)
  suffix: string; // chords-db suffix (major/minor/7/m7/maj7/dim...)
}

const ENHARMONIC_TO_APP_KEY: Record<string, string> = {
  Db: 'C#',
  'D#': 'Eb',
  Gb: 'F#',
  'G#': 'Ab',
  'A#': 'Bb',
};

export function normalizeKeyToAppKey(note: string): string {
  const normalized = ENHARMONIC_TO_APP_KEY[note] ?? note;
  if (KEYS.includes(normalized)) return normalized;
  return normalized;
}

type RomanQuality = 'major' | 'minor' | 'dim';

function romanToDegree(token: string): { degree: number; quality: RomanQuality; ext?: string } | null {
  // Supports tokens like: I, V, vi, IV, vii°, ii7, V7, Imaj7, i–VII… (dash already split outside)
  const t = token.trim();
  if (!t) return null;

  // dimension marker
  const hasDim = t.includes('°') || t.toLowerCase().includes('dim');

  // Extract the roman part (I..VII) and extension (7 / maj7 etc.)
  const match = t.match(/^([ivIV]+)(.*)$/);
  if (!match) return null;

  const romanPart = match[1];
  const extRaw = (match[2] ?? '').replace('°', '').trim();
  const romanUpper = romanPart.toUpperCase();

  const degreeMap: Record<string, number> = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
    VII: 7,
  };
  const degree = degreeMap[romanUpper];
  if (!degree) return null;

  const isLower = romanPart === romanPart.toLowerCase();
  const quality: RomanQuality = hasDim ? 'dim' : isLower ? 'minor' : 'major';

  return { degree, quality, ext: extRaw || undefined };
}

function qualityAndExtToSuffix(quality: RomanQuality, ext?: string): string {
  if (!ext) return quality;

  const e = ext.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Most common:
  // - ii7 => m7
  // - V7 => 7
  // - Imaj7 => maj7
  if (e === '7') {
    return quality === 'minor' ? 'm7' : '7';
  }
  if (e === 'maj7') return 'maj7';
  if (e === 'm7') return 'm7';

  // fallback: if user wrote a suffix-like string, keep it
  return ext;
}

export function generateProgressionChords(params: {
  tonic: string; // e.g. C / A
  mode: ProgressionMode; // major/minor
  romanNumerals: string[]; // e.g. ["I", "V", "vi", "IV"]
}): GeneratedProgressionChord[] {
  const { tonic, mode, romanNumerals } = params;
  const scaleName = mode === 'major' ? `${tonic} major` : `${tonic} minor`;
  const scale = Scale.get(scaleName);
  const notes = (scale.notes ?? []).map(normalizeKeyToAppKey);

  // Tonal may fail for weird tonic strings; guard with empty result.
  if (notes.length < 7) return [];

  return romanNumerals
    .map((roman) => {
      const parsed = romanToDegree(roman);
      if (!parsed) return null;
      const key = notes[parsed.degree - 1];
      const suffix = qualityAndExtToSuffix(parsed.quality, parsed.ext);
      return { roman, key, suffix } satisfies GeneratedProgressionChord;
    })
    .filter((x): x is GeneratedProgressionChord => x !== null);
}

export const COMMON_PROGRESSIONS: ProgressionDefinition[] = [
  {
    id: 'pop-1564',
    name: 'I–V–vi–IV（流行万能走向）',
    romanNumerals: ['I', 'V', 'vi', 'IV'],
    tags: ['pop', 'rock'],
    defaultBpm: 100,
    notes: '代表：很多流行歌副歌/主歌都能听到的“万能走向”。',
  },
  {
    id: 'fifties-1645',
    name: 'I–vi–IV–V（50s 走向）',
    romanNumerals: ['I', 'vi', 'IV', 'V'],
    tags: ['pop', 'oldies'],
    defaultBpm: 92,
  },
  {
    id: 'jazz-251',
    name: 'ii7–V7–Imaj7（爵士 2-5-1）',
    romanNumerals: ['ii7', 'V7', 'Imaj7'],
    tags: ['jazz'],
    defaultBpm: 120,
    notes: 'MVP 以七和弦形式呈现，便于听感训练。',
  },
  {
    id: 'blues-12bar',
    name: '12 小节布鲁斯（I7/IV7/V7）',
    romanNumerals: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'],
    tags: ['blues', 'rock'],
    defaultBpm: 95,
  },
  {
    id: 'andalusian',
    name: 'Andalusian（i–VII–VI–V）',
    romanNumerals: ['i', 'VII', 'VI', 'V'],
    tags: ['flamenco', 'folk', 'pop'],
    defaultBpm: 110,
    notes: '常见于弗拉门戈/流行借用。',
  },
];

