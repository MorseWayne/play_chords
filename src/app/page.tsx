'use client';

import React, { useState, useMemo } from 'react';
import { ChordSelector } from '@/components/ChordSelector';
import { PlaybackControls } from '@/components/PlaybackControls';
import { MobileActionBar } from '@/components/MobileActionBar';
import { VoicingBrowser } from '@/components/VoicingBrowser';
import { MetronomeDialog } from '@/components/MetronomeDialog';
import { getChordData, formatSuffix, getSuffixLabel } from '@/lib/chords';
import { generateGuitarVoicings, pickPracticalVoicings } from '@/lib/voicings';
import { detectChordType, getChordTypeLabels, getChordTypeBadgeStyle } from '@/lib/chord-type';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Guitar, SlidersHorizontal, Volume2, Timer } from 'lucide-react';
import { ChordDiagram } from '@/components/ChordDiagram';
import { ChordKnowledge } from '@/components/ChordKnowledge';
import { cn } from '@/lib/utils';

// Standard tuning MIDI notes: E2=40, A2=45, D3=50, G3=55, B3=59, E4=64
const STANDARD_TUNING_MIDI = [40, 45, 50, 55, 59, 64];
const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Get the actual notes with octave played on each string for current voicing
function getVoicingNotesWithOctave(frets: number[]): (string | null)[] {
  return frets.map((fret, stringIndex) => {
    if (fret < 0) return null; // muted string
    const midi = STANDARD_TUNING_MIDI[stringIndex] + fret;
    const pitchClass = PITCH_CLASSES[midi % 12];
    const octave = Math.floor(midi / 12) - 1; // MIDI 60 = C4
    return `${pitchClass}${octave}`;
  });
}

