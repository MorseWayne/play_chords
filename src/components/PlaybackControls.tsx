import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Music } from 'lucide-react';
import { ChordPosition } from '@/lib/chords';
import { useAudio } from '@/hooks/useAudio';

interface PlaybackControlsProps {
  chord: ChordPosition | null;
}

export function PlaybackControls({ chord }: PlaybackControlsProps) {
  const { playStrum, playArpeggio, initAudio, isReady, state } = useAudio();

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
    <div className="flex flex-col gap-3 mt-6">
      {!isReady && (
        <Button
          variant="outline"
          onClick={initAudio}
          disabled={state === 'loading'}
          className="w-64"
        >
          {state === 'loading' ? '正在加载真实钢弦吉他音色…' : '加载真实钢弦吉他音色（更逼真）'}
        </Button>
      )}

      {state === 'error' && (
        <div className="text-xs text-destructive">
          音色加载失败（可能是网络/浏览器策略）。你可以刷新后重试，或稍后我帮你改成本地音源包。
        </div>
      )}

      <div className="flex gap-4">
      <Button 
        onClick={handleStrum} 
        disabled={!chord || !isReady}
        className="w-32"
      >
        <Music className="mr-2 h-4 w-4" />
        扫弦 (Strum)
      </Button>
      
      <Button 
        variant="secondary"
        onClick={handleArpeggio} 
        disabled={!chord || !isReady}
        className="w-32"
      >
        <Play className="mr-2 h-4 w-4" />
        分解 (Arpeggio)
      </Button>
      </div>
    </div>
  );
}

