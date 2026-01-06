/**
 * 节奏型数据结构与预置节奏型库
 * Rhythm patterns: strumming and arpeggio patterns for guitar practice
 */

// =============================================================================
// 类型定义
// =============================================================================

/**
 * 扫弦节奏型中的单个动作
 */
export interface StrumAction {
  direction: 'down' | 'up';
  accent?: boolean;       // 重音
  mute?: boolean;         // 闷音/切音
  duration?: number;      // 时值（相对于基准时值的倍数，默认1）
}

/**
 * 扫弦节奏型
 */
export interface StrummingPattern {
  id: string;
  name: string;
  type: 'strumming';
  notation: string;                // 可读的记号，如 "D DU UDU" 或 "↓ ↓↑ ↑↓↑"
  sequence: StrumAction[];         // 实际的动作序列
  beatsPerMeasure?: number;        // 每小节拍数（默认4）
  tags: string[];                  // 风格标签
  notes?: string;                  // 说明
  bpmRange?: [number, number];     // 适用 BPM 范围
}

/**
 * 分解节奏型中的单个音符
 */
export interface ArpeggioNote {
  string: number;         // 1-6（1=高音e弦，6=低音E弦）
  accent?: boolean;       // 重音
  duration?: number;      // 时值
}

/**
 * 分解节奏型
 */
export interface ArpeggioPattern {
  id: string;
  name: string;
  type: 'arpeggio';
  notation: string;                // 可读的记号，如 "6-3-2-3-1-3-2-3"
  sequence: ArpeggioNote[];        // 实际的音符序列
  beatsPerMeasure?: number;        // 每小节拍数
  tags: string[];                  // 风格标签
  notes?: string;                  // 说明
  bpmRange?: [number, number];     // 适用 BPM 范围
}

/**
 * 联合节奏型类型
 */
export type RhythmPattern = StrummingPattern | ArpeggioPattern;

/**
 * 自定义扫弦节奏型
 */
export interface CustomStrummingPattern extends StrummingPattern {
  isCustom: true;
  createdAt: number;
  updatedAt: number;
}

/**
 * 自定义分解节奏型
 */
export interface CustomArpeggioPattern extends ArpeggioPattern {
  isCustom: true;
  createdAt: number;
  updatedAt: number;
}

/**
 * 自定义节奏型联合类型
 */
export type CustomRhythmPattern = CustomStrummingPattern | CustomArpeggioPattern;

/**
 * 节奏型偏好设置
 */
export interface RhythmPatternPreference {
  type: 'strum' | 'arpeggio';
  patternId: string;
}

// =============================================================================
// 预置扫弦节奏型库
// =============================================================================

