'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Guitar, Home, Music2, Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2, Plus, Search, X, Filter, Star, Trash2 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useAudio } from '@/hooks/useAudio';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { useProgressionPlayer } from '@/hooks/useProgressionPlayer';
import { useCustomProgressions, type CustomProgressionDefinition } from '@/hooks/useCustomProgressions';
import { useVoicingPreferences } from '@/hooks/useVoicingPreferences';
import { useRhythmPatternPreferences } from '@/hooks/useRhythmPatternPreferences';
import { RhythmPatternSelector } from '@/components/RhythmPatternSelector';
import type { StrummingPattern, ArpeggioPattern } from '@/lib/rhythms';
import { ChordDiagram } from '@/components/ChordDiagram';
import { formatSuffix, getAvailableKeys, getChordData } from '@/lib/chords';
import { generateGuitarVoicings, pickPracticalVoicings } from '@/lib/voicings';
import {
  COMMON_PROGRESSIONS,
  generateProgressionChords,
  normalizeKeyToAppKey,
  type GeneratedProgressionChord,
  type PlayStyle,
  type ProgressionDefinition,
  type ProgressionMode,
} from '@/lib/progressions';
import {
  parseRomanNumeralString,
  validateRomanNumeralInput,
  parseChordNameString,
  validateChordNameInput,
  convertChordNamesToProgression,
  type ValidationResult,
} from '@/lib/progressions-utils';

type PracticeMode = 'follow' | 'memory' | 'ear';

type StoredSettings = {
  progressionId: string;
  tonic: string;
  scaleMode: ProgressionMode;
  bpm: number;
  beatsPerChord: number;
  loop: boolean;
  playStyle: PlayStyle;
  practiceMode: PracticeMode;
};

const STORAGE_KEY = 'progression-practice-settings';

