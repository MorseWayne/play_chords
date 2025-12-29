'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ChordPosition } from '@/lib/chords';
import { Fretboard } from '@/components/Fretboard';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface VoicingBrowserProps {
  root: string;
  positions: ChordPosition[];
  currentVariant: number;
  onVariantChange: (index: number) => void;
  className?: string;
}

// Get the starting fret position (lowest non-zero fret, or baseFret)
function getStartingFret(pos: ChordPosition): number {
  // Use baseFret if available and > 1
  if (pos.baseFret && pos.baseFret > 1) return pos.baseFret;
  // Otherwise calculate from frets
  const positiveFrets = pos.frets.filter((f) => f > 0);
  if (positiveFrets.length === 0) return 0;
  return Math.min(...positiveFrets);
}

// Group positions by their starting fret
function getUniqueStartingFrets(positions: ChordPosition[]): number[] {
  const frets = positions.map(getStartingFret);
  return Array.from(new Set(frets)).sort((a, b) => a - b);
}

// Get count of positions for each starting fret
function getPositionCountByFret(positions: ChordPosition[], fret: number): number {
  return positions.filter((p) => getStartingFret(p) === fret).length;
}

export function VoicingBrowser({
  root,
  positions,
  currentVariant,
  onVariantChange,
  className,
}: VoicingBrowserProps) {
  if (!positions?.length) {
    return <div className="text-sm text-muted-foreground">暂无把位数据</div>;
  }

  const safeVariant = Math.min(Math.max(0, currentVariant), positions.length - 1);
  const chord = positions[safeVariant];
  const currentFret = getStartingFret(chord);
  const uniqueFrets = getUniqueStartingFrets(positions);
  
  const canGoPrev = safeVariant > 0;
  const canGoNext = safeVariant < positions.length - 1;

  const handlePrev = () => {
    if (canGoPrev) onVariantChange(safeVariant - 1);
  };

  const handleNext = () => {
    if (canGoNext) onVariantChange(safeVariant + 1);
  };

  return (
    <div className={cn('w-full', className)}>
      {/* 顶部信息栏：把位数量 + 切换控件 + 当前品位 */}
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{positions.length} 个把位</span>
        
        {/* 把位切换控件 */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={handlePrev}
            disabled={!canGoPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[3rem] text-center font-medium text-foreground">
            {safeVariant + 1} / {positions.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={handleNext}
            disabled={!canGoNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <span>{currentFret === 0 ? '开放把位' : `${currentFret}品起`}</span>
      </div>

      <div className="rounded-3xl border bg-muted/10 p-3 md:p-4">
        <Fretboard 
          fretsLowToHigh={chord.frets} 
          fingersLowToHigh={chord.fingers}
          barres={chord.barres}
          chordRoot={root} 
          maxFret={15} 
        />
      </div>

      {/* 底部把位分组按钮 */}
      <div className="mt-4 w-full overflow-x-auto">
        <div className="flex min-w-max gap-2 pb-1">
          {uniqueFrets.map((fret) => {
            // Find the first position with this starting fret
            const posIndex = positions.findIndex((p) => getStartingFret(p) === fret);
            const isActive = getStartingFret(positions[safeVariant]) === fret;
            const count = getPositionCountByFret(positions, fret);
            
            return (
              <Button
                key={fret}
                size="sm"
                variant={isActive ? 'default' : 'outline'}
                className={cn('h-9 min-w-[40px] rounded-xl px-3', isActive && 'shadow-sm')}
                onClick={() => onVariantChange(posIndex)}
              >
                {fret === 0 ? '开放' : `${fret}品`}
                {count > 1 && (
                  <span className="ml-1 text-[10px] opacity-60">×{count}</span>
                )}
              </Button>
            );
          })}
        </div>
      </div>

    </div>
  );
}