export const STRUMMING_PATTERNS: StrummingPattern[] = [
  // 基础类
  {
    id: 'strum-basic-down',
    name: '全下扫',
    type: 'strumming',
    notation: 'D D D D',
    sequence: [
      { direction: 'down' },
      { direction: 'down' },
      { direction: 'down' },
      { direction: 'down' },
    ],
    beatsPerMeasure: 4,
    tags: ['basic', 'beginner'],
    notes: '最基础的扫弦节奏，适合初学者练习节拍稳定性',
    bpmRange: [60, 120],
  },
  {
    id: 'strum-basic-alternate',
    name: '交替扫弦',
    type: 'strumming',
    notation: 'D U D U',
    sequence: [
      { direction: 'down' },
      { direction: 'up' },
      { direction: 'down' },
      { direction: 'up' },
    ],
    beatsPerMeasure: 4,
    tags: ['basic', 'beginner'],
    notes: '上下交替扫弦，建立手腕摆动的基本感觉',
    bpmRange: [60, 140],
  },
  {
    id: 'strum-basic-up',
    name: '全上扫',
    type: 'strumming',
    notation: 'U U U U',
    sequence: [
      { direction: 'up' },
      { direction: 'up' },
      { direction: 'up' },
      { direction: 'up' },
    ],
    beatsPerMeasure: 4,
    tags: ['basic', 'beginner'],
    notes: '全上扫练习，锻炼手腕上行动作',
    bpmRange: [60, 100],
  },

  // 流行/民谣类
  {
    id: 'strum-pop-classic',
    name: '经典民谣',
    type: 'strumming',
    notation: 'D DU UDU',
    sequence: [
      { direction: 'down', duration: 2 },
      { direction: 'down' },
      { direction: 'up' },
      { direction: 'up' },
      { direction: 'down' },
      { direction: 'up' },
    ],
    beatsPerMeasure: 4,
    tags: ['pop', 'folk', 'acoustic'],
    notes: '最常用的民谣/流行节奏型，适用于大多数歌曲',
    bpmRange: [80, 140],
  },
  {
    id: 'strum-pop-44',
    name: '四四拍流行',
    type: 'strumming',
    notation: 'D D DU U',
    sequence: [
      { direction: 'down', duration: 2 },
      { direction: 'down', duration: 1 },
      { direction: 'down' },
      { direction: 'up' },
      { direction: 'up', duration: 1 },
    ],
    beatsPerMeasure: 4,
    tags: ['pop', 'rock'],
    notes: '流行摇滚常用节奏，重音在1、3拍',
    bpmRange: [90, 150],
  },
  {
    id: 'strum-pop-light',
    name: '轻快流行',
    type: 'strumming',
    notation: 'D DU DU',
    sequence: [
      { direction: 'down', accent: true },
      { direction: 'down' },
      { direction: 'up' },
      { direction: 'down' },
      { direction: 'up' },
    ],
    beatsPerMeasure: 4,
    tags: ['pop', 'light'],
    notes: '轻快的流行节奏，适合节奏明快的歌曲',
    bpmRange: [100, 160],
  },
  {
    id: 'strum-folk-8beat',
    name: '八分音符民谣',
    type: 'strumming',
    notation: 'D U D U D U D U',
    sequence: [
      { direction: 'down', accent: true },
      { direction: 'up' },
      { direction: 'down' },
      { direction: 'up' },
      { direction: 'down', accent: true },
      { direction: 'up' },
      { direction: 'down' },
      { direction: 'up' },
    ],
    beatsPerMeasure: 4,
    tags: ['folk', 'country'],
    notes: '稳定的八分音符节奏，重音在1、3拍',
    bpmRange: [80, 130],
  },

  // 摇滚/放克类
  {
    id: 'strum-rock-power',
    name: '摇滚重音',
    type: 'strumming',
    notation: 'D> D U D> U',
    sequence: [
      { direction: 'down', accent: true },
      { direction: 'down' },
      { direction: 'up' },
      { direction: 'down', accent: true },
      { direction: 'up' },
    ],
    beatsPerMeasure: 4,
    tags: ['rock', 'power'],
    notes: '带强烈重音的摇滚节奏，适合动力和弦',
    bpmRange: [100, 160],
  },
  {
    id: 'strum-funk-16th',
    name: '放克切分',
    type: 'strumming',
    notation: 'D x U x D U',
    sequence: [
      { direction: 'down', accent: true },
      { direction: 'down', mute: true },
      { direction: 'up' },
      { direction: 'up', mute: true },
      { direction: 'down' },
      { direction: 'up' },
    ],
    beatsPerMeasure: 4,
    tags: ['funk', 'rhythm'],
    notes: '放克风格切分节奏，需要练习闷音技巧',
    bpmRange: [90, 130],
  },

  // 布鲁斯/爵士类
  {
    id: 'strum-blues-shuffle',
    name: '布鲁斯摇摆',
    type: 'strumming',
    notation: 'D~ U D~ U',
    sequence: [
      { direction: 'down', duration: 1.5, accent: true },
      { direction: 'up', duration: 0.5 },
      { direction: 'down', duration: 1.5, accent: true },
      { direction: 'up', duration: 0.5 },
    ],
    beatsPerMeasure: 4,
    tags: ['blues', 'shuffle', 'swing'],
    notes: '三连音感觉的布鲁斯摇摆节奏',
    bpmRange: [70, 120],
  },
  {
    id: 'strum-jazz-comp',
    name: '爵士伴奏',
    type: 'strumming',
    notation: 'D . D U . U',
    sequence: [
      { direction: 'down', accent: true },
      { direction: 'down', duration: 0.5 },
      { direction: 'up' },
      { direction: 'up', duration: 0.5 },
    ],
    beatsPerMeasure: 4,
    tags: ['jazz', 'swing'],
    notes: '爵士伴奏基本节奏，强调2、4拍',
    bpmRange: [100, 180],
  },

  // 拉丁类
  {
    id: 'strum-bossa-basic',
    name: 'Bossa Nova',
    type: 'strumming',
    notation: 'D . DU . DU',
    sequence: [
      { direction: 'down', accent: true, duration: 1.5 },
      { direction: 'down' },
      { direction: 'up' },
      { direction: 'down', duration: 1 },
      { direction: 'up' },
    ],
    beatsPerMeasure: 4,
    tags: ['bossa', 'latin', 'brazilian'],
    notes: 'Bossa Nova 基本节奏型',
    bpmRange: [100, 140],
  },
  {
    id: 'strum-reggae-offbeat',
    name: '雷鬼离拍',
    type: 'strumming',
    notation: '. U . U . U . U',
    sequence: [
      { direction: 'up', duration: 0.5 },
      { direction: 'up', duration: 0.5 },
      { direction: 'up', duration: 0.5 },
      { direction: 'up', duration: 0.5 },
    ],
    beatsPerMeasure: 4,
    tags: ['reggae', 'ska'],
    notes: '雷鬼/Ska 离拍节奏，只在弱拍上扫',
    bpmRange: [80, 130],
  },
];