export default function Home() {
  const [selectedKey, setSelectedKey] = useState('C');
  const [selectedSuffix, setSelectedSuffix] = useState('major');
  const [currentVariant, setCurrentVariant] = useState(0);
  const [metronomeOpen, setMetronomeOpen] = useState(false);
  
  const chordData = useMemo(() => {
    return getChordData(selectedKey, selectedSuffix);
  }, [selectedKey, selectedSuffix]);

  const generatedPositions = useMemo(() => {
    // Generate more voicings than the static DB provides (0-15 fret search)
    return generateGuitarVoicings(selectedKey, selectedSuffix, { maxFret: 15, maxSpan: 5, maxResults: 40 });
  }, [selectedKey, selectedSuffix]);

  const activePositions = useMemo(() => {
    // “常用把位优先”：先用 chords-db 的经典指法，再用生成器补齐，但只保留更实用的少量把位
    return pickPracticalVoicings(
      selectedKey,
      selectedSuffix,
      chordData?.positions ?? [],
      generatedPositions,
      { limit: 10, maxFret: 15 },
    );
  }, [selectedKey, selectedSuffix, chordData, generatedPositions]);
  const totalVariants = activePositions.length ?? 0;
  const safeVariant =
    totalVariants > 0 ? Math.min(Math.max(0, currentVariant), totalVariants - 1) : 0;
  const currentChord = activePositions?.[safeVariant] ?? null;

  const handleKeyChange = (key: string) => {
    setSelectedKey(key);
    setCurrentVariant(0);
  };

  const handleSuffixChange = (suffix: string) => {
    setSelectedSuffix(suffix);
    setCurrentVariant(0);
  };

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-16">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 border">
              <Guitar className="h-5 w-5 text-primary" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-semibold">Guitar Chord Master</div>
              <div className="text-xs text-muted-foreground">查指法 · 切把位 · 听扫弦/分解</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ChordKnowledge />
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <button
                  className="lg:hidden inline-flex h-9 items-center gap-2 rounded-xl border bg-background px-3 text-sm text-foreground shadow-sm hover:bg-accent"
                  type="button"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  和弦
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[340px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>选择和弦</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div className="sm:hidden">
                    <ChordKnowledge />
                  </div>
                  <ChordSelector
                    selectedKey={selectedKey}
                    selectedSuffix={selectedSuffix}
                    onKeyChange={handleKeyChange}
                    onSuffixChange={handleSuffixChange}
                  />
                </div>
              </SheetContent>
            </Sheet>
            
            {/* 节拍器按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMetronomeOpen(true)}
              className="h-9 gap-2"
            >
              <Timer className="h-4 w-4" />
              <span className="hidden sm:inline">节拍器</span>
            </Button>
            
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4 space-y-3">
        {/* Controls Row - 3 columns aligned */}
        <div className="hidden lg:grid lg:grid-cols-[180px_1fr_180px] gap-3 items-stretch">
          {/* 选择和弦 */}
          <Card className="rounded-xl p-3 flex flex-col">
            <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground">
              <SlidersHorizontal className="h-3 w-3" />
              选择
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <ChordSelector
                selectedKey={selectedKey}
                selectedSuffix={selectedSuffix}
                onKeyChange={handleKeyChange}
                onSuffixChange={handleSuffixChange}
              />
            </div>
          </Card>

          {/* 和弦指法卡片 */}
          <Card className="rounded-xl p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Guitar className="h-3 w-3" />
                指法
              </div>
              {/* 和弦类型标签 - 更大更醒目 */}
              {currentChord && (() => {
                const typeInfo = detectChordType(currentChord);
                const labels = getChordTypeLabels(typeInfo);
                return labels.length > 0 ? (
                  <div className="flex items-center gap-2">
                    {labels.map((label, i) => (
                      <span
                        key={i}
                        className={cn(
                          'inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold shadow-sm',
                          getChordTypeBadgeStyle(label)
                        )}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
            <div className="flex-1 flex items-center justify-center gap-6">
              {/* 左侧：和弦图 */}
              {currentChord && (
                <ChordDiagram
                  frets={currentChord.frets}
                  fingers={currentChord.fingers}
                  barres={currentChord.barres}
                  baseFret={currentChord.baseFret}
                  size="large"
                />
              )}
              
              {/* 右侧：和弦信息 */}
              <div className="flex flex-col items-center">
                {/* 和弦名称 */}
                <div className="text-4xl font-bold tracking-tight">
                  {selectedKey}{formatSuffix(selectedSuffix)}
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  {getSuffixLabel(selectedSuffix)}
                </div>
                
                {/* 每根弦的音符 */}
                {currentChord && (
                  <div className="flex flex-col items-center">
                    <div className="flex gap-1.5">
                      {getVoicingNotesWithOctave(currentChord.frets).map((note, i) => (
                        <span 
                          key={i} 
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold ${
                            note ? 'bg-primary/15 text-foreground' : 'bg-muted/40 text-muted-foreground'
                          }`}
                        >
                          {note || '×'}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 tracking-[0.2em]">
                      E  A  D  G  B  E
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* 试听 */}
          <Card className="rounded-xl p-3 flex flex-col">
            <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground">
              <Volume2 className="h-3 w-3" />
              试听
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <PlaybackControls chord={currentChord} />
            </div>
          </Card>
        </div>

        {/* Fretboard Display - Full Width */}
        <Card className="rounded-xl p-4">
          {activePositions.length > 0 ? (
            <VoicingBrowser
              root={selectedKey}
              positions={activePositions}
              currentVariant={safeVariant}
              onVariantChange={setCurrentVariant}
            />
          ) : (
            <div className="text-muted-foreground text-center py-8">暂无数据</div>
          )}
        </Card>
      </main>

      {/* Mobile fixed action bar */}
      <MobileActionBar
        chord={currentChord}
        currentVariant={safeVariant}
        totalVariants={totalVariants}
        onPrevVariant={() => setCurrentVariant((v) => Math.max(0, v - 1))}
        onNextVariant={() => setCurrentVariant((v) => Math.min(Math.max(0, totalVariants - 1), v + 1))}
      />

      {/* 节拍器对话框 */}
      <MetronomeDialog open={metronomeOpen} onOpenChange={setMetronomeOpen} />
    </div>
  );
}
