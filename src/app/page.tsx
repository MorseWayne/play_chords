'use client';

import React, { useState, useMemo } from 'react';
import { ChordSelector } from '@/components/ChordSelector';
import { ChordDisplay } from '@/components/ChordDisplay';
import { PlaybackControls } from '@/components/PlaybackControls';
import { getChordData } from '@/lib/chords';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ModeToggle } from '@/components/mode-toggle';
import { Guitar, Music4 } from 'lucide-react';

export default function Home() {
  const [selectedKey, setSelectedKey] = useState('C');
  const [selectedSuffix, setSelectedSuffix] = useState('major');
  const [currentVariant, setCurrentVariant] = useState(0);
  
  const chordData = useMemo(() => {
    return getChordData(selectedKey, selectedSuffix);
  }, [selectedKey, selectedSuffix]);

  const handleKeyChange = (key: string) => {
    setSelectedKey(key);
    setCurrentVariant(0);
  };

  const handleSuffixChange = (suffix: string) => {
    setSelectedSuffix(suffix);
    setCurrentVariant(0);
  };

  return (
    <div className="min-h-screen bg-background pb-16">
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
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        {/* Hero */}
        <div className="mb-8 rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                <Music4 className="h-3.5 w-3.5" />
                钢弦采样音色 · 支持暗色模式
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
          <div className="space-y-6">
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
                  chord={chordData && chordData.positions ? chordData.positions[currentVariant] : null} 
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
                        currentVariant={currentVariant}
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
    </div>
  );
}