// =============================================================================
// 预置分解节奏型库
// =============================================================================

export const ARPEGGIO_PATTERNS: ArpeggioPattern[] = [
  // 经典分解
  {
    id: 'arp-classic-8',
    name: '经典八拍分解',
    type: 'arpeggio',
    notation: '6-3-2-3-1-3-2-3',
    sequence: [
      { string: 6, accent: true },
      { string: 3 },
      { string: 2 },
      { string: 3 },
      { string: 1, accent: true },
      { string: 3 },
      { string: 2 },
      { string: 3 },
    ],
    beatsPerMeasure: 4,
    tags: ['classic', 'folk', 'ballad'],
    notes: '最常用的分解节奏，适合民谣和抒情歌曲',
    bpmRange: [60, 120],
  },
  {
    id: 'arp-classic-6',
    name: '六拍分解',
    type: 'arpeggio',
    notation: '6-3-2-1-2-3',
    sequence: [
      { string: 6, accent: true },
      { string: 3 },
      { string: 2 },
      { string: 1, accent: true },
      { string: 2 },
      { string: 3 },
    ],
    beatsPerMeasure: 3,
    tags: ['classic', 'waltz'],
    notes: '六拍分解，适合三拍子歌曲',
    bpmRange: [80, 140],
  },
  {
    id: 'arp-classic-4',
    name: '四拍分解',
    type: 'arpeggio',
    notation: '6-3-2-1',
    sequence: [
      { string: 6, accent: true },
      { string: 3 },
      { string: 2 },
      { string: 1 },
    ],
    beatsPerMeasure: 4,
    tags: ['classic', 'simple'],
    notes: '简单的四拍分解，适合初学者',
    bpmRange: [60, 100],
  },
  {
    id: 'arp-bass-melody',
    name: '低音+旋律',
    type: 'arpeggio',
    notation: '5-3-2-1-2-3',
    sequence: [
      { string: 5, accent: true },
      { string: 3 },
      { string: 2 },
      { string: 1, accent: true },
      { string: 2 },
      { string: 3 },
    ],
    beatsPerMeasure: 4,
    tags: ['folk', 'fingerstyle'],
    notes: '强调低音和高音旋律的分解',
    bpmRange: [70, 120],
  },

  // 滚动分解
  {
    id: 'arp-roll-up',
    name: '上行滚动',
    type: 'arpeggio',
    notation: '6-5-4-3-2-1',
    sequence: [
      { string: 6, accent: true },
      { string: 5 },
      { string: 4 },
      { string: 3 },
      { string: 2 },
      { string: 1 },
    ],
    beatsPerMeasure: 4,
    tags: ['roll', 'arpeggiate'],
    notes: '从低音到高音的滚动琶音',
    bpmRange: [60, 140],
  },
  {
    id: 'arp-roll-down',
    name: '下行滚动',
    type: 'arpeggio',
    notation: '1-2-3-4-5-6',
    sequence: [
      { string: 1, accent: true },
      { string: 2 },
      { string: 3 },
      { string: 4 },
      { string: 5 },
      { string: 6 },
    ],
    beatsPerMeasure: 4,
    tags: ['roll', 'arpeggiate'],
    notes: '从高音到低音的滚动琶音',
    bpmRange: [60, 140],
  },
  {
    id: 'arp-roll-wave',
    name: '波浪往返',
    type: 'arpeggio',
    notation: '6-5-4-3-4-5',
    sequence: [
      { string: 6, accent: true },
      { string: 5 },
      { string: 4 },
      { string: 3, accent: true },
      { string: 4 },
      { string: 5 },
    ],
    beatsPerMeasure: 4,
    tags: ['roll', 'wave'],
    notes: '上下往返的波浪式分解',
    bpmRange: [60, 120],
  },

  // 特殊分解
  {
    id: 'arp-travis-basic',
    name: 'Travis Picking',
    type: 'arpeggio',
    notation: '6-3-4-2-5-3-4-1',
    sequence: [
      { string: 6, accent: true },
      { string: 3 },
      { string: 4 },
      { string: 2 },
      { string: 5, accent: true },
      { string: 3 },
      { string: 4 },
      { string: 1 },
    ],
    beatsPerMeasure: 4,
    tags: ['travis', 'fingerstyle', 'country'],
    notes: 'Travis 指弹基础节奏，拇指交替低音弦',
    bpmRange: [60, 120],
  },
  {
    id: 'arp-bossa-pattern',
    name: 'Bossa 分解',
    type: 'arpeggio',
    notation: '5-2-3-1-2-3',
    sequence: [
      { string: 5, accent: true },
      { string: 2 },
      { string: 3, accent: true },
      { string: 1 },
      { string: 2 },
      { string: 3 },
    ],
    beatsPerMeasure: 4,
    tags: ['bossa', 'latin', 'brazilian'],
    notes: 'Bossa Nova 风格分解节奏',
    bpmRange: [100, 140],
  },
  {
    id: 'arp-pinch',
    name: '捏弦分解',
    type: 'arpeggio',
    notation: '(6+1)-2-3-(5+1)-2-3',
    sequence: [
      { string: 6, accent: true },
      { string: 2 },
      { string: 3 },
      { string: 5, accent: true },
      { string: 2 },
      { string: 3 },
    ],
    beatsPerMeasure: 4,
    tags: ['fingerstyle', 'pinch'],
    notes: '带捏弦技巧的分解，低音与高音同时弹奏',
    bpmRange: [60, 100],
  },
];

