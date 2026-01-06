import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Music, Volume2 } from 'lucide-react';
import { ChordPosition } from '@/lib/chords';
import { useAudio } from '@/hooks/useAudio';
import { toast } from 'sonner';

interface PlaybackControlsProps {
  chord: ChordPosition | null;
}

export function PlaybackControls({ chord }: PlaybackControlsProps) {
  const { playStrum, playArpeggio, initAudio, isReady, state, volume, updateVolume } = useAudio();
  const lastStateRef = React.useRef(state);

  React.useEffect(() => {
    if (lastStateRef.current === state) return;
    lastStateRef.current = state;
    if (state === 'ready') {
      toast.success('钢弦吉他音色已就绪');
    }
    if (state === 'error') {
      toast.error('音色加载失败，请稍后重试');
    }
  }, [state]);

  const handleStrum = () => {
    if (chord && chord.midi) {
      playStrum(chord.midi);
    }
  };

  const handleArpeggio = () => {
    if (chord && chord.midi) {
      playArpeggio(chord.midi);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {!isReady && (
        <Button
          variant="outline"
          size="sm"
          onClick={initAudio}
          disabled={state === 'loading'}
          className="w-full text-xs"
        >
          {state === 'loading' ? '加载中…' : '加载音色'}
        </Button>
      )}

      {state === 'error' && (
        <div className="text-[10px] text-destructive">加载失败，请重试</div>
      )}

      <div className="flex flex-col gap-1.5">
        <Button 
          size="sm"
          onClick={handleStrum} 
          disabled={!chord || !isReady}
          className="w-full text-xs"
        >
          <Music className="mr-1.5 h-3 w-3" />
          扫弦
        </Button>
        
        <Button 
          size="sm"
          variant="secondary"
          onClick={handleArpeggio} 
          disabled={!chord || !isReady}
          className="w-full text-xs"
        >
          <Play className="mr-1.5 h-3 w-3" />
          分解
        </Button>
      </div>

      {isReady && (
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center gap-2">
            <Volume2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <Slider
              value={[volume]}
              onValueChange={(values) => updateVolume(values[0])}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-8 text-right">{volume}</span>
          </div>
        </div>
      )}
    </div>
  );
}

