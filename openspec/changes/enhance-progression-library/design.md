# Design: 增强和弦走向库与把位设置

## Context

当前和弦走向练习功能（`add-chord-progression-practice`）已实现基础的动态练习能力，但用户反馈需要：
1. 更多样化的预置走向以覆盖不同风格
2. 自定义走向能力以满足个性化练习需求
3. 手动选择和弦把位以训练特定的把位切换
4. 丰富的节奏型选择以模拟真实的弹奏场景

本设计文档描述实现这些功能的技术决策、数据结构、解析策略和 UI 集成方案。

## Goals / Non-Goals

### Goals

- 扩展预置走向库至 20+ 个，覆盖流行、爵士、布鲁斯、民谣、拉丁等风格
- 实现自定义走向的创建、编辑、删除功能，支持罗马数字和和弦名称两种输入模式
- 提供和弦把位选择器，允许用户手动选择每个和弦的把位（voicing）
- 提供丰富的节奏型库（扫弦和分解），允许用户选择并自定义节奏型
- 持久化自定义走向、把位偏好和节奏型偏好到 LocalStorage
- 保持与现有功能的完全兼容（不破坏现有练习流程）

### Non-Goals

- 不实现拖拽式可视化编辑器（仅文本输入）
- 不实现云端同步与跨设备分享（仅本地存储）
- 不实现自动把位推荐算法（由用户手动选择）
- 不实现把位切换的难度评分或手势分析
- 不实现音高识别与自动评分

## Decisions

### 1. 预置走向库扩展策略

**决策：** 在 `src/lib/progressions.ts` 的 `COMMON_PROGRESSIONS` 数组中直接添加走向定义。

**理由：**
- 简单直接，无需引入额外的数据加载机制
- 走向数据量小（每个走向 < 500 字节），对打包体积影响可忽略
- 便于维护和版本控制

**数据结构：**
```typescript
export interface ProgressionDefinition {
  id: string;              // 唯一标识符（kebab-case）
  name: string;            // 显示名称（中文）
  romanNumerals: string[]; // 罗马数字序列
  tags: string[];          // 风格标签（pop、jazz、blues、folk、latin 等）
  defaultBpm: number;      // 推荐 BPM
  notes?: string;          // 说明与使用建议
  difficulty?: 'easy' | 'medium' | 'hard'; // 难度（可选）
}
```

**分类方案：**
- 流行/摇滚类：5 个
- 爵士类：4 个
- 布鲁斯类：3 个
- 民谣/乡村类：3 个
- 拉丁/Bossa 类：2 个
- 现有：5 个
- 总计：22 个预置走向

### 2. 自定义走向数据结构与存储

**决策：** 使用 LocalStorage 存储自定义走向，key 为 `custom-progressions`。

**数据结构：**
```typescript
export interface CustomProgressionDefinition extends ProgressionDefinition {
  createdAt: number;    // 创建时间戳
  updatedAt: number;    // 更新时间戳
  isCustom: true;       // 标识为自定义
}

// LocalStorage 格式
{
  "custom-progressions": CustomProgressionDefinition[]
}
```

**理由：**
- 扩展现有的 `ProgressionDefinition` 类型，保证类型一致性
- 添加时间戳便于排序和管理
- `isCustom` 标识便于在 UI 中区分预置与自定义

**存储容量考虑：**
- LocalStorage 限制通常为 5-10MB
- 单个走向约 500 字节，可存储数千个走向
- 实际使用中用户不太可能创建超过 100 个自定义走向

**错误处理：**
- 捕获 `QuotaExceededError` 并提示用户
- 捕获 JSON 解析错误，回退到空数组
- 提供"清除所有自定义走向"的管理功能

### 3. 罗马数字与和弦名称解析

**决策：** 实现两个独立的解析函数，支持不同输入模式。

#### 3.1 罗马数字解析

**函数签名：**
```typescript
export function parseRomanNumeralString(input: string): string[]
```

**解析规则：**
- 分隔符：空格、逗号、短横线（`-`）、斜杠（`/`）
- 支持大小写罗马数字（I-VII，i-vii）
- 支持扩展符号：`7`、`maj7`、`m7`、`°`（dim）、`+`（aug）
- 示例：
  - `I V vi IV` → `["I", "V", "vi", "IV"]`
  - `ii7-V7-Imaj7` → `["ii7", "V7", "Imaj7"]`
  - `I, iii, vi, V` → `["I", "iii", "vi", "V"]`