// =============================================================================
// 辅助函数
// =============================================================================

/**
 * 获取所有预置节奏型
 */
export function getAllPresetPatterns(): RhythmPattern[] {
  return [...STRUMMING_PATTERNS, ...ARPEGGIO_PATTERNS];
}

/**
 * 获取扫弦节奏型
 */
export function getStrummingPatterns(): StrummingPattern[] {
  return STRUMMING_PATTERNS;
}

/**
 * 获取分解节奏型
 */
export function getArpeggioPatterns(): ArpeggioPattern[] {
  return ARPEGGIO_PATTERNS;
}

/**
 * 根据 ID 获取节奏型
 */
export function getPatternById(id: string): RhythmPattern | undefined {
  return getAllPresetPatterns().find((p) => p.id === id);
}

/**
 * 根据标签筛选节奏型
 */
export function getPatternsByTag(tag: string): RhythmPattern[] {
  return getAllPresetPatterns().filter((p) => p.tags.includes(tag));
}

/**
 * 获取所有可用标签
 */
export function getAllPatternTags(): string[] {
  const tags = new Set<string>();
  getAllPresetPatterns().forEach((p) => p.tags.forEach((t) => tags.add(t)));
  return Array.from(tags).sort();
}

/**
 * 判断节奏型类型
 */
