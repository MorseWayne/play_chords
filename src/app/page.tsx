'use client';

import React, { useState, useMemo } from 'react';
import { ChordSelector } from '@/components/ChordSelector';
import { PlaybackControls } from '@/components/PlaybackControls';
import { MobileActionBar } from '@/components/MobileActionBar';
import { VoicingBrowser } from '@/components/VoicingBrowser';
import { getChordData } from '@/lib/chords';
import { generateGuitarVoicings, pickPracticalVoicings } from '@/lib/voicings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ModeToggle } from '@/components/mode-toggle';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Guitar, SlidersHorizontal } from 'lucide-react';

export default function Home() {
  const [selectedKey, setSelectedKey] = useState('C');
  const [selectedSuffix, setSelectedSuffix] = useState('major');
  const [currentVariant, setCurrentVariant] = useState(0);
  
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
              <SheetContent side="left" className="w-[300px] sm:w-[340px]">
                <SheetHeader>
                  <SheetTitle>选择和弦</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <ChordSelector
                    selectedKey={selectedKey}
                    selectedSuffix={selectedSuffix}
                    onKeyChange={handleKeyChange}
                    onSuffixChange={handleSuffixChange}
                  />
                </div>
              </SheetContent>
            </Sheet>
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        {/* Controls Row */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-4">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">选择和弦</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ChordSelector
                selectedKey={selectedKey}
                selectedSuffix={selectedSuffix}
                onKeyChange={handleKeyChange}
                onSuffixChange={handleSuffixChange}
              />
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">试听</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center pt-0 pb-4">
              <PlaybackControls 
                chord={currentChord}
              />
            </CardContent>
          </Card>
        </div>

        {/* Fretboard Display - Full Width */}
        <Card className="rounded-2xl border bg-card/60 supports-[backdrop-filter]:bg-card/50 backdrop-blur p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">
              {selectedKey}
              <span className="ml-1.5 text-base font-normal text-muted-foreground">
                {selectedSuffix === 'major' ? 'Major' : selectedSuffix}
              </span>
            </h2>
            <span className="text-xs text-muted-foreground">
              {totalVariants > 0 ? `${safeVariant + 1} / ${totalVariants}` : ''}
            </span>
          </div>

          {chordData ? (
            <VoicingBrowser
              root={selectedKey}
              positions={activePositions}
              currentVariant={safeVariant}
              onVariantChange={setCurrentVariant}
            />
          ) : (
            <div className="text-muted-foreground">暂无数据</div>
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
    </div>
  );
}