**实现策略：**
- 使用正则表达式分割输入
- 逐个 token 验证是否为合法罗马数字
- 复用现有的 `romanToDegree` 函数进行验证

#### 3.2 和弦名称解析

**函数签名：**
```typescript
export function parseChordNameString(
  input: string,
  options?: { inferKey?: boolean }
): { chords: GeneratedProgressionChord[]; inferredKey?: string; inferredMode?: ProgressionMode }
```

**解析规则：**
- 分隔符：同罗马数字
- 支持根音：C、C#、Db、D、D#、Eb、E、F、F#、Gb、G、G#、Ab、A、A#、Bb、B
- 支持和弦类型：major（省略）、m/minor、7、maj7、m7、sus4、sus2、dim、aug、add9 等
- 自动推断调性（可选）：基于和弦序列的音级关系
- 示例：
  - `C Am F G` → C、Am、F、G（推断：C 大调）
  - `Dm7 G7 Cmaj7` → Dm7、G7、Cmaj7（推断：C 大调）

**实现策略：**
- 使用 `@tonaljs/tonal` 的 `Chord.get()` 解析和弦符号
- 分离根音与后缀（suffix）
- 推断调性算法：
  1. 统计所有和弦的根音
  2. 检查是否符合某个大调或小调音阶
  3. 优先选择包含 I 级和弦的调性
  4. 若无法推断，要求用户手动指定

#### 3.3 验证函数

**函数签名：**
```typescript
export interface ValidationResult {
  valid: boolean;
  errors: Array<{ index: number; token: string; message: string }>;
  warnings?: Array<{ message: string }>;
}

export function validateProgressionInput(
  input: string,
  mode: 'roman' | 'chord'
): ValidationResult
```

**验证内容：**
- 是否为空输入
- 每个 token 是否合法
- 和弦序列长度是否合理（2-16 个）
- 和弦名称模式下是否能成功推断调性

### 4. 把位选择与持久化

**决策：** 为每个走向独立存储每个和弦位置的把位选择。

**数据结构：**
```typescript
// LocalStorage key: progression-voicing-preferences
{
  [progressionId: string]: {
    [chordIndex: number]: number; // voicingIndex
  }
}

// 示例
{
  "pop-1564": {
    0: 2,  // 第 1 个和弦选择第 3 个把位（index 2）
    1: 0,  // 第 2 个和弦选择第 1 个把位（index 0）
    2: 1,  // ...
    3: 0
  }
}
```

**理由：**
- 以走向 ID 为 key，避免不同走向间的冲突
- 以和弦索引为 key，支持同一走向内不同位置的相同和弦使用不同把位
- 简单的 key-value 结构，便于读写和序列化

**把位选择 UI 设计：**

**方案 A：下拉选择器**
```
当前和弦：C
把位：[低把位 (0-3品) ▼]
     ├─ 开放把位 (推荐)
     ├─ 3品把位
     └─ 5品把位
```

**方案 B：分组按钮**
```
当前和弦：C
把位：[开放] [3品] [5品] [8品] [10品]
      ^^^^^ (高亮当前选中)
```

**决策：采用方案 B（分组按钮）**
- 更直观，一眼看到所有选项
- 移动端友好（大按钮易点击）
- 可显示品位范围（"0-3品"、"5-7品"）

**把位切换交互：**
1. 用户点击把位按钮
2. 立即更新 `variantByIndex[chordIndex]`
3. 触发 React 状态更新，重新渲染指法图
4. 自动播放新把位的音频（可选，可通过设置开关）
5. 保存到 LocalStorage

**键盘快捷键：**
- `[` 或 `,`：上一个把位
- `]` 或 `.`：下一个把位

### 5. 节奏型数据结构与实现

**决策：** 创建独立的节奏型模块 `src/lib/rhythms.ts`，定义扫弦和分解节奏型。

