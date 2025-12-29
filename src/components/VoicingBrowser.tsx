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

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {title && <div className="text-sm font-medium">{title}</div>}
          <Badge variant="secondary" className="rounded-full">
            共 {positions.length} 个把位
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">当前：{safeVariant + 1}</div>
      </div>

      <div className="rounded-3xl border bg-muted/10 p-3 md:p-4">
        <Fretboard fretsLowToHigh={chord.frets} chordRoot={root} maxFret={15} />
      </div>

      <div className="mt-4 w-full overflow-x-auto">
        <div className="flex min-w-max gap-2 pb-1">
          {positions.map((_, i) => (
            <Button
              key={i}
              size="sm"
              variant={i === safeVariant ? 'default' : 'outline'}
              className={cn('h-9 w-10 rounded-xl', i === safeVariant && 'shadow-sm')}
              onClick={() => onVariantChange(i)}
            >
              {i + 1}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        提示：把位数量来自“指板搜索”，会尽量给出更多可弹的形状（0–15 品范围内）。
      </div>
    </div>
  );
}


