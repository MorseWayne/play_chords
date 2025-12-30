# Capability: Metronome (节拍器) - 重构为独立界面

## ADDED Requirements

### Requirement: 多拍号支持

系统 SHALL 支持多种拍号选择（4/4、3/4、6/8、2/4），用户可以在运行时切换拍号。

#### Scenario: 选择 4/4 拍

- **WHEN** 用户选择 4/4 拍号
- **THEN** 节拍器应循环播放 4 拍
- **AND** 第 1 拍为强拍，第 2-4 拍为弱拍

#### Scenario: 选择 3/4 拍

- **WHEN** 用户选择 3/4 拍号
- **THEN** 节拍器应循环播放 3 拍
- **AND** 第 1 拍为强拍，第 2-3 拍为弱拍
- **AND** 视觉指示器应显示 3 个圆点

#### Scenario: 选择 6/8 拍

- **WHEN** 用户选择 6/8 拍号
- **THEN** 节拍器应循环播放 6 拍
- **AND** 第 1、4 拍为强拍（次强），第 2-3、5-6 拍为弱拍
- **AND** 视觉指示器应显示 6 个圆点

#### Scenario: 选择 2/4 拍

- **WHEN** 用户选择 2/4 拍号
- **THEN** 节拍器应循环播放 2 拍
- **AND** 第 1 拍为强拍，第 2 拍为弱拍
- **AND** 视觉指示器应显示 2 个圆点

#### Scenario: 运行时切换拍号

- **WHEN** 节拍器正在运行且用户切换拍号
- **THEN** 节拍器应立即切换到新拍号
- **AND** 从新拍号的第 1 拍开始播放
- **AND** 不应中断节拍器运行

### Requirement: 音量控制

系统 SHALL 提供节拍器音量控制，允许用户调节音效音量而不影响其他音频。

#### Scenario: 调节音量

- **WHEN** 用户将音量滑块设置为 50%
- **THEN** 节拍音效的增益应调整为原音量的 50%
- **AND** 和弦播放音效不受影响

#### Scenario: 音量边界值

- **WHEN** 用户将音量设置为 0%
- **THEN** 节拍音效应静音（但视觉指示器继续运行）
- **WHEN** 用户将音量设置为 100%
- **THEN** 节拍音效应以最大音量播放

#### Scenario: 音量持久化

- **WHEN** 用户调节音量为 80%
- **THEN** 设置应保存到 localStorage 的 `metronome-volume` 键
- **AND** 页面刷新后音量应恢复为 80%

### Requirement: 独立全屏界面

系统 SHALL 提供独立的节拍器界面，通过对话框/抽屉模式打开，而非嵌入在其他组件中。

#### Scenario: 打开节拍器

- **WHEN** 用户点击主页面的"节拍器"按钮
- **THEN** 应打开全屏/侧边抽屉模式的节拍器界面
- **AND** 界面应占据主要视觉空间

#### Scenario: 关闭节拍器

- **WHEN** 用户点击关闭按钮或按下 ESC 键
- **THEN** 节拍器界面应关闭
- **AND** 如果节拍器正在运行，应自动停止
- **AND** 应返回主页面

#### Scenario: 全屏布局

- **WHEN** 节拍器界面打开
- **THEN** BPM 数值应以大号字体显示（易于远距离查看）
- **AND** 视觉节拍指示器应放大显示
- **AND** 所有控件应有足够的间距和大小（触控友好）

### Requirement: 拍号选择器

系统 SHALL 提供清晰的拍号选择器，显示所有可用拍号及其说明。

#### Scenario: 显示拍号选项

- **WHEN** 节拍器界面打开
- **THEN** 应显示所有支持的拍号选项（4/4、3/4、6/8、2/4）
- **AND** 当前选中的拍号应高亮显示
- **AND** 每个拍号应有简短说明（如"4/4 - 通用拍"、"3/4 - 华尔兹"）

#### Scenario: 拍号说明

- **WHEN** 用户查看拍号选择器
- **THEN** 应提供拍号的音乐风格提示
  - 4/4：通用拍（摇滚、流行）
  - 3/4：华尔兹、圆舞曲
  - 6/8：行进曲、民谣
  - 2/4：进行曲、波尔卡

## MODIFIED Requirements

### Requirement: BPM 设置持久化

