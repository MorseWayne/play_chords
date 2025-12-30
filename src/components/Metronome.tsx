import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause } from 'lucide-react';
import { useMetronome } from '@/hooks/useMetronome';
import { cn } from '@/lib/utils';

export function Metronome() {
  const { isPlaying, bpm, currentBeat, toggle, updateBPM, minBPM, maxBPM } = useMetronome();

  const handleBPMChange = (values: number[]) => {
    updateBPM(values[0]);
  };

  const handleBPMInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      updateBPM(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 空格键切换播放/停止
    if (e.key === ' ' && e.target === e.currentTarget) {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div 
      className="flex flex-col gap-3 w-full"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="节拍器控制"
    >
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">节拍器</span>
        {isPlaying && (
          <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
            运行中
          </span>
        )}
      </div>

      {/* 视觉节拍指示器 */}
      <div className="flex items-center justify-center gap-2 py-2">
        {[1, 2, 3, 4].map((beat) => (
          <div
            key={beat}
            className={cn(
              'rounded-full transition-all duration-100',
              currentBeat === beat
                ? 'h-4 w-4 bg-primary scale-125 shadow-lg'
                : 'h-3 w-3 bg-muted',
            )}
            aria-label={`第 ${beat} 拍${currentBeat === beat ? '（当前）' : ''}`}
          />
        ))}
      </div>

      {/* BPM 显示和输入 */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Slider
            value={[bpm]}
            onValueChange={handleBPMChange}
            min={minBPM}
            max={maxBPM}
            step={1}
            className="w-full"
            aria-label="BPM 滑块"
          />
        </div>
        <div className="flex items-baseline gap-1">
          <input
            type="number"
            value={bpm}
            onChange={handleBPMInputChange}
            min={minBPM}
            max={maxBPM}
            className="w-14 px-2 py-1 text-sm text-center border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="BPM 数值"
          />
          <span className="text-xs text-muted-foreground">BPM</span>
        </div>
      </div>

      {/* 播放/停止按钮 */}
      <Button
        size="sm"
        onClick={toggle}
        className="w-full text-xs"
        aria-label={isPlaying ? '停止节拍器' : '开始节拍器'}
      >
        {isPlaying ? (
          <>
            <Pause className="mr-1.5 h-3 w-3" />
            停止
          </>
        ) : (
          <>
            <Play className="mr-1.5 h-3 w-3" />
            开始
          </>
        )}
      </Button>

      {/* 提示文字 */}
      {!isPlaying && (
        <p className="text-[10px] text-muted-foreground text-center">
          4/4 拍 · 按空格键快速开始/停止
        </p>
      )}
    </div>
  );
}