export function isStrummingPattern(pattern: RhythmPattern): pattern is StrummingPattern {
  return pattern.type === 'strumming';
}

export function isArpeggioPattern(pattern: RhythmPattern): pattern is ArpeggioPattern {
  return pattern.type === 'arpeggio';
}

// =============================================================================
// 解析函数
// =============================================================================

/**
 * 解析扫弦节奏型字符串
 * 支持格式：
 * - "D U D U" - 空格分隔
 * - "D>U D U" - > 表示重音
 * - "D x U" - x 表示闷音
 * - "↓ ↑ ↓ ↑" - 箭头符号
 */
export function parseStrummingPattern(input: string, name?: string): StrummingPattern | null {
  if (!input.trim()) return null;

  const sequence: StrumAction[] = [];
  
  // 将箭头符号转换为 D/U
  let normalized = input
    .replace(/↓/g, 'D')
    .replace(/↑/g, 'U')
    .trim();
  
  // 按空格分割，然后解析每个 token
  const tokens = normalized.split(/\s+/);
  
  for (const token of tokens) {
    // 解析每个字符
    for (let i = 0; i < token.length; i++) {
      const char = token[i].toUpperCase();
      const nextChar = token[i + 1];
      
      if (char === 'D') {
        const accent = nextChar === '>';
        if (accent) i++;
        sequence.push({ direction: 'down', accent });
      } else if (char === 'U') {
        const accent = nextChar === '>';
        if (accent) i++;
        sequence.push({ direction: 'up', accent });
      } else if (char === 'X' || char === '.') {
        // 闷音或休止，添加一个带 mute 的下扫
        sequence.push({ direction: 'down', mute: true });
      } else if (char === '>') {
        // 重音标记已在前面处理
        continue;
      }
    }
  }

  if (sequence.length === 0) return null;

  return {
    id: `custom-strum-${Date.now()}`,
    name: name || `自定义扫弦`,
    type: 'strumming',
    notation: input.trim(),
    sequence,
    tags: ['custom'],
  };
}

/**
 * 解析分解节奏型字符串
 * 支持格式：
 * - "6 3 2 3 1 3 2 3" - 空格分隔
 * - "6-3-2-3-1-3-2-3" - 短横线分隔
 * - "6>3 2 3" - > 表示重音
 */
export function parseArpeggioPattern(input: string, name?: string): ArpeggioPattern | null {
  if (!input.trim()) return null;

  const sequence: ArpeggioNote[] = [];
  
  // 按空格或短横线分割
  const tokens = input.trim().split(/[\s-]+/);
  
  for (const token of tokens) {
    const accent = token.includes('>');
    const stringNum = parseInt(token.replace(/[^0-9]/g, ''), 10);
    
    if (stringNum >= 1 && stringNum <= 6) {
      sequence.push({ string: stringNum, accent });
    }
  }

  if (sequence.length === 0) return null;

  return {
    id: `custom-arp-${Date.now()}`,
    name: name || `自定义分解`,
    type: 'arpeggio',
    notation: input.trim(),
    sequence,
    tags: ['custom'],
  };
}