function clamp(n: number, min: number, max: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

function getNextIndex(idx: number, len: number): number {
  if (len <= 0) return 0;
  return (idx + 1) % len;
}

function pickRandomDistinct<T>(arr: T[], count: number, avoid?: T): T[] {
  const pool = arr.filter((x) => x !== avoid);
  const copy = pool.slice();
  const out: T[] = [];
  while (copy.length > 0 && out.length < count) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

const DEFAULT_SETTINGS: StoredSettings = {
  progressionId: COMMON_PROGRESSIONS[0]?.id ?? 'pop-1564',
  tonic: 'C',
  scaleMode: 'major',
  bpm: 100,
  beatsPerChord: 4,
  loop: true,
  playStyle: 'strum',
  practiceMode: 'follow',
};

function coerceSettings(input: unknown): StoredSettings {
  const raw = (input ?? {}) as Partial<StoredSettings>;
  const progressionId =
    typeof raw.progressionId === 'string' ? raw.progressionId : DEFAULT_SETTINGS.progressionId;
  const tonic = typeof raw.tonic === 'string' ? raw.tonic : DEFAULT_SETTINGS.tonic;
  const scaleMode: ProgressionMode = raw.scaleMode === 'minor' ? 'minor' : 'major';
  const bpm = typeof raw.bpm === 'number' ? clamp(raw.bpm, 40, 240) : DEFAULT_SETTINGS.bpm;
  const beatsPerChord =
    typeof raw.beatsPerChord === 'number' ? clamp(raw.beatsPerChord, 1, 16) : DEFAULT_SETTINGS.beatsPerChord;
  const loop = typeof raw.loop === 'boolean' ? raw.loop : DEFAULT_SETTINGS.loop;
  const playStyle: PlayStyle = raw.playStyle === 'arpeggio' ? 'arpeggio' : 'strum';
  const practiceMode: PracticeMode =
    raw.practiceMode === 'memory' ? 'memory' : raw.practiceMode === 'ear' ? 'ear' : 'follow';

  return {
    progressionId,
    tonic,
    scaleMode,
    bpm,
    beatsPerChord,
    loop,
    playStyle,
    practiceMode,
  };
}

export default function ProgressionPracticePage() {
  const keys = getAvailableKeys();

  const [settings, setSettings] = useLocalStorageState<StoredSettings>(STORAGE_KEY, DEFAULT_SETTINGS, {
    parse: (raw) => coerceSettings(JSON.parse(raw)),
    serialize: (value) => JSON.stringify(value),
  });

  // 自定义走向管理
  const { progressions: customProgressions, addProgression, deleteProgression, toggleFavorite } = useCustomProgressions();
  
  // 自定义走向对话框状态
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [customInputMode, setCustomInputMode] = useState<'roman' | 'chord'>('roman');
  const [customValidation, setCustomValidation] = useState<ValidationResult | null>(null);
  const [customInferredKey, setCustomInferredKey] = useState('C');
  const [customInferredMode, setCustomInferredMode] = useState<ProgressionMode>('major');

  const progressionId = settings.progressionId;
  
  // 把位偏好管理
  const { preferences: voicingPreferences, setVoicing: setVoicingPref } = useVoicingPreferences(progressionId);
  
  // 节奏型偏好管理
  const {
    preference: rhythmPreference,
    currentPattern: rhythmPattern,
    setPattern: setRhythmPattern,
    clearPattern: clearRhythmPattern,
    customPatterns: customRhythmPatterns,
    addCustomPattern: addCustomRhythmPattern,
    deleteCustomPattern: deleteCustomRhythmPattern,
    allStrummingPatterns,
    allArpeggioPatterns,
  } = useRhythmPatternPreferences(progressionId);
  
  const tonic = settings.tonic;
  const scaleMode = settings.scaleMode;
  const practiceMode = settings.practiceMode;
  const bpm = settings.bpm;
  const beatsPerChord = settings.beatsPerChord;
  const loop = settings.loop;
  const playStyle = settings.playStyle;

  const setProgressionId = useCallback(
    (id: string) => setSettings((s) => ({ ...s, progressionId: id })),
    [setSettings],
  );
  const setTonic = useCallback((k: string) => setSettings((s) => ({ ...s, tonic: k })), [setSettings]);
  const setScaleMode = useCallback(
    (m: ProgressionMode) => setSettings((s) => ({ ...s, scaleMode: m })),
    [setSettings],
  );
  const setBpm = useCallback((v: number) => setSettings((s) => ({ ...s, bpm: clamp(v, 40, 240) })), [setSettings]);
  const setBeatsPerChord = useCallback(
    (v: number) => setSettings((s) => ({ ...s, beatsPerChord: clamp(v, 1, 16) })),
    [setSettings],
  );
  const setLoop = useCallback((v: boolean) => setSettings((s) => ({ ...s, loop: v })), [setSettings]);
  const setPlayStyle = useCallback(
    (v: PlayStyle) => setSettings((s) => ({ ...s, playStyle: v })),
    [setSettings],
  );

  // memory mode stats
  const [revealCount, setRevealCount] = useState(0);
  const [isNextRevealed, setIsNextRevealed] = useState(false);

  // ear mode stats
  const [earTotal, setEarTotal] = useState(0);
  const [earCorrect, setEarCorrect] = useState(0);
  const [earAnswer, setEarAnswer] = useState<string | null>(null);
  const [earResult, setEarResult] = useState<'idle' | 'correct' | 'wrong'>('idle');

  const { 
    initAudio, 
    isReady, 
    state: audioState, 
    playArpeggio, 
    playStrum, 
    playWithStrummingPattern,
    playWithArpeggioPattern,
    volume, 
    updateVolume 
  } = useAudio();

  // 合并预置走向和自定义走向
  const allProgressions: ProgressionDefinition[] = useMemo(() => {
    return [...COMMON_PROGRESSIONS, ...customProgressions];
  }, [customProgressions]);

  const progression: ProgressionDefinition | undefined = useMemo(
    () => allProgressions.find((p) => p.id === progressionId) ?? allProgressions[0],
    [progressionId, allProgressions],
  );

  // 自定义走向输入验证
  useEffect(() => {
    if (!customInput) {
      setCustomValidation(null);
      return;
    }

    if (customInputMode === 'roman') {
      const validation = validateRomanNumeralInput(customInput);
      setCustomValidation(validation);
    } else {
      const validation = validateChordNameInput(customInput);
      setCustomValidation(validation);
      
      // 如果验证通过，尝试推断调性
      if (validation.valid) {
        const parsed = parseChordNameString(customInput);
        if (parsed) {
          setCustomInferredKey(parsed.inferredKey ?? 'C');
          setCustomInferredMode(parsed.inferredMode ?? 'major');
        }
      }
    }
  }, [customInput, customInputMode]);

  // 走向分类筛选
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 获取所有可用的标签
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    [...COMMON_PROGRESSIONS, ...customProgressions].forEach(p => {
      p.tags.forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [customProgressions]);

  // 筛选后的走向（带排序）
  const filteredProgressions = useMemo(() => {
    let progs = [...COMMON_PROGRESSIONS, ...customProgressions];
    
    // 标签筛选
    if (selectedTags.length > 0) {
      progs = progs.filter(p => 
        selectedTags.some(tag => p.tags.includes(tag))
      );
    }
    
    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      progs = progs.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.notes?.toLowerCase().includes(query) ?? false)
      );
    }
    
    // 排序：收藏的自定义走向置顶
    return progs.sort((a, b) => {
      const aFav = 'isFavorite' in a && a.isFavorite ? 1 : 0;
      const bFav = 'isFavorite' in b && b.isFavorite ? 1 : 0;
      return bFav - aFav;
    });
  }, [customProgressions, selectedTags, searchQuery]);

  // 保存自定义走向
  const handleSaveCustomProgression = useCallback(() => {
    if (!customName.trim() || !customInput.trim() || !customValidation?.valid) {
      return;
    }

    let romanNumerals: string[];

    if (customInputMode === 'roman') {
      romanNumerals = parseRomanNumeralString(customInput);
    } else {
      // 和弦名称模式：先解析，然后转换为罗马数字
      const parsed = parseChordNameString(customInput);
      if (!parsed) return;

      // 使用推断的或用户指定的调性
      const chords = convertChordNamesToProgression(parsed.chords, customInferredKey, customInferredMode);
      romanNumerals = chords.map(c => c.roman);
    }

    const newProgression: Omit<CustomProgressionDefinition, 'createdAt' | 'updatedAt' | 'isCustom'> = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      romanNumerals,
      tags: ['custom'],
      defaultBpm: 100,
      notes: customInputMode === 'chord' ? `基于和弦：${customInput}` : undefined,
    };

    const saved = addProgression(newProgression);
    
    // 切换到新创建的走向
    setProgressionId(saved.id);
    
    // 关闭对话框并重置
    setCustomDialogOpen(false);
    setCustomName('');
    setCustomInput('');
    setCustomValidation(null);
  }, [customName, customInput, customValidation, customInputMode, customInferredKey, customInferredMode, addProgression, setProgressionId]);

  const generated = useMemo(() => {
    if (!progression) return [];
    return generateProgressionChords({
      tonic: normalizeKeyToAppKey(tonic),
      mode: scaleMode,
      romanNumerals: progression.romanNumerals,
    });
  }, [progression, scaleMode, tonic]);

  // Precompute voicings for each chord in the progression (MVP: keep it small)
  const chordVoicings = useMemo(() => {
    const map = new Map<number, ReturnType<typeof pickPracticalVoicings>>();
    generated.forEach((ch, idx) => {
      const chordData = getChordData(ch.key, ch.suffix);
      const gen = generateGuitarVoicings(ch.key, ch.suffix, { maxFret: 15, maxSpan: 5, maxResults: 25 });
      const picked = pickPracticalVoicings(ch.key, ch.suffix, chordData?.positions ?? [], gen, {
        limit: 10,
        maxFret: 15,
      });
      map.set(idx, picked);
    });
    return map;
  }, [generated]);

  const [variantByIndex, setVariantByIndex] = useState<Record<number, number>>({});

  // 从持久化偏好加载把位设置
  useEffect(() => {
    setVariantByIndex(voicingPreferences);
  }, [progressionId, voicingPreferences]);

  const getCurrentChordPosition = useCallback(
    (idx: number) => {
    const positions = chordVoicings.get(idx) ?? [];
    const total = positions.length;
    const variant = total > 0 ? Math.min(Math.max(0, variantByIndex[idx] ?? 0), total - 1) : 0;
    return { positions, total, variant, chord: positions[variant] ?? null };
    },
    [chordVoicings, variantByIndex],
  );

  const player = useProgressionPlayer({
    length: generated.length,
    bpm,
    beatsPerChord,
    loop,
    onStep: (idx) => {
      // reset per-mode transient state on step
      setIsNextRevealed(false);
      setEarAnswer(null);
      setEarResult('idle');

      // auto-play chord on each step (follow/memory); ear mode plays on-demand
      if (practiceMode === 'ear') return;
      const { chord } = getCurrentChordPosition(idx);
      if (!chord?.midi || !chord?.frets) return;
      
      // 如果设置了节奏型，使用节奏型播放
      if (rhythmPattern) {
        const voicing = { frets: chord.frets };
        if (rhythmPattern.type === 'strumming') {
          playWithStrummingPattern(voicing, rhythmPattern as StrummingPattern, bpm);
        } else {
          playWithArpeggioPattern(voicing, rhythmPattern as ArpeggioPattern, bpm);
        }
      } else {
        // 否则使用简单的播放方式
        if (playStyle === 'arpeggio') playArpeggio(chord.midi);
        else playStrum(chord.midi);
      }
    },
  });

  const current = generated[player.currentIndex];
  const next = generated[getNextIndex(player.currentIndex, generated.length)];

  const togglePlay = useCallback(async () => {
    if (!isReady) await initAudio();
    if (player.isPlaying) player.stop();
    else player.start();
  }, [initAudio, isReady, player]);

  const playOneChord = useCallback(
    async (idx: number) => {
      const ch = generated[idx];
      if (!ch) return;
      if (!isReady) await initAudio();
      const { chord } = getCurrentChordPosition(idx);
      if (!chord?.midi || !chord?.frets) return;
      
      // 如果设置了节奏型，使用节奏型播放
      if (rhythmPattern) {
        const voicing = { frets: chord.frets };
        if (rhythmPattern.type === 'strumming') {
          playWithStrummingPattern(voicing, rhythmPattern as StrummingPattern, bpm);
        } else {
          playWithArpeggioPattern(voicing, rhythmPattern as ArpeggioPattern, bpm);
        }
      } else {
        // 否则使用简单的播放方式
        if (playStyle === 'arpeggio') playArpeggio(chord.midi);
        else playStrum(chord.midi);
      }
    },
    [generated, getCurrentChordPosition, initAudio, isReady, playArpeggio, playStrum, playStyle, rhythmPattern, playWithStrummingPattern, playWithArpeggioPattern, bpm],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        player.next();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        player.prev();
      }
      if (e.key === 'Escape') {
        player.stop();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [player, togglePlay]);

  // Ear mode: build options for the "next" chord
  const earOptions = useMemo(() => {
    if (practiceMode !== 'ear') return [];
    if (!next) return [];
    const seed = player.currentIndex + generated.length * 97;
    const distractors = pickRandomDistinct(generated, 3, next);
    const options = [...distractors, next];
    // deterministic-ish shuffle based on seed
    return options
      .map((x, i) => ({ x, k: Math.sin(seed * 999 + i * 13) }))
      .sort((a, b) => a.k - b.k)
      .map((p) => p.x);
  }, [generated, next, practiceMode, player.currentIndex]);

  const answerEar = (choice: GeneratedProgressionChord) => {
    if (!next) return;
    if (earAnswer) return;

    const isCorrect = choice.key === next.key && choice.suffix === next.suffix;
    setEarAnswer(`${choice.key}${formatSuffix(choice.suffix)}`);
    setEarTotal((n) => n + 1);
    if (isCorrect) setEarCorrect((n) => n + 1);
    setEarResult(isCorrect ? 'correct' : 'wrong');
  };

  const { chord: currentChordPos, total: currentTotal, variant: currentVariant } = getCurrentChordPosition(
    player.currentIndex,
  );

  const setVariant = (idx: number, v: number) => {
    setVariantByIndex((m) => {
      const updated = { ...m, [idx]: v };
      // 保存到持久化存储
      setVoicingPref(idx, v);
      return updated;
    });
  };

  const title = progression?.name ?? '走向练习';
  const subtitle = progression?.notes ?? '选择走向、设置参数，开始动态练习。';

  return (
    <div className="min-h-screen bg-background pb-10 lg:pb-10 pb-24">{/* 移动端底部留空间 */}
      <header className="sticky top-0 z-10 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex h-14 lg:h-16 max-w-6xl items-center justify-between px-3 lg:px-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="grid h-8 w-8 lg:h-10 lg:w-10 place-items-center rounded-2xl bg-primary/10 border">
              <Guitar className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
            </div>
            <div className="leading-tight">
              <div className="text-sm lg:text-base font-semibold">和弦走向练习</div>
              <div className="text-[10px] lg:text-xs text-muted-foreground hidden sm:block">动态推进 · 强交互 · 可循环</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="h-9 gap-2">
              <Link href="/">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">返回主页</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3 items-start">
          {/* Left: progression library */}
          <Card className="rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">走向库</div>
              <Badge variant="secondary" className="text-xs">
                {COMMON_PROGRESSIONS.length} 个
              </Badge>
            </div>
            <div className="mt-3 space-y-3">
              <label className="text-[10px] text-muted-foreground block">走向库</label>
              
              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索走向..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 pr-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* 标签筛选 */}
              {allTags.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">风格筛选</span>
                    {selectedTags.length > 0 && (
                      <button
                        onClick={() => setSelectedTags([])}
                        className="text-[10px] text-primary hover:underline"
                      >
                        清除
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map(tag => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                        className="cursor-pointer text-[10px] h-6"
                        onClick={() => {
                          setSelectedTags(prev =>
                            prev.includes(tag)
                              ? prev.filter(t => t !== tag)
                              : [...prev, tag]
                          );
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 走向选择器 */}
              <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground block">
                  选择走向 ({filteredProgressions.length})
                </label>
                <Select value={progressionId} onValueChange={(v) => setProgressionId(v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="选择走向" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    {/* 预置走向 */}
                    {filteredProgressions.filter(p => !('isCustom' in p)).length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          预置走向
                        </div>
                        {filteredProgressions
                          .filter(p => !('isCustom' in p))
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex items-center gap-2">
                                <span>{p.name}</span>
                                {p.tags.slice(0, 2).map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-[9px] h-4 px-1">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </SelectItem>
                          ))}
                      </>
                    )}
                    
                    {/* 自定义走向 */}
                    {filteredProgressions.filter(p => 'isCustom' in p).length > 0 && (
                      <>
                        {filteredProgressions.filter(p => !('isCustom' in p)).length > 0 && (
                          <Separator className="my-2" />
                        )}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          自定义走向
                        </div>
                        {filteredProgressions
                          .filter(p => 'isCustom' in p)
                          .map((p) => {
                            const custom = p as CustomProgressionDefinition;
                            return (
                              <SelectItem key={p.id} value={p.id}>
                                <div className="flex items-center justify-between w-full gap-2">
                                  <div className="flex items-center gap-2">
                                    {custom.isFavorite && (
                                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                    )}
                                    <span>{p.name}</span>
                                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                                      自定义
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(p.id);
                                      }}
                                      className="hover:text-yellow-500"
                                      title={custom.isFavorite ? '取消收藏' : '收藏'}
                                    >
                                      <Star className={`h-3 w-3 ${custom.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`确定删除走向"${p.name}"吗？`)) {
                                          deleteProgression(p.id);
                                          // 如果删除的是当前选中的走向，切换到第一个
                                          if (progressionId === p.id && allProgressions.length > 1) {
                                            setProgressionId(allProgressions[0].id);
                                          }
                                        }
                                      }}
                                      className="hover:text-destructive"
                                      title="删除"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              </SelectItem>
                            );
                          })}
                      </>
                    )}

                    {filteredProgressions.length === 0 && (
                      <div className="px-2 py-8 text-center text-sm text-muted-foreground">
                        没有找到匹配的走向
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 gap-2"
                onClick={() => setCustomDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                添加自定义走向
              </Button>

              <div className="pt-2 text-xs">
                <div className="font-medium">{title}</div>
                <div className="text-muted-foreground mt-1">{subtitle}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(progression?.tags ?? []).map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator className="my-3" />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">调性</label>
                  <Select value={tonic} onValueChange={(v) => setTonic(v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Key" />
                    </SelectTrigger>
                    <SelectContent>
                      {keys.map((k) => (
                        <SelectItem key={k} value={k}>
                          {k}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">大小调</label>
                  <Select value={scaleMode} onValueChange={(v) => setScaleMode(v as ProgressionMode)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="major">大调 (Major)</SelectItem>
                      <SelectItem value="minor">小调 (Minor)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">播放方式</label>
                  <Select value={playStyle} onValueChange={(v) => setPlayStyle(v as PlayStyle)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strum">扫弦</SelectItem>
                      <SelectItem value="arpeggio">分解</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">循环</label>
                  <Select value={loop ? 'on' : 'off'} onValueChange={(v) => setLoop(v === 'on')}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on">开启</SelectItem>
                      <SelectItem value="off">关闭</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 节奏型选择器 */}
              <div className="pt-3 border-t mt-3">
                <RhythmPatternSelector
                  preference={rhythmPreference}
                  currentPattern={rhythmPattern}
                  onSelectPattern={setRhythmPattern}
                  onClearPattern={clearRhythmPattern}
                  customPatterns={customRhythmPatterns}
                  onAddCustomPattern={addCustomRhythmPattern}
                  onDeleteCustomPattern={deleteCustomRhythmPattern}
                  previewVoicing={getCurrentChordPosition(player.currentIndex).chord ? { frets: getCurrentChordPosition(player.currentIndex).chord!.frets } : undefined}
                  bpm={bpm}
                  compact
                />
              </div>

              <div className="pt-2">
                <label className="text-[10px] text-muted-foreground mb-1 block">BPM（40-240）</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[clamp(bpm, 40, 240)]}
                    min={40}
                    max={240}
                    step={1}
                    onValueChange={(v) => setBpm(v[0] ?? 120)}
                  />
                  <Input
                    className="h-9 w-20 text-sm"
                    value={bpm}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, bpm: clamp(Number(e.target.value), 40, 240) }))
                    }
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="text-[10px] text-muted-foreground mb-1 block">每个和弦持续拍数（1-16）</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[clamp(beatsPerChord, 1, 16)]}
                    min={1}
                    max={16}
                    step={1}
                    onValueChange={(v) => setBeatsPerChord(v[0] ?? 4)}
                  />
                  <Input
                    className="h-9 w-20 text-sm"
                    value={beatsPerChord}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, beatsPerChord: clamp(Number(e.target.value), 1, 16) }))
                    }
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="text-[10px] text-muted-foreground mb-1 block">音量（0-100）</label>
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Slider
                    value={[volume]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(values) => updateVolume(values[0])}
                  />
                  <span className="text-xs text-muted-foreground w-12 text-right">{volume}</span>
                </div>
              </div>

              <Separator className="my-3" />

              <div className="flex flex-col gap-2">
                {!isReady && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={initAudio}
                    disabled={audioState === 'loading'}
                    className="h-9 text-xs"
                  >
                    {audioState === 'loading' ? '加载中…' : '加载音色（首次需要点击）'}
                  </Button>
                )}

                <div className="grid grid-cols-4 gap-2">
                  <Button size="sm" variant="outline" onClick={() => player.prev()} disabled={generated.length === 0}>
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={togglePlay} disabled={generated.length === 0}>
                    {player.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => player.next()} disabled={generated.length === 0}>
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      player.stop();
                      player.reset();
                    }}
                    disabled={generated.length === 0}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>
                    当前：{player.currentIndex + 1}/{generated.length || 0}
                  </span>
                  <span>
                    拍：{player.beatInChord}/{clamp(beatsPerChord, 1, 16)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Right: practice */}
          <div className="space-y-3">
            <Card className="rounded-xl p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">当前和弦</div>
                  <div className="text-2xl font-bold tracking-tight truncate">
                    {current ? `${current.key}${formatSuffix(current.suffix)}` : '—'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {current ? `罗马数字：${current.roman}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => playOneChord(player.currentIndex)}
                    disabled={!current || generated.length === 0}
                    className="gap-2"
                  >
                    <Volume2 className="h-4 w-4" />
                    试听
                  </Button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-3 items-center">
                <div className="flex items-center justify-center">
                  {currentChordPos ? (
                    <ChordDiagram
                      frets={currentChordPos.frets}
                      fingers={currentChordPos.fingers}
                      barres={currentChordPos.barres}
                      baseFret={currentChordPos.baseFret}
                      size="large"
                    />
                  ) : (
                    <div className="text-xs text-muted-foreground">暂无指法</div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">把位选择</div>
                    <div className="text-xs text-muted-foreground">
                      {currentTotal > 0 ? `${currentVariant + 1}/${currentTotal}` : '0/0'}
                    </div>
                  </div>
                  
                  {/* 把位按钮组（优化视觉） */}
                  {currentTotal > 1 && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {chordVoicings.get(player.currentIndex)?.slice(0, 8).map((voicing, vIdx) => {
                          const positiveFrets = voicing.frets.filter(f => f > 0);
                          const minFret = positiveFrets.length === 0 ? 0 : Math.min(...positiveFrets);
                          const maxFret = positiveFrets.length === 0 ? 0 : Math.max(...positiveFrets);
                          const span = maxFret - minFret;
                          
                          // 指法说明
                          const desc = minFret === 0 
                            ? '开放和弦' 
                            : span <= 3
                              ? `${minFret}品 (跨${span}品)`
                              : `${minFret}品 (跨${span}品·较难)`;
                          
                          return (
                            <Button
                              key={vIdx}
                              size="sm"
                              variant={vIdx === currentVariant ? 'default' : 'outline'}
                              className={`h-auto px-2.5 py-1.5 flex flex-col items-start gap-0.5 ${
                                span > 4 ? 'opacity-60' : ''
                              }`}
                              onClick={() => {
                                setVariant(player.currentIndex, vIdx);
                                // 自动试听新把位
                                const { chord } = getCurrentChordPosition(player.currentIndex);
                                if (chord?.midi) {
                                  setTimeout(() => {
                                    if (playStyle === 'arpeggio') playArpeggio(chord.midi);
                                    else playStrum(chord.midi);
                                  }, 50);
                                }
                              }}
                              title={desc}
                            >
                              <span className="text-xs font-semibold">
                                {minFret === 0 ? '开放' : `${minFret}品`}
                              </span>
                              {minFret > 0 && (
                                <span className="text-[9px] text-muted-foreground">
                                  跨{span}品
                                </span>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                      
                      {currentTotal > 8 && (
                        <div className="text-[10px] text-muted-foreground text-center">
                          显示前 8 个常用把位，使用上/下按钮查看更多
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setVariant(player.currentIndex, Math.max(0, currentVariant - 1))}
                      disabled={currentTotal <= 1}
                    >
                      <SkipBack className="h-4 w-4 mr-1" />
                      上一把位
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setVariant(player.currentIndex, Math.min(currentTotal - 1, currentVariant + 1))}
                      disabled={currentTotal <= 1}
                    >
                      下一把位
                      <SkipForward className="h-4 w-4 ml-1" />
                    </Button>
                  </div>

                  <Separator className="my-2" />

                  <div className="text-xs text-muted-foreground">下一和弦</div>
                  <div className="text-base font-semibold">
                    {next ? `${next.key}${formatSuffix(next.suffix)}` : '—'}{' '}
                    <span className="text-xs text-muted-foreground ml-2">{next ? next.roman : ''}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="rounded-xl p-3">
              <Tabs
                value={practiceMode}
                onValueChange={(v) => {
                  player.stop();
                    setSettings((s) => ({ ...s, practiceMode: v as PracticeMode }));
                  setRevealCount(0);
                  setIsNextRevealed(false);
                  setEarTotal(0);
                  setEarCorrect(0);
                  setEarAnswer(null);
                  setEarResult('idle');
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Music2 className="h-4 w-4" />
                    练习模式
                  </div>
                  <TabsList className="h-9">
                    <TabsTrigger value="follow" className="text-xs">
                      跟随
                    </TabsTrigger>
                    <TabsTrigger value="memory" className="text-xs">
                      记忆
                    </TabsTrigger>
                    <TabsTrigger value="ear" className="text-xs">
                      听辨
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="follow" className="mt-3">
                  <div className="text-sm font-medium">跟随模式</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    显示当前与下一和弦，按节拍自动推进（点击播放即可开始）。
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Card className="rounded-xl p-3">
                      <div className="text-[10px] text-muted-foreground">当前</div>
                      <div className="text-xl font-bold mt-1">
                        {current ? `${current.key}${formatSuffix(current.suffix)}` : '—'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{current?.roman ?? ''}</div>
                    </Card>
                    <Card className="rounded-xl p-3">
                      <div className="text-[10px] text-muted-foreground">下一</div>
                      <div className="text-xl font-bold mt-1">
                        {next ? `${next.key}${formatSuffix(next.suffix)}` : '—'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{next?.roman ?? ''}</div>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="memory" className="mt-3">
                  <div className="text-sm font-medium">记忆模式</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    默认隐藏下一和弦，你可以在需要时揭示。系统会统计揭示次数。
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      已揭示：<span className="font-semibold text-foreground">{revealCount}</span> 次
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!isNextRevealed) setRevealCount((n) => n + 1);
                        setIsNextRevealed(true);
                      }}
                      className="h-9"
                    >
                      揭示下一和弦
                    </Button>
                  </div>
                  <div className="mt-3 rounded-xl border p-3">
                    <div className="text-[10px] text-muted-foreground">下一和弦</div>
                    <div className="text-xl font-bold mt-1">
                      {isNextRevealed && next ? `${next.key}${formatSuffix(next.suffix)}` : '？？'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{isNextRevealed ? next?.roman ?? '' : ''}</div>
                  </div>
                </TabsContent>

                <TabsContent value="ear" className="mt-3">
                  <div className="text-sm font-medium">听辨模式</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    系统播放“下一和弦”，你从 4 个选项中选择。统计正确率（MVP：手动出题，不自动推进）。
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => playOneChord(getNextIndex(player.currentIndex, generated.length))}
                      disabled={!next || generated.length === 0}
                      className="gap-2 h-9"
                    >
                      <Volume2 className="h-4 w-4" />
                      播放下一和弦
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => player.next()} disabled={generated.length === 0}>
                      下一题（推进）
                    </Button>
                    <div className="text-xs text-muted-foreground ml-auto">
                      正确率：{earTotal > 0 ? `${Math.round((earCorrect / earTotal) * 100)}%` : '—'}（{earCorrect}/
                      {earTotal}）
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {earOptions.map((opt) => {
                      const label = `${opt.key}${formatSuffix(opt.suffix)}`;
                      const isPicked = earAnswer === label;
                      const variant =
                        earResult === 'idle'
                          ? isPicked
                            ? 'secondary'
                            : 'outline'
                          : earResult === 'correct'
                            ? isPicked
                              ? 'default'
                              : 'outline'
                            : isPicked
                              ? 'destructive'
                              : 'outline';
                      return (
                        <Button
                          key={`${opt.roman}-${opt.key}-${opt.suffix}`}
                          variant={variant as never}
                          size="sm"
                          className="h-11 justify-between"
                          onClick={() => answerEar(opt)}
                        >
                          <span className="font-semibold">{label}</span>
                          <span className="text-xs opacity-70">{opt.roman}</span>
                        </Button>
                      );
                    })}
                  </div>

                  {earResult !== 'idle' && (
                    <div className="mt-3 text-sm">
                      {earResult === 'correct' ? (
                        <div className="text-primary font-semibold">正确！</div>
                      ) : (
                        <div className="text-destructive font-semibold">
                          不对哦，正确答案是：{next ? `${next.key}${formatSuffix(next.suffix)}` : '—'}
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>

        <Card className="rounded-xl p-3">
          <div className="text-sm font-semibold">走向预览</div>
          <div className="text-xs text-muted-foreground mt-1">
            以 “罗马数字 → 实际和弦” 形式展示（{tonic} {scaleMode === 'major' ? 'Major' : 'Minor'}）
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {generated.map((ch, idx) => {
              const isActive = idx === player.currentIndex;
              const label = `${ch.key}${formatSuffix(ch.suffix)}`;
              return (
                <button
                  key={`${idx}-${ch.roman}-${label}`}
                  type="button"
                  onClick={() => player.setCurrentIndex(idx)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                    isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-accent'
                  }`}
                >
                  <span className="font-semibold">{label}</span>
                  <span className={`text-xs ${isActive ? 'opacity-90' : 'text-muted-foreground'}`}>{ch.roman}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </main>

      {/* 自定义走向对话框 */}
      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加自定义走向</DialogTitle>
            <DialogDescription>
              输入罗马数字或和弦名称来创建自己的和弦走向
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="custom-name">走向名称</Label>
              <Input
                id="custom-name"
                placeholder="我的练习走向"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="mt-1"
              />
            </div>

            <Tabs value={customInputMode} onValueChange={(v) => setCustomInputMode(v as 'roman' | 'chord')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="roman">罗马数字</TabsTrigger>
                <TabsTrigger value="chord">和弦名称</TabsTrigger>
              </TabsList>

              <TabsContent value="roman" className="space-y-3">
                <div>
                  <Label htmlFor="roman-input">罗马数字序列</Label>
                  <Textarea
                    id="roman-input"
                    placeholder="I V vi IV"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    className="mt-1 font-mono"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    示例：I V vi IV 或 ii7 V7 Imaj7（空格、逗号、短横线分隔均可）
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="chord" className="space-y-3">
                <div>
                  <Label htmlFor="chord-input">和弦名称序列</Label>
                  <Textarea
                    id="chord-input"
                    placeholder="C Am F G"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    className="mt-1 font-mono"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    示例：C Am F G 或 Dm7 G7 Cmaj7（空格、逗号、短横线分隔均可）
                  </p>
                </div>

                {customValidation?.valid && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="inferred-key">推断调性</Label>
                      <Select value={customInferredKey} onValueChange={setCustomInferredKey}>
                        <SelectTrigger id="inferred-key" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {keys.map((k) => (
                            <SelectItem key={k} value={k}>{k}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="inferred-mode">大小调</Label>
                      <Select value={customInferredMode} onValueChange={(v) => setCustomInferredMode(v as ProgressionMode)}>
                        <SelectTrigger id="inferred-mode" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="major">大调 (Major)</SelectItem>
                          <SelectItem value="minor">小调 (Minor)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {customValidation && !customValidation.valid && (
              <Alert variant="destructive">
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {customValidation.errors.map((error, idx) => (
                      <li key={idx}>{error.message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {customValidation?.warnings && customValidation.warnings.length > 0 && (
              <Alert>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {customValidation.warnings.map((warning, idx) => (
                      <li key={idx}>{warning.message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCustomDialogOpen(false);
                setCustomName('');
                setCustomInput('');
                setCustomValidation(null);
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleSaveCustomProgression}
              disabled={!customName.trim() || !customValidation?.valid}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

