'use client';

import React, { useState, useMemo } from 'react';
import { ChordSelector } from '@/components/ChordSelector';
import { ChordDisplay } from '@/components/ChordDisplay';
import { PlaybackControls } from '@/components/PlaybackControls';
import { getChordData } from '@/lib/chords';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Music4 } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Music4 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Guitar Chord Master</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-[350px_1fr]">
          
          {/* Left Column: Controls */}
          <div className="space-y-6">
            <Card>
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

            <Card>
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
               <Card className="h-full min-h-[500px] flex flex-col items-center justify-center p-8 bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
                  <div className="text-center mb-8">
                    <h2 className="text-4xl font-bold mb-2">
                      {selectedKey}<span className="text-2xl text-muted-foreground font-normal ml-1">{selectedSuffix === 'major' ? '' : selectedSuffix}</span>
                    </h2>
                    <p className="text-muted-foreground">
                      {chordData?.positions ? `Variant ${currentVariant + 1} of ${chordData.positions.length}` : ''}
                    </p>
                  </div>

                  {chordData ? (
                    <ChordDisplay
                      positions={chordData.positions}
                      currentVariant={currentVariant}
                      onVariantChange={setCurrentVariant}
                    />
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
