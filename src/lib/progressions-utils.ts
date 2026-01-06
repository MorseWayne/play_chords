import { Scale } from '@tonaljs/tonal';
import { KEYS } from '@/lib/chords';
import type { GeneratedProgressionChord, ProgressionMode } from './progressions';

// ============================================================
// 自定义走向解析功能
// ============================================================

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ index: number; token: string; message: string }>;
  warnings?: Array<{ message: string }>;
}

// 从 progressions.ts 导入需要的类型
type RomanQuality = 'major' | 'minor' | 'dim';

/**
 * 解析罗马数字 token（从 progressions.ts 复制）
 */
function romanToDegree(token: string): { degree: number; quality: RomanQuality; ext?: string } | null {
  const t = token.trim();
  if (!t) return null;

  const hasDim = t.includes('°') || t.toLowerCase().includes('dim');
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

function normalizeKeyToAppKey(note: string): string {
  const ENHARMONIC_TO_APP_KEY: Record<string, string> = {
    Db: 'C#',
    'D#': 'Eb',
    Gb: 'F#',
    'G#': 'Ab',
    'A#': 'Bb',
  };
  const normalized = ENHARMONIC_TO_APP_KEY[note] ?? note;
  if (KEYS.includes(normalized)) return normalized;
  return normalized;
}

/**
 * 解析罗马数字字符串
 * 支持格式：
 * - "I V vi IV" (空格分隔)
 * - "I-V-vi-IV" (短横线分隔)
 * - "I, V, vi, IV" (逗号分隔)
 * - "ii7 V7 Imaj7" (支持扩展)
 */
export function parseRomanNumeralString(input: string): string[] {
  if (!input || typeof input !== 'string') return [];
  
  const tokens = input
    .trim()
    .split(/[\s,\-/–]+/) // 包含普通短横线和长横线
    .map(t => t.trim())
    .filter(t => t.length > 0);
  
  return tokens;
}

/**
 * 验证罗马数字输入
 */
export function validateRomanNumeralInput(input: string): ValidationResult {
  const tokens = parseRomanNumeralString(input);
  const errors: ValidationResult['errors'] = [];
  const warnings: ValidationResult['warnings'] = [];
  
  if (tokens.length === 0) {
    return {
      valid: false,
      errors: [{ index: -1, token: '', message: '请输入至少一个罗马数字' }],
    };
  }
  
  if (tokens.length < 2) {
    warnings.push({ message: '建议至少输入 2 个和弦' });
  }
  
  if (tokens.length > 16) {
    return {
      valid: false,
      errors: [{ index: -1, token: '', message: '和弦数量不能超过 16 个' }],
    };
  }
  
  tokens.forEach((token, index) => {
    const parsed = romanToDegree(token);
    if (!parsed) {
      errors.push({
        index,
        token,
        message: `"${token}" 不是合法的罗马数字。示例：I、V、vi、IV、ii7、V7、Imaj7`,
      });
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * 解析和弦名称字符串并推断调性
 */
export function parseChordNameString(input: string): {
  chords: Array<{ key: string; suffix: string }>;
  inferredKey?: string;
  inferredMode?: ProgressionMode;
} | null {
  if (!input || typeof input !== 'string') return null;
  
  const tokens = input
    .trim()
    .split(/[\s,\-/–]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);
  
  if (tokens.length === 0) return null;
  
  const chords: Array<{ key: string; suffix: string }> = [];
  
  for (const token of tokens) {
    const parsed = parseChordSymbol(token);
    if (!parsed) return null;
    chords.push(parsed);
  }
  
  const inference = inferKeyFromChords(chords);
  
  return {
    chords,
    ...inference,
  };
}

/**
 * 解析单个和弦符号
 */
function parseChordSymbol(symbol: string): { key: string; suffix: string } | null {
  if (!symbol) return null;
  
  const rootMatch = symbol.match(/^([A-G][#b]?)/);
  if (!rootMatch) return null;
  
  let key = rootMatch[1];
  const rest = symbol.slice(key.length);
  
  const enharmonicMap: Record<string, string> = {
    'Db': 'C#',
    'D#': 'Eb',
    'Gb': 'F#',
    'G#': 'Ab',
    'A#': 'Bb',
  };
  key = enharmonicMap[key] ?? key;
  
  let suffix = 'major';
  
  if (rest === '' || rest === 'M') {
    suffix = 'major';
  } else if (rest === 'm' || rest === 'min' || rest === 'minor') {
    suffix = 'minor';
  } else if (rest === '7') {
    suffix = '7';
  } else if (rest === 'm7' || rest === 'min7') {
    suffix = 'm7';
  } else if (rest === 'maj7' || rest === 'M7' || rest === 'Maj7') {
    suffix = 'maj7';
  } else if (rest === 'sus4') {
    suffix = 'sus4';
  } else if (rest === 'sus2') {
    suffix = 'sus2';
  } else if (rest === 'dim' || rest === '°') {
    suffix = 'dim';
  } else if (rest === 'aug' || rest === '+') {
    suffix = 'aug';
  } else if (rest === '5') {
    suffix = '5';
  } else if (rest === '6') {
    suffix = '6';
  } else if (rest === '9') {
    suffix = '9';
  } else if (rest === 'm9' || rest === 'min9') {
    suffix = 'm9';
  } else if (rest === 'maj9' || rest === 'M9') {
    suffix = 'maj9';
  } else {
    suffix = rest || 'major';
  }
  
  return { key, suffix };
}

/**
 * 根据和弦序列推断调性
 */
function inferKeyFromChords(chords: Array<{ key: string; suffix: string }>): {
  inferredKey?: string;
  inferredMode?: ProgressionMode;
} {
  if (chords.length === 0) return {};
  
  const firstChord = chords[0];
  const inferredKey = firstChord.key;
  
  const inferredMode: ProgressionMode = 
    firstChord.suffix === 'minor' || firstChord.suffix === 'm7' ? 'minor' : 'major';
  
  return { inferredKey, inferredMode };
}

/**
 * 验证和弦名称输入
 */
export function validateChordNameInput(input: string): ValidationResult {
  const tokens = input
    .trim()
    .split(/[\s,\-/–]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);
  
  const errors: ValidationResult['errors'] = [];
  const warnings: ValidationResult['warnings'] = [];
  
  if (tokens.length === 0) {
    return {
      valid: false,
      errors: [{ index: -1, token: '', message: '请输入至少一个和弦名称' }],
    };
  }
  
  if (tokens.length < 2) {
    warnings.push({ message: '建议至少输入 2 个和弦' });
  }
  
  if (tokens.length > 16) {
    return {
      valid: false,
      errors: [{ index: -1, token: '', message: '和弦数量不能超过 16 个' }],
    };
  }
  
  tokens.forEach((token, index) => {
    const parsed = parseChordSymbol(token);
    if (!parsed) {
      errors.push({
        index,
        token,
        message: `"${token}" 不是合法的和弦名称。示例：C、Am、F#m7、Bbmaj7`,
      });
    } else if (!KEYS.includes(parsed.key)) {
      errors.push({
        index,
        token,
        message: `"${parsed.key}" 不是支持的根音。支持的根音：${KEYS.join('、')}`,
      });
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * 将和弦名称序列转换为 GeneratedProgressionChord 数组
 */
export function convertChordNamesToProgression(
  chords: Array<{ key: string; suffix: string }>,
  tonic: string,
  mode: ProgressionMode
): GeneratedProgressionChord[] {
  const scaleName = mode === 'major' ? `${tonic} major` : `${tonic} minor`;
  const scale = Scale.get(scaleName);
  const notes = (scale.notes ?? []).map(normalizeKeyToAppKey);
  
  if (notes.length < 7) return [];
  
  return chords.map(chord => {
    const chordKey = normalizeKeyToAppKey(chord.key);
    const degreeIndex = notes.indexOf(chordKey);
    
    let roman = '?';
    if (degreeIndex >= 0) {
      const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
      const isMinor = chord.suffix === 'minor' || chord.suffix === 'm7' || chord.suffix === 'm9';
      roman = isMinor ? romanNumerals[degreeIndex].toLowerCase() : romanNumerals[degreeIndex];
      
      if (chord.suffix === '7') roman += '7';
      else if (chord.suffix === 'm7') roman += '7';
      else if (chord.suffix === 'maj7') roman += 'maj7';
    }
    
    return {
      roman,
      key: chordKey,
      suffix: chord.suffix,
    };
  });
}
