'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChordPosition } from '@/lib/chords';
import { Fretboard } from '@/components/Fretboard';
import { cn } from '@/lib/utils';

interface VoicingBrowserProps {
  title?: string;
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

export function VoicingBrowser({
  title,
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

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {title && <div className="text-sm font-medium">{title}</div>}
          <Badge variant="secondary" className="rounded-full">
            共 {positions.length} 个把位
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">当前：{currentFret}</div>
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

      <div className="mt-4 w-full overflow-x-auto">
        <div className="flex min-w-max gap-2 pb-1">
          {uniqueFrets.map((fret) => {
            // Find the first position with this starting fret
            const posIndex = positions.findIndex((p) => getStartingFret(p) === fret);
            const isActive = getStartingFret(positions[safeVariant]) === fret;
            
            return (
              <Button
                key={fret}
                size="sm"
                variant={isActive ? 'default' : 'outline'}
                className={cn('h-9 min-w-[40px] rounded-xl px-3', isActive && 'shadow-sm')}
                onClick={() => onVariantChange(posIndex)}
              >
                {fret === 0 ? '开放' : `${fret}品`}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        提示：数字代表起始品位，点击可切换到该品位的把位形状。
      </div>
    </div>
  );
}