**数据结构：**
```typescript
// 扫弦节奏型
export interface StrummingPattern {
  id: string;
  name: string;
  type: 'strumming';
  notation: string; // 如 "D DU UDU" 或 "↓ ↓↑ ↑↓↑"
  sequence: Array<{
    direction: 'down' | 'up';
    accent?: boolean; // 重音
    duration?: number; // 时值（默认均分）
  }>;
  tags: string[]; // 风格标签
  notes?: string; // 说明
  bpmRange?: [number, number]; // 适用 BPM 范围
}

// 分解节奏型
export interface ArpeggioPattern {
  id: string;
  name: string;
  type: 'arpeggio';
  notation: string; // 如 "6-3-2-3-1-3-2-3" 或 "低-高循环"
  sequence: Array<{
    string: number; // 1-6 (从高音弦到低音弦)
    accent?: boolean;
    duration?: number;
  }>;
  tags: string[];
  notes?: string;
  bpmRange?: [number, number];
}

export type RhythmPattern = StrummingPattern | ArpeggioPattern;

// LocalStorage 存储
{
  "rhythm-pattern-preferences": {
    [progressionId: string]: {
      type: 'strum' | 'arpeggio';
      patternId: string;
    }
  },
  "custom-rhythm-patterns": RhythmPattern[]
}
```

**理由：**
- 分离扫弦和分解两种模式，类型清晰
- `notation` 字段方便显示与输入
- `sequence` 数组支持精确控制每个音符
- 重音和时值可选，MVP 阶段可简化

**预置节奏型库：**

**扫弦节奏型（10+ 个）：**
1. **基础类**：
   - 全下扫 (D D D D)
   - 全上扫 (U U U U)
   - 交替 (D U D U)
2. **流行/民谣类**：
   - 经典民谣 (D DU UDU)
   - 四四拍 (D D DU U)
   - 轻快 (D DU UDU)
3. **摇滚/放克类**：
   - 摇滚重音 (D>D U D>U)
   - 放克切音 (D xU xD U)
4. **布鲁斯/爵士类**：
   - 摇摆扫弦 (D~U D~U)
   - Shuffle (D..U D..U)

**分解节奏型（8+ 个）：**
1. **经典分解**：
   - 八拍分解 (6-3-2-3-1-3-2-3)
   - 六拍分解 (6-3-2-1-2-3)
   - 四拍分解 (6-3-2-1)
2. **滚动分解**：
   - 上行 (6-5-4-3-2-1)
   - 下行 (1-2-3-4-5-6)
   - 往返 (6-5-4-3-4-5)
3. **特殊分解**：
   - Travis Picking (6-3-4-2-3-1)
   - Bossa Nova (5-2-3-1-2-3)

**解析函数：**

```typescript
export function parseStrummingPattern(input: string): StrummingPattern {
  // 支持格式：
  // "D DU UDU" - 空格分隔
  // "D>DU<U>DU" - 重音标记
  // "↓ ↓↑ ↑↓↑" - 箭头符号
  const tokens = input.trim().split(/\s+/).flatMap(t => t.split(''));
  const sequence = tokens.map(t => {
    const direction = (t === 'D' || t === '↓' || t === '>D') ? 'down' : 'up';
    const accent = t.includes('>');
    return { direction, accent };
  });
  // ...
}

export function parseArpeggioPattern(input: string): ArpeggioPattern {
  // 支持格式：
  // "6 3 2 3 1 3 2 3" - 空格分隔
  // "6-3-2-3-1-3-2-3" - 短横线分隔
  // "6>3 2 3 1>3 2 3" - 重音标记
  const tokens = input.split(/[\s-]+/);
  const sequence = tokens.map(t => {
    const string = parseInt(t.replace(/[^0-9]/g, ''));
    const accent = t.includes('>');
    return { string, accent };
  }).filter(s => s.string >= 1 && s.string <= 6);
  // ...
}
```

**音频播放实现：**

在 `useAudio` hook 中扩展方法：

