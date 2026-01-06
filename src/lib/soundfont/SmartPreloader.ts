/**
 * 智能预加载管理器
 * 根据和弦使用情况智能预测和加载所需的音符
 */

import { ModernSoundfontLoader } from './ModernSoundfontLoader';

interface PreloadStrategy {
  name: string;
  notes: string[];
}

export class SmartPreloader {
  private loader: ModernSoundfontLoader;
  private recentlyUsedNotes: Set<string> = new Set();
  private maxRecentNotes = 50;

  constructor(loader: ModernSoundfontLoader) {
    this.loader = loader;
  }

  /**
   * 根据 MIDI 音符预加载相关音符
   */
  async preloadForMidiNotes(midiNotes: number[]): Promise<void> {
    const notes = midiNotes.map(midi => this.midiToNoteName(midi));
    
    // 记录最近使用的音符
    notes.forEach(note => {
      this.recentlyUsedNotes.add(note);
      if (this.recentlyUsedNotes.size > this.maxRecentNotes) {
        const first = this.recentlyUsedNotes.values().next().value;
        if (first) {
          this.recentlyUsedNotes.delete(first);
        }
      }
    });

    // 预加载这些音符
    await this.loader.preloadNotes(notes);

    // 预加载相邻音符（用户可能会转调或弹奏旋律）
    const adjacentNotes = this.getAdjacentNotes(notes);
    this.loader.preloadNotes(adjacentNotes).catch(e => {
      console.debug('[SmartPreloader] Failed to preload adjacent notes:', e);
    });
  }

  /**
   * 获取相邻音符（用于预测）
   */
  private getAdjacentNotes(notes: string[]): string[] {
    const adjacent: string[] = [];
    
    notes.forEach(note => {
      const midi = this.noteNameToMidi(note);
      
      // 上下各 2 个半音
      for (let offset = -2; offset <= 2; offset++) {
        if (offset === 0) continue;
        const adjacentMidi = midi + offset;
        if (adjacentMidi >= 0 && adjacentMidi <= 127) {
          adjacent.push(this.midiToNoteName(adjacentMidi));
        }
      }
    });

    return [...new Set(adjacent)];
  }

  /**
   * 预加载常见和弦进行
   */
  async preloadCommonProgressions(): Promise<void> {
    const strategies: PreloadStrategy[] = [
      {
        name: 'C Major Scale',
        notes: ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']
      },
      {
        name: 'Guitar Open Chords',
        notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] // EADGBE
      }
    ];

    for (const strategy of strategies) {
      await this.loader.preloadNotes(strategy.notes).catch(e => {
        console.debug(`[SmartPreloader] Failed to preload ${strategy.name}:`, e);
      });
    }
  }

  /**
   * 根据使用模式预加载
   */
  async preloadBasedOnUsage(): Promise<void> {
    if (this.recentlyUsedNotes.size === 0) return;

    const notes = Array.from(this.recentlyUsedNotes);
    await this.loader.preloadNotes(notes);
  }

  /**
   * 将 MIDI 音符转换为音符名
   */
  private midiToNoteName(midi: number): string {
    const pitchClasses = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    const pc = pitchClasses[((midi % 12) + 12) % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${pc}${octave}`;
  }

  /**
   * 将音符名转换为 MIDI 音符
   */
  private noteNameToMidi(note: string): number {
    const noteMap: { [key: string]: number } = {
      'C': 0, 'Db': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5,
      'Gb': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11
    };

    const match = note.match(/^([A-G]b?)(-?\d+)$/);
    if (!match) return 60; // 默认 C4

    const [, noteName, octave] = match;
    return (parseInt(octave) + 1) * 12 + (noteMap[noteName] ?? 0);
  }

  /**
   * 清理缓存
   */
  clear(): void {
    this.recentlyUsedNotes.clear();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      recentlyUsedNotes: this.recentlyUsedNotes.size,
      loaderStats: this.loader.getStats()
    };
  }
}
