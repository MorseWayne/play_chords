# Design: 节拍器独立界面重构

## Context

当前节拍器实现嵌入在 `PlaybackControls` 组件中，功能基础（仅支持 4/4 拍），空间受限。用户希望节拍器成为一个独立的功能模块，支持多拍号、音量控制，并提供更好的视觉体验。

### 背景约束

- 项目使用 Next.js App Router + React 19 + TypeScript
- 已有 Shadcn UI 组件库（包括 Sheet/Dialog）
- 现有 `useMetronome` hook 基于 Web Audio API 实现
- 节拍器需要与和弦播放功能共存（共享或独立 AudioContext）

### 干系人需求

- **用户**：希望节拍器易于访问，功能完整，适合远距离查看
- **开发者**：希望代码清晰、可维护、性能良好

## Goals / Non-Goals

### Goals

- 将节拍器重构为独立的全屏/抽屉界面
- 支持 4 种常用拍号（4/4、3/4、6/8、2/4）
- 添加音量控制（0-100%）
- 优化大屏幕/远距离查看体验
- 保持性能和精度不受影响

### Non-Goals

- 不实现复杂拍号（5/4、7/8、9/8 等）- 留待后续扩展
- 不实现自定义重音模式 - 使用标准强弱拍模式
- 不实现节拍器与和弦循环联动 - 本次仅重构 UI 和基础功能
- 不改变现有和弦播放功能

## Decisions

### Decision 1: 使用 Shadcn Sheet 而非 Dialog

**选择**：使用 `Sheet` 组件实现侧边抽屉模式

**理由**：

- Sheet 提供侧边滑出效果，适合工具类功能
- 桌面端从右侧滑出，不遮挡整个屏幕
- 移动端可配置为全屏模式（`side="bottom"` + 全高度）
- 视觉上更轻量，用户可快速打开/关闭

**备选方案**：

- **Dialog（居中对话框）**：更模态化，但可能过于"重"，不适合频繁切换
- **独立路由页面（/metronome）**：需要导航切换，破坏单页应用体验

**权衡**：Sheet 平衡了独立性和易用性，符合"快速呼出工具"的定位。

### Decision 2: 拍号数据结构设计

**选择**：使用配置对象定义每种拍号的特性

```typescript
const TIME_SIGNATURES: Record<TimeSignature, TimeSignatureConfig> = {
  '4/4': {
    beats: 4,
    strongBeats: [1],
    label: '4/4 拍',
    description: '通用拍（摇滚、流行）',
  },
  '3/4': {
    beats: 3,
    strongBeats: [1],
    label: '3/4 拍',
    description: '华尔兹、圆舞曲',
  },
  '6/8': {
    beats: 6,
    strongBeats: [1, 4],
    label: '6/8 拍',
    description: '行进曲、民谣',
  },
  '2/4': {
    beats: 2,
    strongBeats: [1],
    label: '2/4 拍',
    description: '进行曲、波尔卡',
  },
};
```

**理由**：

- 声明式配置，易于扩展新拍号
- 强拍位置集中管理，避免逻辑分散
- 提供用户友好的标签和说明

**备选方案**：

- **硬编码 if/switch**：难以维护，扩展性差
- **复杂的音乐理论建模**：过度设计，不符合"简单优先"原则

### Decision 3: 音量控制实现

**选择**：使用独立的 `GainNode` 控制节拍器音量

```typescript
// 在 useMetronome 中
const metronomeGainRef = useRef<GainNode | null>(null);

function playBeat(beatNumber: number, time: number) {
  const ctx = getAudioContext();
  if (!ctx) return;

  // 创建振荡器和增益节点
  const oscillator = ctx.createOscillator();
  const beatGainNode = ctx.createGain();
  const metronomeGainNode = metronomeGainRef.current;

  // 音效增益（强拍/弱拍）
  const isStrongBeat = strongBeats.includes(beatNumber);
  beatGainNode.gain.setValueAtTime(
    isStrongBeat ? STRONG_BEAT_GAIN : WEAK_BEAT_GAIN,
    time
  );

  // 用户音量控制（0-1）
  if (metronomeGainNode) {
    metronomeGainNode.gain.value = volume / 100;
  }

  // 连接节点
  oscillator.connect(beatGainNode);
  beatGainNode.connect(metronomeGainNode);
  metronomeGainNode.connect(ctx.destination);
}
```

**理由**：

- 独立的 GainNode 不影响和弦播放音量
- 用户音量与音效增益分离，逻辑清晰
- 0% 音量时完全静音，但视觉指示器继续工作

**备选方案**：

- **直接调整振荡器增益**：混淆了音效设计和用户偏好
- **使用主 AudioContext 音量**：会影响和弦播放

### Decision 4: 拍号切换时的行为

**选择**：切换拍号时立即重置到新拍号的第 1 拍

**理由**：

- 避免拍号切换时出现"半截"循环（如从 4/4 的第 3 拍切到 3/4）
- 符合用户预期：切换拍号 = 重新开始
- 实现简单，无需复杂的状态同步

**备选方案**：

- **平滑过渡**：在当前小节结束后切换 - 实现复杂，用户可能感到延迟
- **立即切换但保持拍号**：可能导致视觉指示器错位

### Decision 5: 状态持久化策略

**选择**：扩展现有的 localStorage 存储，使用独立的键

