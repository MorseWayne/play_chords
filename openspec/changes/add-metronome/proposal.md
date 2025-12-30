# Change: 添加节拍器功能（Metronome）

## Why

用户在练习吉他和弦时，需要节拍器来：

- 保持稳定的节奏和速度
- 培养良好的时间感
- 辅助练习和弦转换的流畅度

当前应用仅支持单次播放和弦（扫弦/分解），缺少节奏训练工具。添加节拍器可以显著提升练习体验，是音乐练习应用的标配功能。

## What Changes

- 新增节拍器组件，集成在现有的播放控制区域
- 支持 BPM 调节（40-240 BPM，默认 120）
- 固定 4/4 拍号（符合大多数流行音乐）
- 使用 Web Audio API 生成哔哔声，区分强拍/弱拍音色
- 提供视觉节拍指示器（闪烁圆点）
- 开始/停止控制按钮
- 节拍器状态持久化（用户设置保存到 localStorage）

## Impact

### Affected specs

- **新增 capability**: `metronome`（节拍器核心功能）

### Affected code

- **新增文件**:
  - `src/hooks/useMetronome.ts` - 节拍器逻辑 hook（Web Audio API 封装）
  - `src/components/Metronome.tsx` - 节拍器 UI 组件
- **修改文件**:
  - `src/components/PlaybackControls.tsx` - 集成节拍器组件
  - `src/app/page.tsx` - 可能需要调整布局以容纳节拍器控件

### Breaking Changes

无破坏性变更。这是纯新增功能，不影响现有的和弦选择、指法展示和音频播放功能。

## Dependencies

- 依赖现有的 Web Audio API（与 `useAudio` hook 使用相同的浏览器 API）
- 不引入新的外部依赖包
- 可与现有音频播放功能共存（不冲突）

## Future Enhancements

本提案实现 MVP 版本。后续可扩展：

- 多拍号支持（3/4、6/8、5/4 等）
- 节拍器与和弦循环播放联动（自动按节拍播放和弦进行）
- 复合节奏型（如细分到 16 分音符）
- 音色自定义（使用 SoundFont 打击乐音色）
- 渐进速度训练（自动加速 BPM）
