'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChordPosition } from '@/lib/chords';
import { Fretboard } from '@/components/Fretboard';
import { ChordDiagram } from '@/components/ChordDiagram';
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

  const withMeta = positions.map((p, idx) => {
    const start = p.baseFret && p.baseFret > 0 ? p.baseFret : (() => {
      const pos = p.frets.filter((f) => f > 0);
      return pos.length ? Math.min(...pos) : 1;
    })();
    return { p, idx, start };
  });

  // Sort by “起始品位” so the strip left->right has meaning
  const ordered = withMeta.slice().sort((a, b) => a.start - b.start || a.idx - b.idx);
  const safeVariant = Math.min(Math.max(0, currentVariant), ordered.length - 1);
  const chord = ordered[safeVariant].p;

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {title && <div className="text-sm font-medium">{title}</div>}
          <Badge variant="secondary" className="rounded-full">
            共 {ordered.length} 个把位
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">起始：{ordered[safeVariant].start} 品</div>
      </div>

      <div className="rounded-3xl border bg-muted/10 p-3 md:p-4">
        <Fretboard
          fretsLowToHigh={chord.frets}
          fingersLowToHigh={chord.fingers}
          barres={chord.barres}
          maxFret={15}
        />
      </div>

      <div className="mt-4 w-full overflow-x-auto">
        <div className="flex min-w-max gap-2 pb-1">
          {ordered.map(({ start }, i) => (
            <Button
              key={i}
              size="sm"
              variant={i === safeVariant ? 'default' : 'outline'}
              className={cn('h-11 w-12 rounded-2xl', i === safeVariant && 'shadow-sm')}
              onClick={() => onVariantChange(i)}
              title={`${start} 品起`}
            >
              <div className="flex flex-col leading-none">
                <span className="text-sm font-semibold">{start}</span>
                <span className="text-[10px] opacity-80">品</span>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Separate chord diagram panel */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium">和弦图</div>
          <div className="text-xs text-muted-foreground">
            {root}
          </div>
        </div>
        <ChordDiagram position={chord} />
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        提示：指板面板显示“手指编号/横按”，更贴近实际按法；和弦图用于快速识别形状。
      </div>
    </div>
  );
}