```typescript
export function useAudio() {
  // 现有方法...
  
  const playWithStrummingPattern = useCallback(async (
    midi: number[],
    pattern: StrummingPattern,
    bpm: number
  ) => {
    const beatDuration = 60000 / bpm; // 每拍毫秒数
    const sixteenthDuration = beatDuration / 4; // 十六分音符时长
    
    for (const note of pattern.sequence) {
      const direction = note.direction;
      const delay = note.duration ?? sixteenthDuration;
      const gain = note.accent ? 1.5 : 1.0;
      
      if (direction === 'down') {
        // 从低音到高音播放
        for (let i = 0; i < midi.length; i++) {
          playNote(midi[i], gain);
          await sleep(delay / midi.length);
        }
      } else {
        // 从高音到低音播放
        for (let i = midi.length - 1; i >= 0; i--) {
          playNote(midi[i], gain);
          await sleep(delay / midi.length);
        }
      }
      
      await sleep(delay * 0.5); // 音符间隔
    }
  }, []);
  
  const playWithArpeggioPattern = useCallback(async (
    chordPosition: ChordPosition,
    pattern: ArpeggioPattern,
    bpm: number
  ) => {
    const beatDuration = 60000 / bpm;
    const sixteenthDuration = beatDuration / 4;
    
    for (const note of pattern.sequence) {
      const stringIndex = note.string - 1; // 转为 0-based
      const fret = chordPosition.frets[stringIndex];
      
      if (fret >= 0) {
        const midi = STANDARD_TUNING_MIDI[stringIndex] + fret;
        const gain = note.accent ? 1.5 : 1.0;
        const duration = note.duration ?? sixteenthDuration;
        
        playNote(midi, gain);
        await sleep(duration);
      }
    }
  }, []);
  
  return {
    // ...existing methods
    playWithStrummingPattern,
    playWithArpeggioPattern,
  };
}
```

### 6. UI 集成方案 - 节奏型选择器

**位置：** 在播放控制区域或练习设置面板中

**结构：**
```tsx
<Card className="rhythm-pattern-selector">
  <div className="flex items-center justify-between">
    <Label>节奏型</Label>
    <Tabs value={patternType} onValueChange={setPatternType}>
      <TabsList className="h-8">
        <TabsTrigger value="strum">扫弦</TabsTrigger>
        <TabsTrigger value="arpeggio">分解</TabsTrigger>
      </TabsList>
    </Tabs>
  </div>
  
  <Select value={selectedPattern} onValueChange={setSelectedPattern}>
    <SelectTrigger>
      <SelectValue placeholder="选择节奏型" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectLabel>基础</SelectLabel>
        {basicPatterns.map(p => (
          <SelectItem key={p.id} value={p.id}>
            {p.name} <span className="text-muted">{p.notation}</span>
          </SelectItem>
        ))}
      </SelectGroup>
      <SelectGroup>
        <SelectLabel>流行/民谣</SelectLabel>
        {/* ... */}
      </SelectGroup>
      {/* 其他分类 */}
      {customPatterns.length > 0 && (
        <SelectGroup>
          <SelectLabel>自定义</SelectLabel>
          {/* ... */}
        </SelectGroup>
      )}
    </SelectContent>
  </Select>
  
  <div className="flex gap-2 mt-2">
    <Button size="sm" variant="outline" onClick={previewPattern}>
      <Volume2 className="h-3 w-3 mr-1" />
      试听
    </Button>
    <Button size="sm" variant="outline" onClick={openCustomDialog}>
      + 自定义
    </Button>
  </div>
  
  {selectedPatternDetails && (
    <div className="mt-2 text-xs text-muted-foreground">
      <p>{selectedPatternDetails.notes}</p>
      <p className="font-mono mt-1">{selectedPatternDetails.notation}</p>
    </div>
  )}
</Card>
```

**节奏型可视化：**
- 扫弦：使用箭头符号 ↓↑，重音用加粗或 `>` 标记
- 分解：显示弦号序列，可用吉他指板简图标注

### 7. 状态管理方案

**决策：** 使用 React 状态 + LocalStorage，不引入额外状态管理库。

**状态结构：**
```typescript
// 自定义走向管理
const [customProgressions, setCustomProgressions] = useState<CustomProgressionDefinition[]>([]);

// 把位偏好管理
const [voicingPreferences, setVoicingPreferences] = useState<Record<string, Record<number, number>>>({});

// 当前走向的把位选择
const [variantByIndex, setVariantByIndex] = useState<Record<number, number>>({});

// 节奏型偏好管理
const [rhythmPatternPreferences, setRhythmPatternPreferences] = useState<Record<string, { type: 'strum' | 'arpeggio'; patternId: string }>>({});

// 自定义节奏型
const [customRhythmPatterns, setCustomRhythmPatterns] = useState<RhythmPattern[]>([]);
```

