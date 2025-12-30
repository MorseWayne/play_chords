# Capability: Metronome (节拍器)

## ADDED Requirements

### Requirement: BPM 调节

系统 SHALL 允许用户调节节拍器的速度（BPM），范围为 40-240 BPM。

#### Scenario: 设置 BPM

- **WHEN** 用户通过滑块或输入框设置 BPM 为 120
- **THEN** 节拍器应以每分钟 120 拍的速度运行
- **AND** 设置应保存到 localStorage

#### Scenario: BPM 边界值

- **WHEN** 用户尝试设置 BPM 为 30（低于最小值）
- **THEN** 系统应自动修正为 40
- **WHEN** 用户尝试设置 BPM 为 300（高于最大值）
- **THEN** 系统应自动修正为 240

#### Scenario: 实时调节 BPM

- **WHEN** 节拍器正在运行且用户调节 BPM
- **THEN** 节拍速度应立即响应新的 BPM 值
- **AND** 不应中断节拍器运行

### Requirement: 节拍音效生成

系统 SHALL 使用 Web Audio API 生成节拍音效，并区分强拍和弱拍。

#### Scenario: 强拍音效

- **WHEN** 节拍器播放第 1 拍（强拍）
- **THEN** 应播放频率为 800Hz 的哔哔声
- **AND** 音量应为 0.7（相对增益）
- **AND** 持续时间应为 50ms

#### Scenario: 弱拍音效

- **WHEN** 节拍器播放第 2、3、4 拍（弱拍）
- **THEN** 应播放频率为 600Hz 的哔哔声
- **AND** 音量应为 0.5（相对增益）
- **AND** 持续时间应为 30ms

#### Scenario: 4/4 拍循环

- **WHEN** 节拍器运行在 4/4 拍
- **THEN** 应循环播放：强拍-弱拍-弱拍-弱拍
- **AND** 拍号计数应为 1, 2, 3, 4, 1, 2, 3, 4...

### Requirement: 节拍器控制

系统 SHALL 提供开始和停止节拍器的控制。

#### Scenario: 启动节拍器

- **WHEN** 用户点击"开始"按钮
- **THEN** 节拍器应立即开始播放节拍
- **AND** 按钮文字应变为"停止"
- **AND** 视觉指示器应开始同步闪烁

#### Scenario: 停止节拍器

- **WHEN** 节拍器正在运行且用户点击"停止"按钮
- **THEN** 节拍器应立即停止播放
- **AND** 按钮文字应变为"开始"
- **AND** 视觉指示器应重置到初始状态

#### Scenario: 键盘快捷键

- **WHEN** 用户按下空格键（焦点在节拍器区域时）
- **THEN** 应切换节拍器的开始/停止状态

### Requirement: 视觉节拍指示器

系统 SHALL 提供视觉节拍指示器，显示当前拍号和节拍进度。

#### Scenario: 拍号指示

- **WHEN** 节拍器播放第 1 拍
- **THEN** 第 1 个指示器圆点应高亮显示
- **AND** 其他圆点应保持暗淡状态

#### Scenario: 拍号循环显示

- **WHEN** 节拍器从第 4 拍切换到第 1 拍
- **THEN** 第 4 个圆点应变为暗淡
- **AND** 第 1 个圆点应高亮显示
- **AND** 应有平滑的过渡动画

#### Scenario: 停止状态指示

- **WHEN** 节拍器停止
- **THEN** 所有指示器圆点应重置为未激活状态

### Requirement: BPM 设置持久化

系统 SHALL 将用户的 BPM 设置保存到 localStorage，并在页面加载时恢复。

#### Scenario: 保存 BPM 设置

- **WHEN** 用户调节 BPM 为 140
- **THEN** 设置应立即保存到 localStorage 的 `metronome-bpm` 键

#### Scenario: 恢复 BPM 设置

- **WHEN** 用户重新打开页面
- **THEN** BPM 应恢复为上次保存的值
- **AND** 如果 localStorage 中没有保存值，应使用默认值 120

#### Scenario: 无效值处理

- **WHEN** localStorage 中的 BPM 值无效或损坏
- **THEN** 应使用默认值 120
- **AND** 应覆盖 localStorage 中的无效值

### Requirement: 定时准确性

系统 SHALL 使用高精度定时机制确保节拍器的准确性。

#### Scenario: 精确定时

- **WHEN** 节拍器运行在 120 BPM
- **THEN** 每拍之间的实际间隔应为 500ms ± 5ms
- **AND** 应使用 Web Audio API 的 currentTime 而非 JavaScript 的 setTimeout

#### Scenario: 长时间运行稳定性

- **WHEN** 节拍器持续运行超过 5 分钟
- **THEN** 节拍精度不应显著降低
- **AND** 不应出现漂移累积

### Requirement: 资源清理

系统 SHALL 在组件卸载或节拍器停止时正确清理音频资源。

#### Scenario: 停止时清理

- **WHEN** 用户停止节拍器
- **THEN** 所有定时器应被清除
- **AND** AudioContext 中的节点应被断开

#### Scenario: 组件卸载清理

- **WHEN** 节拍器组件从 DOM 中卸载
- **THEN** 应自动停止节拍器
- **AND** 应清理所有定时器和音频节点
- **AND** 不应产生内存泄漏

### Requirement: 与现有音频功能兼容

系统 SHALL 确保节拍器与现有的和弦播放功能（扫弦/分解）可以共存。

#### Scenario: 同时使用节拍器和扫弦

- **WHEN** 节拍器正在运行且用户点击"扫弦"按钮
- **THEN** 和弦扫弦音效应正常播放
- **AND** 节拍器应继续运行不受影响
- **AND** 两种音效不应相互干扰

#### Scenario: AudioContext 共享

- **WHEN** 节拍器和和弦播放同时使用 Web Audio API
- **THEN** 应使用同一个 AudioContext 实例
- **OR** 如果使用独立的 AudioContext，应确保浏览器限制不被超出

### Requirement: 响应式设计

系统 SHALL 在桌面和移动端设备上提供适配的节拍器界面。

#### Scenario: 桌面端显示

- **WHEN** 用户在桌面浏览器上访问应用
- **THEN** 节拍器应显示在 PlaybackControls 组件中
- **AND** 所有控件（滑块、按钮、指示器）应横向排列

#### Scenario: 移动端显示

- **WHEN** 用户在移动设备上访问应用
- **THEN** 节拍器应显示在 MobileActionBar 中或折叠面板中
- **AND** 控件应纵向排列以适应窄屏幕
- **AND** 触摸目标（按钮、滑块）应不小于 44x44 像素

#### Scenario: 触摸操作

- **WHEN** 用户在移动设备上拖动 BPM 滑块
- **THEN** 滑块应流畅响应触摸手势
- **AND** 不应触发页面滚动
