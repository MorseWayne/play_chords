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
  // === 流行/摇滚类 ===
  {
    id: 'pop-1564',
    name: 'I–V–vi–IV（流行万能走向）',
    romanNumerals: ['I', 'V', 'vi', 'IV'],
    tags: ['pop', 'rock'],
    defaultBpm: 100,
    notes: '代表：很多流行歌副歌/主歌都能听到的"万能走向"。',
  },
  {
    id: 'fifties-1645',
    name: 'I–vi–IV–V（50s 走向）',
    romanNumerals: ['I', 'vi', 'IV', 'V'],
    tags: ['pop', 'oldies'],
    defaultBpm: 92,
    notes: '经典五六十年代流行音乐常用进行。',
  },
  {
    id: 'pop-6415',
    name: 'vi–IV–I–V（Canon 卡农走向）',
    romanNumerals: ['vi', 'IV', 'I', 'V'],
    tags: ['pop', 'ballad'],
    defaultBpm: 88,
    notes: '著名的 Canon 和弦进行，适合抒情歌曲。',
  },
  {
    id: 'pop-145',
    name: 'I–IV–V（三和弦经典）',
    romanNumerals: ['I', 'IV', 'V'],
    tags: ['pop', 'rock', 'folk'],
    defaultBpm: 110,
    notes: '最基础的三和弦进行，摇滚、民谣常用。',
  },
  {
    id: 'pop-1345',
    name: 'I–iii–IV–V（上行走向）',
    romanNumerals: ['I', 'iii', 'IV', 'V'],
    tags: ['pop', 'ballad'],
    defaultBpm: 85,
    notes: '柔和的上行进行，常用于抒情段落。',
  },
  {
    id: 'pop-4536',
    name: 'IV–V–iii–vi（逆行走向）',
    romanNumerals: ['IV', 'V', 'iii', 'vi'],
    tags: ['pop', 'rock'],
    defaultBpm: 105,
    notes: '现代流行常用的逆行进行，动感十足。',
  },
  {
    id: 'pop-1634',
    name: 'I–vi–iii–IV（柔和走向）',
    romanNumerals: ['I', 'vi', 'iii', 'IV'],
    tags: ['pop', 'ballad'],
    defaultBpm: 78,
    notes: '温柔抒情的和弦进行。',
  },

  // === 爵士类 ===
  {
    id: 'jazz-251',
    name: 'ii7–V7–Imaj7（爵士 2-5-1）',
    romanNumerals: ['ii7', 'V7', 'Imaj7'],
    tags: ['jazz'],
    defaultBpm: 120,
    notes: '爵士乐最核心的进行，标准曲必备。',
  },
  {
    id: 'jazz-1625',
    name: 'I–vi7–ii7–V7（爵士循环）',
    romanNumerals: ['I', 'vi7', 'ii7', 'V7'],
    tags: ['jazz', 'swing'],
    defaultBpm: 140,
    notes: '经典的爵士循环进行，Rhythm Changes 常用。',
  },
  {
    id: 'jazz-3625',
    name: 'iii7–vi7–ii7–V7（下行爵士）',
    romanNumerals: ['iii7', 'vi7', 'ii7', 'V7'],
    tags: ['jazz'],
    defaultBpm: 130,
    notes: '下行的爵士进行，平滑过渡。',
  },
  {
    id: 'jazz-251-loop',
    name: 'ii7–V7–Imaj7–vi7（2-5-1 循环）',
    romanNumerals: ['ii7', 'V7', 'Imaj7', 'vi7'],
    tags: ['jazz'],
    defaultBpm: 115,
    notes: '扩展的 2-5-1，可循环练习。',
  },
  {
    id: 'jazz-turnaround',
    name: 'Imaj7–vi7–ii7–V7（爵士 Turnaround）',
    romanNumerals: ['Imaj7', 'vi7', 'ii7', 'V7'],
    tags: ['jazz', 'bebop'],
    defaultBpm: 160,
    notes: 'Bebop 常用的 Turnaround 进行。',
  },

  // === 布鲁斯/摇滚类 ===
  {
    id: 'blues-12bar',
    name: '12 小节布鲁斯（I7/IV7/V7）',
    romanNumerals: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'],
    tags: ['blues', 'rock'],
    defaultBpm: 95,
    notes: '经典 12 小节布鲁斯标准结构。',
  },
  {
    id: 'blues-8bar',
    name: '8 小节布鲁斯（快速变换）',
    romanNumerals: ['I7', 'IV7', 'I7', 'V7', 'IV7', 'I7', 'V7', 'I7'],
    tags: ['blues', 'rock'],
    defaultBpm: 120,
    notes: '简化的 8 小节布鲁斯，节奏更快。',
  },
  {
    id: 'blues-rock',
    name: 'I–IV–I–V（摇滚布鲁斯）',
    romanNumerals: ['I', 'IV', 'I', 'V'],
    tags: ['blues', 'rock'],
    defaultBpm: 130,
    notes: '摇滚乐常用的布鲁斯简化形式，常用强力和弦。',
  },

  // === 民谣/乡村类 ===
  {
    id: 'folk-8bar',
    name: 'I–V–vi–iii–IV–I–IV–V（经典民谣 8 小节）',
    romanNumerals: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'],
    tags: ['folk', 'country'],
    defaultBpm: 95,
    notes: '传统民谣常用的 8 小节进行。',
  },
  {
    id: 'country-ballad',
    name: 'I–V–vi–IV–I–V（乡村 Ballad）',
    romanNumerals: ['I', 'V', 'vi', 'IV', 'I', 'V'],
    tags: ['country', 'ballad'],
    defaultBpm: 72,
    notes: '温柔的乡村抒情曲进行。',
  },
  {
    id: 'folk-circle',
    name: 'I–IV–I–V–I–IV–V–I（民谣循环）',
    romanNumerals: ['I', 'IV', 'I', 'V', 'I', 'IV', 'V', 'I'],
    tags: ['folk', 'acoustic'],
    defaultBpm: 88,
    notes: '经典民谣弹唱循环，易于上手。',
  },

  // === 拉丁/Bossa 类 ===
  {
    id: 'bossa-nova',
    name: 'Imaj7–vi7–ii7–V7（Bossa Nova）',
    romanNumerals: ['Imaj7', 'vi7', 'ii7', 'V7'],
    tags: ['latin', 'bossa', 'jazz'],
    defaultBpm: 108,
    notes: 'Bossa Nova 经典进行，配合 Bossa 节奏型效果更佳。',
  },
  {
    id: 'latin-jazz',
    name: 'i–IV7–VII–III7（拉丁爵士）',
    romanNumerals: ['i', 'IV7', 'VII', 'III7'],
    tags: ['latin', 'jazz'],
    defaultBpm: 125,
    notes: '拉丁爵士常用进行，小调色彩。',
  },

  // === 其他经典 ===
  {
    id: 'andalusian',
    name: 'i–VII–VI–V（Andalusian 安达卢西亚）',
    romanNumerals: ['i', 'VII', 'VI', 'V'],
    tags: ['flamenco', 'folk', 'pop'],
    defaultBpm: 110,
    notes: '常见于弗拉门戈、地中海音乐及现代流行。',
  },
];