**同步策略：**
- `customProgressions` 与 LocalStorage 实时同步（每次修改后立即写入）
- `voicingPreferences` 防抖写入（300ms 后写入，避免频繁 I/O）
- `rhythmPatternPreferences` 防抖写入
- `variantByIndex` 在走向切换时从 `voicingPreferences` 加载

**自定义 Hook：**
```typescript
// hooks/useCustomProgressions.ts
export function useCustomProgressions() {
  const [progressions, setProgressions] = useState<CustomProgressionDefinition[]>(() => {
    const stored = localStorage.getItem('custom-progressions');
    return stored ? JSON.parse(stored) : [];
  });

  const addProgression = useCallback((p: CustomProgressionDefinition) => {
    setProgressions(prev => {
      const updated = [...prev, p];
      localStorage.setItem('custom-progressions', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // 其他 CRUD 方法...

  return { progressions, addProgression, updateProgression, deleteProgression };
}

// hooks/useVoicingPreferences.ts
export function useVoicingPreferences(progressionId: string) {
  const [preferences, setPreferences] = useState<Record<number, number>>(() => {
    const stored = localStorage.getItem('progression-voicing-preferences');
    const all = stored ? JSON.parse(stored) : {};
    return all[progressionId] ?? {};
  });

  const setVoicing = useCallback((chordIndex: number, voicingIndex: number) => {
    setPreferences(prev => {
      const updated = { ...prev, [chordIndex]: voicingIndex };
      
      // 更新全局存储
      const stored = localStorage.getItem('progression-voicing-preferences');
      const all = stored ? JSON.parse(stored) : {};
      all[progressionId] = updated;
      localStorage.setItem('progression-voicing-preferences', JSON.stringify(all));
      
      return updated;
    });
  }, [progressionId]);

  return { preferences, setVoicing };
}

// hooks/useRhythmPatternPreferences.ts
export function useRhythmPatternPreferences(progressionId: string) {
  const [preference, setPreference] = useState<{ type: 'strum' | 'arpeggio'; patternId: string } | null>(() => {
    const stored = localStorage.getItem('rhythm-pattern-preferences');
    const all = stored ? JSON.parse(stored) : {};
    return all[progressionId] ?? null;
  });

  const setPattern = useCallback((type: 'strum' | 'arpeggio', patternId: string) => {
    const newPref = { type, patternId };
    setPreference(newPref);
    
    const stored = localStorage.getItem('rhythm-pattern-preferences');
    const all = stored ? JSON.parse(stored) : {};
    all[progressionId] = newPref;
    localStorage.setItem('rhythm-pattern-preferences', JSON.stringify(all));
  }, [progressionId]);

  return { preference, setPattern };
}
```

#### 5.1 走向库 UI

**当前结构：**
```tsx
<Select value={progressionId} onValueChange={setProgressionId}>
  <SelectContent>
    {COMMON_PROGRESSIONS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
  </SelectContent>
</Select>
```

**扩展方案：**
```tsx
<Tabs value={libraryTab} onValueChange={setLibraryTab}>
  <TabsList>
    <TabsTrigger value="preset">预置走向</TabsTrigger>
    <TabsTrigger value="custom">自定义走向</TabsTrigger>
  </TabsList>
  <TabsContent value="preset">
    {/* 按分类分组显示 */}
    <Accordion>
      <AccordionItem value="pop">
        <AccordionTrigger>流行/摇滚 (7)</AccordionTrigger>
        <AccordionContent>
          {/* 走向列表 */}
        </AccordionContent>
      </AccordionItem>
      {/* 其他分类 */}
    </Accordion>
  </TabsContent>
  <TabsContent value="custom">
    <Button onClick={openCustomDialog}>+ 添加自定义走向</Button>
    {customProgressions.map(p => <CustomProgressionCard />)}
  </TabsContent>
</Tabs>
```

**优点：**
- 清晰区分预置与自定义
- 分类折叠减少滚动
- 搜索框可覆盖全部走向

#### 5.2 自定义走向对话框

