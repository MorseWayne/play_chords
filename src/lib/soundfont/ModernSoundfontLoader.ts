/**
 * 现代 Soundfont 加载器
 * 使用 Web Audio API + 独立音频文件，支持按需加载和智能缓存
 */

interface SoundfontManifest {
  name: string;
  version: string;
  format: 'mp3' | 'ogg';
  notes: string[];
}

interface LoadOptions {
  gain?: number;
  destination?: AudioNode;
}

interface PlayOptions {
  duration?: number;
  gain?: number;
}

export class ModernSoundfontLoader {
  private audioContext: AudioContext;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private loadingPromises: Map<string, Promise<AudioBuffer>> = new Map();
  private manifest: SoundfontManifest | null = null;
  private baseUrl: string;
  private masterGain: GainNode;

  constructor(audioContext: AudioContext, baseUrl: string) {
    this.audioContext = audioContext;
    this.baseUrl = baseUrl;
    this.masterGain = audioContext.createGain();
    this.masterGain.connect(audioContext.destination);
  }

  /**
   * 加载 soundfont manifest
   */
  async loadManifest(): Promise<SoundfontManifest> {
    if (this.manifest) return this.manifest;

    const response = await fetch(`${this.baseUrl}/manifest.json`);
    if (!response.ok) {
      throw new Error(`Failed to load manifest: ${response.statusText}`);
    }

    this.manifest = await response.json();
    return this.manifest;
  }

  /**
   * 加载单个音符
   */
  async loadNote(note: string): Promise<AudioBuffer> {
    // 如果已经加载，直接返回
    if (this.audioBuffers.has(note)) {
      return this.audioBuffers.get(note)!;
    }

    // 如果正在加载，返回现有的 Promise
    if (this.loadingPromises.has(note)) {
      return this.loadingPromises.get(note)!;
    }

    // 开始新的加载
    const loadPromise = this._loadNoteData(note);
    this.loadingPromises.set(note, loadPromise);

    try {
      const buffer = await loadPromise;
      this.audioBuffers.set(note, buffer);
      return buffer;
    } finally {
      this.loadingPromises.delete(note);
    }
  }

  /**
   * 实际加载音频数据
   */
  private async _loadNoteData(note: string): Promise<AudioBuffer> {
    const manifest = await this.loadManifest();
    const format = manifest.format || 'mp3';
    const url = `${this.baseUrl}/${note}.${format}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load note ${note}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (error) {
      console.error(`Error loading note ${note}:`, error);
      throw error;
    }
  }

  /**
   * 批量预加载音符
   */
  async preloadNotes(notes: string[]): Promise<void> {
    const loadPromises = notes.map((note) => 
      this.loadNote(note).catch((error) => {
        console.warn(`Failed to preload note ${note}:`, error);
        return null;
      })
    );

    await Promise.all(loadPromises);
  }

  /**
   * 预加载常用的吉他音符范围（E2-E5）
   */
  async preloadGuitarRange(): Promise<void> {
    const guitarNotes = [
      'E2', 'F2', 'Gb2', 'G2', 'Ab2', 'A2', 'Bb2', 'B2',
      'C3', 'Db3', 'D3', 'Eb3', 'E3', 'F3', 'Gb3', 'G3', 'Ab3', 'A3', 'Bb3', 'B3',
      'C4', 'Db4', 'D4', 'Eb4', 'E4', 'F4', 'Gb4', 'G4', 'Ab4', 'A4', 'Bb4', 'B4',
      'C5', 'Db5', 'D5', 'Eb5', 'E5'
    ];

    await this.preloadNotes(guitarNotes);
  }

  /**
   * 播放单个音符
   */
  play(note: string, when: number = 0, options: PlayOptions = {}): void {
    const buffer = this.audioBuffers.get(note);
    if (!buffer) {
      console.warn(`Note ${note} not loaded, attempting to load...`);
      this.loadNote(note).then(() => this.play(note, when, options));
      return;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    // 创建音量节点
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = options.gain ?? 1.0;

    // 连接音频图
    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    // 播放
    const startTime = when || this.audioContext.currentTime;
    source.start(startTime);

    // 如果指定了持续时间，则在指定时间停止
    if (options.duration) {
      source.stop(startTime + options.duration);
    }
  }

  /**
   * 播放多个音符（和弦）
   */
  playChord(notes: string[], when: number = 0, options: PlayOptions = {}): void {
    notes.forEach((note) => {
      this.play(note, when, options);
    });
  }

  /**
   * 播放琶音
   */
  playArpeggio(notes: string[], options: PlayOptions & { interval?: number } = {}): void {
    const interval = options.interval ?? 0.22; // 默认间隔 220ms
    const baseTime = this.audioContext.currentTime;

    notes.forEach((note, index) => {
      this.play(note, baseTime + index * interval, options);
    });
  }

  /**
   * 播放扫弦（从低到高）
   */
  playStrum(notes: string[], options: PlayOptions & { interval?: number } = {}): void {
    const interval = options.interval ?? 0.04; // 默认间隔 40ms
    const baseTime = this.audioContext.currentTime;

    // 按音高排序（从低到高）
    const sortedNotes = [...notes].sort((a, b) => {
      return this.noteToMidi(a) - this.noteToMidi(b);
    });

    sortedNotes.forEach((note, index) => {
      this.play(note, baseTime + index * interval, options);
    });
  }

  /**
   * 将音符名转换为 MIDI 音高
   */
  private noteToMidi(note: string): number {
    const noteMap: { [key: string]: number } = {
      'C': 0, 'Db': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5,
      'Gb': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11
    };

    const match = note.match(/^([A-G]b?)(-?\d+)$/);
    if (!match) return 0;

    const [, noteName, octave] = match;
    return (parseInt(octave) + 1) * 12 + (noteMap[noteName] ?? 0);
  }

  /**
   * 设置主音量
   */
  setMasterGain(gain: number): void {
    this.masterGain.gain.value = Math.max(0, Math.min(1, gain));
  }

  /**
   * 连接到指定的目标节点
   */
  connect(destination: AudioNode): void {
    this.masterGain.disconnect();
    this.masterGain.connect(destination);
  }

  /**
   * 获取加载统计
   */
  getStats() {
    return {
      loadedNotes: this.audioBuffers.size,
      loadingNotes: this.loadingPromises.size,
      totalNotes: this.manifest?.notes.length ?? 0
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.audioBuffers.clear();
    this.loadingPromises.clear();
    this.masterGain.disconnect();
  }
}