```typescript
const STORAGE_KEYS = {
  bpm: 'metronome-bpm',
  timeSignature: 'metronome-time-signature',
  volume: 'metronome-volume',
};
```

**理由**：

- 保持与现有持久化逻辑一致
- 独立的键便于调试和迁移
- 默认值策略清晰（无效值回退到默认）

**备选方案**：

- **统一 JSON 对象**：单一键存储 `{ bpm, timeSignature, volume }` - 更容易损坏，全失效
- **不持久化拍号/音量**：用户体验差

### Decision 6: 节拍器触发按钮位置

**选择**：在主页面顶部操作栏添加"节拍器"按钮（与暗色模式切换按钮并列）

**理由**：

- 顶部操作栏是全局功能的常见位置
- 不占用核心内容区域
- 移动端和桌面端位置一致

**备选方案**：

- **悬浮按钮（FAB）**：在移动端常见，但桌面端可能显得突兀
- **侧边栏**：项目当前无侧边栏，引入会增加复杂度

## Risks / Trade-offs

### Risk 1: 破坏性变更影响现有用户

**风险**：从 `PlaybackControls` 移除节拍器，用户可能找不到功能

**缓解措施**：

- 在顶部添加明显的"节拍器"按钮（图标 + 文字）
- 首次打开应用时显示工具提示（"节拍器已移至此处"）
- 在发布说明中明确说明变更

### Risk 2: 多拍号增加测试复杂度

**风险**：每种拍号需要验证强拍位置、循环逻辑、视觉指示器

**缓解措施**：

- 使用配置驱动的设计，减少硬编码逻辑
- 为 `useMetronome` hook 编写单元测试（后续）
- 手动测试每种拍号的典型场景

### Risk 3: 6/8 拍的强拍逻辑可能引起争议

**权衡**：6/8 拍可以视为 2 大拍（每大拍 3 小拍）或 6 小拍（第 1、4 拍次强）

**选择**：采用第 1、4 拍为次强拍（相同音效强度），其余为弱拍

**理由**：

- 简化实现（只有强/弱两种音效）
- 符合大多数音乐理论教材
- 用户可通过视觉指示器和音效区分强拍位置

**后续**：如有需求，可添加"复合拍重音模式"配置

### Trade-off: 全屏界面 vs 嵌入式布局

**选择**：全屏界面

**优势**：

- 空间充足，可容纳更多控件
- 视觉聚焦，适合练习场景
- 易于扩展新功能

**劣势**：

- 需要额外点击打开（嵌入式一步可见）
- 增加一个对话框组件

**权衡结论**：独立界面更符合"专业工具"定位，劣势可通过快捷键和明显的入口缓解。

## Migration Plan

### 步骤 1: 实现新功能（向后兼容）

- 保留现有 `PlaybackControls` 中的节拍器
- 并行开发新的 `MetronomeDialog` 和增强的 `useMetronome`
- 在测试环境验证新功能

### 步骤 2: 切换入口（灰度发布）

- 在主页面添加节拍器按钮，同时保留 `PlaybackControls` 中的旧版本
- 添加 feature flag（可选）：`ENABLE_STANDALONE_METRONOME`
- 收集用户反馈

### 步骤 3: 移除旧实现

- 从 `PlaybackControls` 移除节拍器组件
- 清理未使用的代码
- 更新文档

### 回滚策略

如果新实现有严重问题：

1. 移除主页面的节拍器按钮
2. 恢复 `PlaybackControls` 中的节拍器（保留旧代码到归档）
3. 修复问题后重新部署

## Open Questions

### Q1: 是否需要"迷你模式"

**问题**：全屏节拍器占用空间大，用户可能希望在练习和弦时同时看到节拍器

**选项**：

- A: 仅提供全屏模式（本 proposal 范围）
- B: 添加"迷你模式"切换，节拍器缩小到角落（类似画中画）
- C: 提供两种入口：全屏模式和嵌入模式

**建议**：先实现 A，根据用户反馈决定是否添加 B/C

### Q2: 是否共享 AudioContext

**问题**：`useAudio` 和 `useMetronome` 都使用 Web Audio API，是否应共享 AudioContext

**当前状态**：各自创建独立的 AudioContext

**考虑**：

- 浏览器限制 AudioContext 数量（通常 6 个）
- 共享 AudioContext 需要更复杂的资源管理

**建议**：保持独立 AudioContext（当前方案），除非遇到浏览器限制

### Q3: 6/8 拍的视觉分组

**问题**：6/8 拍的 6 个圆点是否需要视觉分组（每 3 个一组）

**选项**：

- A: 平铺 6 个圆点（统一样式）
- B: 添加分组间距（如 ●●● | ●●●）
- C: 使用不同大小区分主副强拍

**建议**：先实现 A（简单），测试时观察用户体验

## Success Metrics

- ✅ 节拍器打开/关闭流畅（< 100ms）
- ✅ 拍号切换无延迟（立即生效）
- ✅ 音量调节实时响应（< 50ms）
- ✅ 节拍精度误差 < ±5ms（所有拍号）
- ✅ 移动端触控目标 ≥ 44x44px
- ✅ 暗色模式下视觉舒适（无高亮刺眼）
- ✅ 用户能在 5 秒内找到节拍器入口（可用性测试）