**结构：**
```tsx
<Dialog>
  <DialogHeader>添加自定义走向</DialogHeader>
  <DialogContent>
    <Input label="走向名称" placeholder="我的练习走向" />
    
    <Tabs value={inputMode} onValueChange={setInputMode}>
      <TabsList>
        <TabsTrigger value="roman">罗马数字</TabsTrigger>
        <TabsTrigger value="chord">和弦名称</TabsTrigger>
      </TabsList>
      
      <TabsContent value="roman">
        <Textarea placeholder="I V vi IV" />
        <p className="hint">示例：ii7 V7 Imaj7</p>
      </TabsContent>
      
      <TabsContent value="chord">
        <Textarea placeholder="C Am F G" />
        <Select label="调性" value={tonic} onChange={setTonic}>...</Select>
        <Select label="大小调" value={mode} onChange={setMode}>...</Select>
      </TabsContent>
    </Tabs>
    
    {validationErrors.length > 0 && (
      <Alert variant="destructive">
        {validationErrors.map(e => <li key={e.index}>{e.message}</li>)}
      </Alert>
    )}
    
    <Textarea label="说明（可选）" placeholder="适合练习..." />
    <Input label="推荐 BPM" type="number" defaultValue={120} />
  </DialogContent>
  <DialogFooter>
    <Button variant="outline" onClick={close}>取消</Button>
    <Button onClick={save} disabled={!valid}>保存</Button>
  </DialogFooter>
</Dialog>
```

#### 5.3 把位选择器 UI

**位置：** 在当前和弦卡片下方或右侧

**结构：**
```tsx
<Card className="voicing-selector">
  <Label>选择把位</Label>
  <div className="voicing-buttons">
    {voicings.map((v, idx) => (
      <Button
        key={idx}
        variant={idx === currentVoicingIndex ? 'default' : 'outline'}
        size="sm"
        onClick={() => selectVoicing(idx)}
      >
        {getVoicingLabel(v)} {/* 如："开放" / "3品" / "8-10品" */}
      </Button>
    ))}
  </div>
  <p className="hint">当前把位：{currentVoicingDescription}</p>
</Card>
```

**把位标签生成逻辑：**
```typescript
function getVoicingLabel(voicing: ChordPosition): string {
  const positiveFrets = voicing.frets.filter(f => f > 0);
  if (positiveFrets.length === 0) return "开放";
  const minFret = Math.min(...positiveFrets);
  const maxFret = Math.max(...positiveFrets);
  if (minFret === maxFret) return `${minFret}品`;
  if (maxFret - minFret <= 3) return `${minFret}-${maxFret}品`;
  return `${minFret}品起`;
}
```

### 6. 状态管理方案

**决策：** 使用 React 状态 + LocalStorage，不引入额外状态管理库。

**状态结构：**
```typescript
// 自定义走向管理
const [customProgressions, setCustomProgressions] = useState<CustomProgressionDefinition[]>([]);

// 把位偏好管理
const [voicingPreferences, setVoicingPreferences] = useState<Record<string, Record<number, number>>>({});

// 当前走向的把位选择
const [variantByIndex, setVariantByIndex] = useState<Record<number, number>>({});
```

**同步策略：**
- `customProgressions` 与 LocalStorage 实时同步（每次修改后立即写入）
- `voicingPreferences` 防抖写入（300ms 后写入，避免频繁 I/O）
- `variantByIndex` 在走向切换时从 `voicingPreferences` 加载

**自定义 Hook：**
```typescript
// hooks/useCustomProgressions.ts
export function useCustomProgressions() {
  const [progressions, setProgressions] = useState<CustomProgressionDefinition[]>(() => {
    const stored = localStorage.getItem('custom-progressions');
    return stored ? JSON.parse(stored) : [];
  });

  const addProgression = useCallback((p: CustomProgressionDefinition) => {
    setProgressions(prev => {
      const updated = [...prev, p];
      localStorage.setItem('custom-progressions', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // 其他 CRUD 方法...

  return { progressions, addProgression, updateProgression, deleteProgression };
}

// hooks/useVoicingPreferences.ts
export function useVoicingPreferences(progressionId: string) {
  const [preferences, setPreferences] = useState<Record<number, number>>(() => {
    const stored = localStorage.getItem('progression-voicing-preferences');
    const all = stored ? JSON.parse(stored) : {};
    return all[progressionId] ?? {};
  });

  const setVoicing = useCallback((chordIndex: number, voicingIndex: number) => {
    setPreferences(prev => {
      const updated = { ...prev, [chordIndex]: voicingIndex };
      
      // 更新全局存储
      const stored = localStorage.getItem('progression-voicing-preferences');
      const all = stored ? JSON.parse(stored) : {};
      all[progressionId] = updated;
      localStorage.setItem('progression-voicing-preferences', JSON.stringify(all));
      
      return updated;
    });
  }, [progressionId]);

  return { preferences, setVoicing };
}
```

