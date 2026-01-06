'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Music, Play, Sparkles, Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ChordPosition } from '@/lib/chords';
import { useAudio } from '@/hooks/useAudio';

interface MobileActionBarProps {
  chord: ChordPosition | null;
  currentVariant: number;
  totalVariants: number;
  onPrevVariant: () => void;
  onNextVariant: () => void;
}

export function MobileActionBar({
  chord,
  currentVariant,
  totalVariants,
  onPrevVariant,
  onNextVariant,
}: MobileActionBarProps) {
  const { playStrum, playArpeggio, initAudio, isReady, state, volume, updateVolume } = useAudio();
  const lastStateRef = React.useRef(state);
  const [volumeSheetOpen, setVolumeSheetOpen] = React.useState(false);

  React.useEffect(() => {
    if (lastStateRef.current === state) return;
    lastStateRef.current = state;
    if (state === 'ready') toast.success('钢弦吉他音色已就绪');
    if (state === 'error') toast.error('音色加载失败，请稍后重试');
  }, [state]);

  const canPlay = !!chord?.midi && isReady;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 lg:hidden">
      <div className="border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {/* Variant controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-2xl"
              onClick={onPrevVariant}
              disabled={totalVariants <= 0 || currentVariant <= 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[74px] text-center text-xs text-muted-foreground">
              把位
              <div className="text-sm font-medium text-foreground">
                {totalVariants > 0 ? `${currentVariant + 1}/${totalVariants}` : '-/-'}
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-2xl"
              onClick={onNextVariant}
              disabled={totalVariants <= 0 || currentVariant >= totalVariants - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Audio controls */}
          <div className="flex items-center gap-2">
            {!isReady ? (
              <Button
                variant="secondary"
                className="h-10 rounded-2xl"
                onClick={initAudio}
                disabled={state === 'loading'}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {state === 'loading' ? '加载中…' : '加载音色'}
              </Button>
            ) : (
              <>
                <Sheet open={volumeSheetOpen} onOpenChange={setVolumeSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl">
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="rounded-t-[20px]">
                    <SheetHeader>
                      <SheetTitle>音量调节</SheetTitle>
                    </SheetHeader>
                    <div className="flex items-center gap-3 py-6">
                      <Volume2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <Slider
                        value={[volume]}
                        onValueChange={(values) => updateVolume(values[0])}
                        min={0}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12 text-right">{volume}</span>
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            )}

            <Button
              className="h-10 rounded-2xl"
              onClick={() => chord?.midi && playStrum(chord.midi)}
              disabled={!canPlay}
            >
              <Music className="mr-2 h-4 w-4" />
              扫弦
            </Button>
            <Button
              variant="secondary"
              className="h-10 rounded-2xl"
              onClick={() => chord?.midi && playArpeggio(chord.midi)}
              disabled={!canPlay}
            >
              <Play className="mr-2 h-4 w-4" />
              分解
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


