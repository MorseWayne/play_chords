import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Volume2 } from 'lucide-react';
import { useMetronome, TIME_SIGNATURES, type TimeSignature } from '@/hooks/useMetronome';
import { cn } from '@/lib/utils';

export function Metronome() {
  const {
    isPlaying,
    bpm,
    timeSignature,
    volume,
    currentBeat,
    toggle,
    updateBPM,
    updateTimeSignature,
    updateVolume,
    minBPM,
    maxBPM,
    minVolume,
    maxVolume,
    timeSignatureConfig,
  } = useMetronome();

  // 使用本地状态管理输入框的值，避免受控组件导致的输入问题
  // 始终与 bpm 保持同步，避免 hydration 错误
  const [bpmInput, setBpmInput] = useState('');

  // 当 bpm 从外部更新时（如滑块或初始加载），同步到输入框
  useEffect(() => {
    setBpmInput(bpm.toString());
  }, [bpm]);

  const handleBPMChange = (values: number[]) => {
    updateBPM(values[0]);
  };

  const handleBPMInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 允许用户输入任何内容（包括空值），不立即验证
    setBpmInput(value);
  };

  const handleBPMInputBlur = () => {
    const numValue = parseInt(bpmInput, 10);
    if (isNaN(numValue) || bpmInput === '') {
      // 如果无效或为空，恢复到当前 BPM 值
      setBpmInput(bpm.toString());
    } else {
      // 失焦时确保值在有效范围内
      const clampedValue = Math.max(minBPM, Math.min(maxBPM, numValue));
      updateBPM(clampedValue);
      setBpmInput(clampedValue.toString());
    }
  };

  const handleBPMInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 按 Enter 键时触发失焦行为
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleVolumeChange = (values: number[]) => {
    updateVolume(values[0]);
  };

  const handleTimeSignatureChange = (value: string) => {
    updateTimeSignature(value as TimeSignature);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 空格键切换播放/停止
    if (e.key === ' ' && e.target === e.currentTarget) {
      e.preventDefault();
      toggle();
    }
  };

  // 生成圆点数组（根据当前拍号）
  const beats = Array.from({ length: timeSignatureConfig.beats }, (_, i) => i + 1);
  const isStrongBeat = (beat: number) => timeSignatureConfig.strongBeats.includes(beat);

  return (
    <div
      className="flex flex-col gap-6 w-full max-w-2xl mx-auto p-4 sm:p-6"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="节拍器控制"
    >
      {/* 标题和状态 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">节拍器</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {timeSignatureConfig.label} · {timeSignatureConfig.description}
          </p>
        </div>
        {isPlaying && (
          <span className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            运行中
          </span>
        )}
      </div>

      {/* BPM 大号显示 */}
      <div className="text-center py-4">
        <div className="text-7xl font-bold tabular-nums tracking-tight">
          {bpm}
        </div>
        <div className="text-lg text-muted-foreground mt-2">BPM</div>
      </div>

      {/* 视觉节拍指示器 */}
      <div className="flex items-center justify-center gap-3 py-6 min-h-[64px]">
        {beats.map((beat) => (
          <div
            key={beat}
            className="relative flex items-center justify-center"
            style={{ width: '32px', height: '32px' }}
          >
            <div
              className={cn(
                'absolute rounded-full transition-all duration-100',
                currentBeat === beat
                  ? isStrongBeat(beat)
                    ? 'h-8 w-8 bg-primary shadow-xl shadow-primary/50'
                    : 'h-7 w-7 bg-primary shadow-lg shadow-primary/30'
                  : isStrongBeat(beat)
                  ? 'h-6 w-6 bg-muted/80 ring-2 ring-muted-foreground/20'
                  : 'h-5 w-5 bg-muted/60',
              )}
              aria-label={`第 ${beat} 拍${currentBeat === beat ? '（当前）' : ''}${isStrongBeat(beat) ? '（强拍）' : ''}`}
            />
          </div>
        ))}
      </div>

      {/* 拍号选择器 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">拍号</label>
        <Select value={timeSignature} onValueChange={handleTimeSignatureChange}>
          <SelectTrigger className="w-full text-base h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TIME_SIGNATURES) as TimeSignature[]).map((ts) => {
              const config = TIME_SIGNATURES[ts];
              return (
                <SelectItem key={ts} value={ts} className="text-base">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{config.label}</span>
                    <span className="text-xs text-muted-foreground">{config.description}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* BPM 控制 */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-muted-foreground">速度</label>
        <div className="flex items-center gap-4">
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
          <input
            type="number"
            value={bpmInput}
            onChange={handleBPMInputChange}
            onBlur={handleBPMInputBlur}
            onKeyDown={handleBPMInputKeyDown}
            min={minBPM}
            max={maxBPM}
            className="w-20 px-3 py-2 text-base text-center border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="BPM 数值"
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{minBPM} BPM</span>
          <span>{maxBPM} BPM</span>
        </div>
      </div>

      {/* 音量控制 */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Volume2 className="h-4 w-4" />
          音量
        </label>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              min={minVolume}
              max={maxVolume}
              step={1}
              className="w-full"
              aria-label="音量滑块"
            />
          </div>
          <span className="w-16 text-center text-base font-medium tabular-nums">
            {volume}%
          </span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>静音</span>
          <span>最大</span>
        </div>
      </div>

      {/* 播放/停止按钮 */}
      <Button
        size="lg"
        onClick={toggle}
        className="w-full text-lg h-14 mt-2"
        aria-label={isPlaying ? '停止节拍器' : '开始节拍器'}
      >
        {isPlaying ? (
          <>
            <Pause className="mr-2 h-5 w-5" />
            停止
          </>
        ) : (
          <>
            <Play className="mr-2 h-5 w-5" />
            开始
          </>
        )}
      </Button>

      {/* 提示文字 */}
      {!isPlaying && (
        <p className="text-sm text-muted-foreground text-center">
          按空格键快速开始/停止
        </p>
      )}
    </div>
  );
}