## Risks / Trade-offs

### 风险 1：LocalStorage 容量限制

**风险：** 用户创建大量自定义走向或存储大量把位偏好时可能超出 LocalStorage 限制（5-10MB）。

**缓解措施：**
- 限制自定义走向数量（如最多 200 个）
- 提供"清理旧数据"功能
- 捕获 `QuotaExceededError` 并提示用户

### 风险 2：输入解析的边界情况

**风险：** 用户输入各种非标准格式的罗马数字或和弦名称，解析可能失败或产生意外结果。

**缓解措施：**
- 提供详细的输入示例与格式说明
- 实时验证与错误提示
- 记录常见错误模式并持续改进解析器
- 提供"预览生成结果"功能，让用户确认后再保存

### 风险 3：把位数量过多导致 UI 拥挤

**风险：** 某些和弦（如 C major）可能有 10+ 个可用把位，在移动端显示所有选项可能拥挤。

**缓解措施：**
- 默认仅显示前 5-6 个最常用把位
- 提供"查看更多把位"按钮展开完整列表
- 使用分页或滚动容器
- 按品位范围分组折叠

### 权衡 1：罗马数字解析的复杂度 vs 灵活性

**权衡：** 支持更复杂的罗马数字符号（如 `bVII`、`#iv°`）会增加解析器复杂度。

**决策：** MVP 阶段仅支持常见符号（I-VII、7、maj7、m7、dim、aug），复杂符号留待后续迭代。

**理由：** 常见符号覆盖 95% 的使用场景，复杂符号使用频率低且增加维护成本。

### 权衡 2：自动推断调性 vs 用户指定

**权衡：** 和弦名称模式下，自动推断调性可能不准确（如 Am-F-C-G 可能是 C 大调或 A 小调）。

**决策：** 提供自动推断作为默认值，但允许用户手动覆盖。

**理由：** 平衡用户体验（减少输入）与准确性（允许修正）。

## Migration Plan

### 阶段 1：扩展预置走向库（无迁移需求）

- 直接在 `COMMON_PROGRESSIONS` 数组添加新走向
- 现有用户自动看到新走向
- 无数据迁移

### 阶段 2：自定义走向功能（新增存储）

- 新增 LocalStorage key `custom-progressions`
- 无需迁移现有数据
- 新用户从空列表开始

### 阶段 3：把位选择器（扩展现有存储）

- 新增 LocalStorage key `progression-voicing-preferences`
- 现有 `progression-practice-settings` 不受影响
- `variantByIndex` 状态保持兼容（仅增加持久化）

### 回滚策略

- 所有功能都是增量添加，不修改现有数据结构
- 如需回滚，仅删除新增的 LocalStorage keys
- 现有功能完全不受影响

## Open Questions

### Q1: 是否需要导出/导入自定义走向？

**讨论：** 用户可能希望分享自定义走向或在不同浏览器间迁移。

**初步决策：** 不在 MVP 范围内，留待后续版本（可通过 JSON 文件导出/导入实现）。

### Q2: 是否需要"推荐把位组合"功能？

**讨论：** 系统可以根据把位切换的流畅度（手指移动距离、弦数变化等）自动推荐最佳把位组合。

**初步决策：** 不在 MVP 范围内，需要较复杂的算法且收益不确定。先让用户手动选择，收集反馈后决定是否实现。

### Q3: 走向库分类是否需要可配置？

**讨论：** 用户可能希望创建自定义分类或标签。

**初步决策：** 不在 MVP 范围内，预置分类（流行、爵士、布鲁斯、民谣、拉丁、自定义）应足够覆盖常见需求。

### Q4: 是否支持"走向链"（多个走向连续播放）？

**讨论：** 高级用户可能希望连续练习多个走向（如 A 段 + B 段）。

**初步决策：** 不在 MVP 范围内，单个走向的循环播放已足够复杂。