系统 SHALL 将用户的 BPM、拍号和音量设置保存到 localStorage，并在页面加载时恢复。

#### Scenario: 保存所有设置

- **WHEN** 用户调节 BPM 为 140、拍号为 3/4、音量为 80%
- **THEN** 设置应立即保存到 localStorage
  - `metronome-bpm`: 140
  - `metronome-time-signature`: '3/4'
  - `metronome-volume`: 80

#### Scenario: 恢复所有设置

- **WHEN** 用户重新打开页面
- **THEN** BPM、拍号、音量应恢复为上次保存的值
- **AND** 如果 localStorage 中没有保存值，应使用默认值
  - BPM: 120
  - 拍号: 4/4
  - 音量: 70

#### Scenario: 无效值处理

- **WHEN** localStorage 中的任何值无效或损坏
- **THEN** 应使用对应的默认值
- **AND** 应覆盖 localStorage 中的无效值

### Requirement: 视觉节拍指示器

系统 SHALL 提供视觉节拍指示器，根据当前拍号动态显示相应数量的圆点，并显示当前拍号和节拍进度。

#### Scenario: 动态圆点数量

- **WHEN** 用户切换到 3/4 拍
- **THEN** 应显示 3 个圆点
- **WHEN** 用户切换到 6/8 拍
- **THEN** 应显示 6 个圆点
- **AND** 应有平滑的过渡动画

#### Scenario: 强拍视觉区分

- **WHEN** 播放强拍时
- **THEN** 对应的圆点应以更大的尺寸和亮度显示
- **AND** 应与弱拍圆点有明显的视觉区分

#### Scenario: 6/8 拍特殊显示

- **WHEN** 节拍器运行在 6/8 拍
- **THEN** 第 1、4 拍的圆点应显示为次强拍样式
- **AND** 第 2-3、5-6 拍应显示为弱拍样式
- **AND** 可选：每 3 拍分组显示（视觉分隔）

### Requirement: 响应式设计

系统 SHALL 在桌面和移动端设备上提供适配的节拍器界面，针对全屏模式优化布局。

#### Scenario: 桌面端全屏显示

- **WHEN** 用户在桌面浏览器上打开节拍器
- **THEN** 应以侧边抽屉或居中对话框模式显示
- **AND** 宽度应不少于 400px，不超过 600px
- **AND** 所有控件应垂直排列，层次清晰

#### Scenario: 移动端全屏显示

- **WHEN** 用户在移动设备上打开节拍器
- **THEN** 应以全屏模式显示
- **AND** 所有控件应适配屏幕宽度
- **AND** BPM 数值应放大（至少 48px 字体）
- **AND** 视觉指示器圆点应不小于 32px

#### Scenario: 大屏幕远距离查看

- **WHEN** 用户在桌面端打开节拍器
- **THEN** BPM 数值应使用大号字体（至少 36px）
- **AND** 视觉指示器应足够大（至少 24px 圆点）
- **AND** 当前拍号应清晰显示

## REMOVED Requirements

### Requirement: 嵌入式布局

**原有需求**：节拍器显示在 PlaybackControls 组件中或折叠面板中。

**移除原因**：节拍器重构为独立界面，不再嵌入在其他组件中。

**迁移说明**：用户通过主页面的节拍器按钮访问独立界面，而非在播放控制区域查看。

## Notes

### 技术实现建议

1. **拍号配置数据结构**：

```typescript
type TimeSignature = '4/4' | '3/4' | '6/8' | '2/4';

interface TimeSignatureConfig {
  beats: number;           // 总拍数
  strongBeats: number[];   // 强拍位置（1-based）
  label: string;           // 显示名称
  description: string;     // 音乐风格说明
}
```

2. **音量实现**：使用 Web Audio API 的 GainNode，音量值 0-100 映射到增益值 0.0-1.0。

3. **界面组件**：使用 Shadcn Sheet 组件，设置 `side="right"` 或 `side="bottom"`（移动端）。

4. **性能考虑**：圆点数量变化时使用 CSS transition，避免重新渲染整个组件。

### 兼容性说明

- 现有的 `useMetronome` hook API 将扩展（添加可选参数），保持向后兼容
- `Metronome` 组件 props 可能改变，但不对外暴露（内部组件）
- 从 `PlaybackControls` 移除节拍器为破坏性变更，需在发布说明中说明