/**
 * 验证扫弦节奏型输入
 */
export interface RhythmValidationResult {
  valid: boolean;
  errors: string[];
  pattern?: RhythmPattern;
}

export function validateStrummingInput(input: string): RhythmValidationResult {
  const errors: string[] = [];

  if (!input.trim()) {
    errors.push('请输入扫弦节奏型');
    return { valid: false, errors };
  }

  // 检查是否只包含有效字符
  const validChars = /^[DUdu↓↑xX.>\s]+$/;
  if (!validChars.test(input)) {
    const invalidChars = input.replace(/[DUdu↓↑xX.>\s]/g, '');
    errors.push(`包含无效字符: ${invalidChars}`);
  }

  const pattern = parseStrummingPattern(input);
  if (!pattern || pattern.sequence.length === 0) {
    errors.push('无法解析节奏型，请检查格式');
    return { valid: false, errors };
  }

  if (pattern.sequence.length < 2) {
    errors.push('节奏型至少需要2个动作');
    return { valid: false, errors };
  }

  if (pattern.sequence.length > 32) {
    errors.push('节奏型最多支持32个动作');
    return { valid: false, errors };
  }

  return { valid: errors.length === 0, errors, pattern };
}

export function validateArpeggioInput(input: string): RhythmValidationResult {
  const errors: string[] = [];

  if (!input.trim()) {
    errors.push('请输入分解节奏型');
    return { valid: false, errors };
  }

  // 检查是否只包含有效字符
  const validChars = /^[1-6>\s-]+$/;
  if (!validChars.test(input)) {
    const invalidChars = input.replace(/[1-6>\s-]/g, '');
    errors.push(`包含无效字符: ${invalidChars}。分解节奏型只能使用数字 1-6`);
  }

  const pattern = parseArpeggioPattern(input);
  if (!pattern || pattern.sequence.length === 0) {
    errors.push('无法解析节奏型，请检查格式');
    return { valid: false, errors };
  }

  if (pattern.sequence.length < 2) {
    errors.push('节奏型至少需要2个音符');
    return { valid: false, errors };
  }

  if (pattern.sequence.length > 32) {
    errors.push('节奏型最多支持32个音符');
    return { valid: false, errors };
  }

  return { valid: errors.length === 0, errors, pattern };
}

// =============================================================================
// LocalStorage 管理
// =============================================================================

const CUSTOM_RHYTHM_PATTERNS_KEY = 'custom-rhythm-patterns';
const RHYTHM_PATTERN_PREFERENCES_KEY = 'rhythm-pattern-preferences';

/**
 * 加载自定义节奏型
 */
export function loadCustomRhythmPatterns(): CustomRhythmPattern[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(CUSTOM_RHYTHM_PATTERNS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (e) {
    console.warn('Failed to load custom rhythm patterns:', e);
    return [];
  }
}

/**
 * 保存自定义节奏型
 */
export function saveCustomRhythmPatterns(patterns: CustomRhythmPattern[]): void {
  try {
    localStorage.setItem(CUSTOM_RHYTHM_PATTERNS_KEY, JSON.stringify(patterns));
  } catch (e) {
    console.warn('Failed to save custom rhythm patterns:', e);
  }
}

/**
 * 加载节奏型偏好
 */
export function loadRhythmPatternPreferences(): Record<string, RhythmPatternPreference> {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(RHYTHM_PATTERN_PREFERENCES_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch (e) {
    console.warn('Failed to load rhythm pattern preferences:', e);
    return {};
  }
}

/**
 * 保存节奏型偏好
 */
export function saveRhythmPatternPreferences(prefs: Record<string, RhythmPatternPreference>): void {
  try {
    localStorage.setItem(RHYTHM_PATTERN_PREFERENCES_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('Failed to save rhythm pattern preferences:', e);
  }
}
