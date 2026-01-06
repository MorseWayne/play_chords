# Change: 增强和弦走向库与把位设置

## Why

当前和弦走向练习功能已经实现了基础的动态练习能力，但在实际使用中存在以下限制：

1. **走向库内容有限**：仅有 5 个预置走向（I–V–vi–IV、50s走向、2-5-1、12小节布鲁斯、Andalusian），无法满足不同风格和练习需求
2. **无法自定义走向**：用户无法输入自己想练习的和弦进行，限制了练习的灵活性
3. **把位固定单一**：走向中每个和弦的把位是系统自动选择的（当前使用 `variantByIndex` 机制），但用户可能想练习特定把位之间的切换，例如低把位到高把位的流畅过渡

这些限制使得用户在进阶练习时缺少必要的工具支持，无法有针对性地训练特定的和弦连接和把位转换。

## What Changes

### 1. 扩展预置走向库（20+ 常见走向）

- 流行/摇滚类：增加 vi–IV–I–V、I–IV–V、I–iii–IV–V 等
- 爵士类：增加 I–vi–ii–V、iii–vi–ii–V、循环 2-5-1 等
- 布鲁斯/摇滚类：8 小节布鲁斯、布鲁斯变体、强力和弦走向
- 民谣/乡村类：I–V–vi–iii–IV–I–IV–V 等
- 拉丁/Bossa Nova 类：经典 bossa 和弦进行
- 每个走向附带标签（tags）、说明（notes）、推荐 BPM

### 2. 自定义走向功能

- 提供"自定义走向"输入界面
- 支持两种输入方式：
  - **罗马数字模式**：输入如 `I vi IV V` 或 `ii7 V7 Imaj7`
  - **和弦名称模式**：输入如 `C Am F G` 或 `Dm7 G7 Cmaj7`
- 输入解析与验证：
  - 解析罗马数字与和弦符号
  - 自动识别和弦类型（major/minor/7/maj7/m7/sus4/dim 等）
  - 提示输入错误并给出建议
- 自定义走向可保存到本地存储，形成"我的走向库"
- 支持命名、编辑、删除自定义走向

### 3. 和弦把位选择器

- 为走向中的每个和弦位置提供把位选择能力
- 显示方式：
  - 在当前和弦指法图旁边显示"把位选择器"
  - 展示可用把位的品位范围（如"0-3品""5-7品""9-12品"）
  - 点击或选择某个把位，立即更新指法图并可试听
- 把位记忆：
  - 每个走向的每个位置记住用户选择的把位
  - 切换走向时保留用户的把位偏好（基于走向 ID）
- 把位可视化：
  - 在"走向预览"区域，每个和弦卡片上可显示当前选择的把位信息（如"5品把位"）
  - 用户可快速点击切换把位，形成最佳练习组合

### 4. 节奏型选择

- 提供丰富的扫弦节奏型库（10+ 常见节奏型）
  - 基础节奏型：全下扫、全上扫、下-下-上-上-下-上
  - 流行/民谣节奏型：D DU UDU、D D DU U、D DU UDU等
  - 摇滚/放克节奏型：带切音的节奏型
  - 布鲁斯/爵士节奏型：摇摆感节奏型
- 提供多种分解节奏型（8+ 常见模式）
  - 经典分解：6-3-2-3-1-3-2-3（八拍分解）
  - 四拍分解：6-3-2-1、5-3-2-1
  - 滚动分解：6-5-4-3-2-1、1-2-3-4-5-6
  - Travis picking：拇指交替低音 + 高音旋律
- 节奏型可视化展示：
  - 扫弦：箭头符号（↓↑）+ 重音标记（>）
  - 分解：弦号序列 + 时值标记
- 节奏型选择器：
  - 按风格分类（流行、摇滚、民谣、爵士、布鲁斯）
  - 支持播放预览试听
  - 显示节奏型说明与适用场景
- 自定义节奏型（进阶）：
  - 扫弦：输入 D/U 序列（如 `D DU UDU`）
  - 分解：输入弦号序列（如 `6 3 2 3 1 3 2 3`）
  - 支持重音标记与时值调整
- 节奏型偏好持久化：记住每个走向使用的节奏型

