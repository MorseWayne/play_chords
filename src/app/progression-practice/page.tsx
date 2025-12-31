'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Guitar, Home, Music2, Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { useAudio } from '@/hooks/useAudio';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { useProgressionPlayer } from '@/hooks/useProgressionPlayer';
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

  const progressionId = settings.progressionId;
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

  const { initAudio, isReady, state: audioState, playArpeggio, playStrum } = useAudio();

  const progression: ProgressionDefinition | undefined = useMemo(
    () => COMMON_PROGRESSIONS.find((p) => p.id === progressionId) ?? COMMON_PROGRESSIONS[0],
    [progressionId],
  );

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
      if (!chord?.midi) return;
      if (playStyle === 'arpeggio') playArpeggio(chord.midi);
      else playStrum(chord.midi);
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
      if (!chord?.midi) return;
      if (playStyle === 'arpeggio') playArpeggio(chord.midi);
      else playStrum(chord.midi);
    },
    [generated, getCurrentChordPosition, initAudio, isReady, playArpeggio, playStrum, playStyle],
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
    setVariantByIndex((m) => ({ ...m, [idx]: v }));
  };

  const title = progression?.name ?? '走向练习';
  const subtitle = progression?.notes ?? '选择走向、设置参数，开始动态练习。';

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 border">
              <Guitar className="h-5 w-5 text-primary" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-semibold">和弦走向练习</div>
              <div className="text-xs text-muted-foreground">动态推进 · 强交互 · 可循环</div>
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
            <div className="mt-3 space-y-2">
              <label className="text-[10px] text-muted-foreground block">选择走向</label>
              <Select value={progressionId} onValueChange={(v) => setProgressionId(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="选择走向" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_PROGRESSIONS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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
                    <div className="text-xs text-muted-foreground">变体</div>
                    <div className="text-xs text-muted-foreground">
                      {currentTotal > 0 ? `${currentVariant + 1}/${currentTotal}` : '0/0'}
                    </div>
                  </div>
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
    </div>
  );
}

