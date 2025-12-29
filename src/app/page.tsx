'use client';

import React, { useState, useMemo } from 'react';
import { ChordSelector } from '@/components/ChordSelector';
import { ChordDisplay } from '@/components/ChordDisplay';
import { PlaybackControls } from '@/components/PlaybackControls';
import { MobileActionBar } from '@/components/MobileActionBar';
import { getChordData } from '@/lib/chords';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ModeToggle } from '@/components/mode-toggle';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Guitar, Music4, SlidersHorizontal } from 'lucide-react';

export default function Home() {
  const [selectedKey, setSelectedKey] = useState('C');
  const [selectedSuffix, setSelectedSuffix] = useState('major');
  const [currentVariant, setCurrentVariant] = useState(0);
  
  const chordData = useMemo(() => {
    return getChordData(selectedKey, selectedSuffix);
  }, [selectedKey, selectedSuffix]);

  const totalVariants = chordData?.positions?.length ?? 0;
  const safeVariant =
    totalVariants > 0 ? Math.min(Math.max(0, currentVariant), totalVariants - 1) : 0;
  const currentChord = chordData?.positions?.[safeVariant] ?? null;

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
              <SheetContent side="left" className="w-[340px] sm:w-[380px]">
                <SheetHeader>
                  <SheetTitle>选择和弦</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <ChordSelector
                    selectedKey={selectedKey}
                    selectedSuffix={selectedSuffix}
                    onKeyChange={handleKeyChange}
                    onSuffixChange={handleSuffixChange}
                  />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  提示：你可以在右侧查看不同把位，并在下方试听扫弦/分解。
                </div>
              </SheetContent>
            </Sheet>
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        {/* Hero */}
        <div className="mb-8 rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full">
                <Music4 className="h-3.5 w-3.5" />
                  钢弦采样音色
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  支持暗色模式
                </Badge>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                练和弦更顺手：<span className="text-primary">选</span>、<span className="text-primary">看</span>、<span className="text-primary">听</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                用最短路径找到和弦指法与把位，并用更逼真的钢弦采样试听扫弦与分解。后续可扩展：转调、节奏型、练习计划。
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          
          {/* Left Column: Controls */}
          <div className="hidden lg:block space-y-6">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>选择和弦 (Select Chord)</CardTitle>
                <CardDescription>
                  选择根音和和弦类型来查看指法。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChordSelector
                  selectedKey={selectedKey}
                  selectedSuffix={selectedSuffix}
                  onKeyChange={handleKeyChange}
                  onSuffixChange={handleSuffixChange}
                />
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>播放控制 (Playback)</CardTitle>
                <CardDescription>
                  试听当前和弦的声音。
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-6">
                <PlaybackControls 
                  chord={currentChord}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Display */}
          <div className="flex flex-col items-center">
            <div className="w-full">
               <Card className="h-full min-h-[540px] rounded-3xl border bg-card/60 supports-[backdrop-filter]:bg-card/50 backdrop-blur p-6 md:p-10">
                  <div className="mb-8 flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                      当前和弦
                    </div>
                    <h2 className="mt-4 text-4xl font-semibold tracking-tight">
                      {selectedKey}
                      <span className="ml-2 align-middle text-lg font-normal text-muted-foreground">
                        {selectedSuffix === 'major' ? 'Major' : selectedSuffix}
                      </span>
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {chordData?.positions ? `把位 ${currentVariant + 1} / ${chordData.positions.length}` : ''}
                    </p>
                  </div>

                  {chordData ? (
                    <div className="flex flex-col items-center">
                      <ChordDisplay
                        positions={chordData.positions}
                        currentVariant={safeVariant}
                        onVariantChange={setCurrentVariant}
                      />
                      <div className="mt-6 text-center text-xs text-muted-foreground">
                        提示：先点“加载真实钢弦吉他音色”，再试听会更接近真实吉他。
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No chord data found</div>
                  )}
               </Card>
            </div>
          </div>

        </div>
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