### 5. 数据结构变更

- 扩展 `ProgressionDefinition` 支持更多元数据（难度、风格分类）
- 新增自定义走向数据结构 `CustomProgressionDefinition`
- 新增节奏型数据结构 `StrummingPattern` 和 `ArpeggioPattern`
- 扩展 LocalStorage 存储：
  - `custom-progressions`：用户自定义的走向列表
  - `progression-voicing-preferences`：每个走向的把位偏好设置
  - `rhythm-pattern-preferences`：每个走向的节奏型偏好设置
  - `custom-rhythm-patterns`：用户自定义的节奏型

## Impact

### Affected specs

- **修改 capability**: `progression-practice`（和弦走向练习）
  - 新增自定义走向管理需求
  - 新增把位选择器需求
  - 新增节奏型选择器需求
  - 扩展走向库需求

### Affected code

- **扩展文件**：
  - `src/lib/progressions.ts`：扩展 `COMMON_PROGRESSIONS` 数组，新增 15+ 走向定义
  - `src/lib/rhythms.ts`（新增）：定义节奏型数据结构和预置节奏型库
  - `src/app/progression-practice/page.tsx`：
    - 新增自定义走向 UI（输入框、解析逻辑、保存/加载）
    - 新增把位选择器组件
    - 新增节奏型选择器组件
    - 扩展 `variantByIndex` 逻辑支持用户手动选择与持久化
  - `src/hooks/useAudio.ts`：扩展支持按节奏型播放
- **新增组件**（可选）：
  - `src/components/ProgressionEditor.tsx`：自定义走向编辑器
  - `src/components/VoicingSelector.tsx`：把位选择器组件
  - `src/components/RhythmPatternSelector.tsx`：节奏型选择器组件
- **新增工具函数**：
  - `src/lib/progressions.ts`：
    - `parseRomanNumeralString(input: string): string[]`：解析罗马数字字符串
    - `parseChordNameString(input: string): GeneratedProgressionChord[]`：解析和弦名称字符串
    - `validateProgressionInput(input: string): ValidationResult`：验证用户输入
  - `src/lib/rhythms.ts`：
    - `parseStrummingPattern(input: string): StrummingPattern`：解析扫弦节奏型
    - `parseArpeggioPattern(input: string): ArpeggioPattern`：解析分解节奏型
    - `playWithPattern(midi: number[], pattern: RhythmPattern, bpm: number): void`：按节奏型播放
- **LocalStorage 管理**：
  - 新增 hook `useCustomProgressions` 管理自定义走向 CRUD
  - 新增 hook `useVoicingPreferences` 管理把位偏好
  - 新增 hook `useRhythmPatternPreferences` 管理节奏型偏好

### Breaking Changes

无破坏性变更。所有新增功能都是向后兼容的扩展。

## Assumptions / Non-Goals (MVP)

- 不实现拖拽式可视化编辑器（仅文本输入）
- 不实现云端同步与分享（仅本地存储）
- 不实现自动推荐"最佳把位组合"（由用户手动选择）
- 不实现把位切换的"难度评分"或"手势分析"
- 节奏型不支持复杂的力度变化和细微时值调整（仅支持基本的上下扫和弦号序列）
- 不实现节奏型的实时录制功能（仅文本输入定义）
- 不实现切音（mute）和闷音（palm mute）的精确控制

## Future Enhancements

- 智能把位推荐：根据手指跨度、切换流畅度自动推荐最优把位组合
- 走向可视化编辑器：拖拽和弦卡片、调整顺序、插入/删除
- 走向分享与导入：生成分享链接或二维码，导入其他用户的走向
- 走向难度评级：根据和弦数量、把位跨度、速度等自动评估难度
- 走向推荐系统：基于用户练习历史推荐相似走向或进阶走向
- 节奏型可视化编辑器：可视化时间轴拖拽编辑节奏型
- 节奏型实时录制：通过麦克风或 MIDI 输入录制节奏型
- 力度与时值精细控制：支持每个音符的力度和细微时值调整
- 切音与闷音支持：在节奏型中标记切音和闷音位置
- 节奏型混合模式：在一个走向中不同和弦使用不同节奏型