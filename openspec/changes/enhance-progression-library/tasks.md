# Implementation Tasks

## 1. 扩展预置走向库
- [ ] 1.1 在 `src/lib/progressions.ts` 中新增 15+ 预置走向定义
  - [ ] 1.1.1 流行/摇滚类走向（5个）：vi–IV–I–V、I–IV–V、I–iii–IV–V、IV–V–iii–vi、I–vi–iii–IV
  - [ ] 1.1.2 爵士类走向（4个）：I–vi–ii–V、iii–vi–ii–V、循环 2-5-1、爵士变体
  - [ ] 1.1.3 布鲁斯类走向（3个）：8 小节布鲁斯、快速变换布鲁斯、摇滚布鲁斯
  - [ ] 1.1.4 民谣/乡村类走向（3个）：经典民谣 8小节、乡村 ballad、folk progression
  - [ ] 1.1.5 拉丁/Bossa 类走向（2个）：Bossa nova 进行、拉丁爵士
- [ ] 1.2 为每个走向添加完整元数据（tags、notes、defaultBpm、difficulty?）
- [ ] 1.3 在走向选择 UI 中按分类展示（可选：增加分类筛选）

## 2. 自定义走向功能
- [ ] 2.1 创建数据结构与类型定义
  - [ ] 2.1.1 定义 `CustomProgressionDefinition` 类型（扩展自 `ProgressionDefinition`）
  - [ ] 2.1.2 定义 LocalStorage key 和数据格式（`custom-progressions`）
- [ ] 2.2 实现解析与验证工具函数
  - [ ] 2.2.1 `parseRomanNumeralString(input: string): string[]` - 解析罗马数字
  - [ ] 2.2.2 `parseChordNameString(input: string, tonic: string, mode: ProgressionMode): GeneratedProgressionChord[]` - 解析和弦名称
  - [ ] 2.2.3 `validateProgressionInput(input: string, mode: 'roman' | 'chord'): ValidationResult` - 验证输入
  - [ ] 2.2.4 添加单元测试覆盖各种输入场景（正常、异常、边界）
- [ ] 2.3 创建自定义走向管理 Hook
  - [ ] 2.3.1 实现 `useCustomProgressions` hook（CRUD 操作）
  - [ ] 2.3.2 支持添加、编辑、删除、列表查询
  - [ ] 2.3.3 LocalStorage 持久化与状态同步
- [ ] 2.4 实现自定义走向 UI
  - [ ] 2.4.1 创建"添加自定义走向"按钮与对话框
  - [ ] 2.4.2 实现输入模式切换（罗马数字 / 和弦名称）
  - [ ] 2.4.3 实时输入验证与错误提示
  - [ ] 2.4.4 保存后添加到走向库列表
  - [ ] 2.4.5 实现编辑/删除已保存的自定义走向
- [ ] 2.5 整合到走向选择器
  - [ ] 2.5.1 在走向列表中区分预置与自定义走向（添加标识）
  - [ ] 2.5.2 自定义走向支持所有现有功能（播放、循环、模式切换等）

## 3. 和弦把位选择器
- [ ] 3.1 设计把位选择 UI 组件
  - [ ] 3.1.1 创建 `VoicingSelector` 组件（或内联到 page.tsx）
  - [ ] 3.1.2 显示当前和弦的可用把位列表（分组：0-4品、5-8品、9-12品等）
  - [ ] 3.1.3 高亮当前选中的把位
  - [ ] 3.1.4 点击切换把位，立即更新指法图
- [ ] 3.2 实现把位偏好持久化
  - [ ] 3.2.1 设计数据结构：`{ progressionId: { chordIndex: voicingIndex } }`
  - [ ] 3.2.2 创建 `useVoicingPreferences` hook 管理偏好设置
  - [ ] 3.2.3 LocalStorage 存储与读取（key: `progression-voicing-preferences`）
  - [ ] 3.2.4 切换走向时自动加载对应的把位偏好
- [ ] 3.3 集成到当前练习页面
  - [ ] 3.3.1 在当前和弦卡片中添加把位选择器
  - [ ] 3.3.2 扩展 `variantByIndex` 逻辑支持手动选择
  - [ ] 3.3.3 在走向预览区域显示每个和弦的把位信息（可选）
- [ ] 3.4 交互优化
  - [ ] 3.4.1 把位切换时自动试听新把位
  - [ ] 3.4.2 键盘快捷键支持（如 [ ] 切换把位）
  - [ ] 3.4.3 触摸设备优化（大按钮、滑动切换）

## 4. 数据持久化与状态管理
- [ ] 4.1 扩展 LocalStorage 存储结构
  - [ ] 4.1.1 `custom-progressions`: 自定义走向列表
  - [ ] 4.1.2 `progression-voicing-preferences`: 把位偏好设置
  - [ ] 4.1.3 向后兼容现有的 `progression-practice-settings`
- [ ] 4.2 实现数据迁移逻辑（如有需要）
- [ ] 4.3 处理存储配额与错误（quota exceeded、parse error 等）

## 5. UI/UX 优化
- [ ] 5.1 走向库按分类分组显示（流行、爵士、布鲁斯、民谣、拉丁、自定义）
- [ ] 5.2 添加搜索/筛选功能（按名称、标签筛选）
- [ ] 5.3 自定义走向添加收藏/置顶功能
- [ ] 5.4 把位选择器视觉优化（显示品位信息、指法预览）
- [ ] 5.5 移动端适配（自定义走向输入、把位选择器）

## 6. 节奏型功能
- [ ] 6.1 设计节奏型数据结构
  - [ ] 6.1.1 定义 `StrummingPattern` 类型（扫弦节奏型）
  - [ ] 6.1.2 定义 `ArpeggioPattern` 类型（分解节奏型）
  - [ ] 6.1.3 定义 `RhythmPattern` 联合类型
- [ ] 6.2 创建预置节奏型库
  - [ ] 6.2.1 扫弦节奏型（10+ 个）：基础、流行、摇滚、布鲁斯、爵士
  - [ ] 6.2.2 分解节奏型（8+ 个）：经典分解、四拍分解、滚动分解、Travis picking
  - [ ] 6.2.3 为每个节奏型添加元数据（名称、风格标签、说明、示例 BPM）
- [ ] 6.3 实现节奏型解析工具
  - [ ] 6.3.1 `parseStrummingPattern(input: string): StrummingPattern` - 解析 D/U 序列
  - [ ] 6.3.2 `parseArpeggioPattern(input: string): ArpeggioPattern` - 解析弦号序列
  - [ ] 6.3.3 验证与错误处理
  - [ ] 6.3.4 单元测试覆盖
- [ ] 6.4 扩展音频播放支持
  - [ ] 6.4.1 在 `useAudio` 中实现 `playWithStrummingPattern` 方法
  - [ ] 6.4.2 在 `useAudio` 中实现 `playWithArpeggioPattern` 方法
  - [ ] 6.4.3 支持重音标记和时值调整
  - [ ] 6.4.4 与 BPM 和节拍器同步
- [ ] 6.5 实现节奏型选择器 UI
  - [ ] 6.5.1 创建节奏型选择器组件（或内联到 page.tsx）
  - [ ] 6.5.2 按风格分类显示节奏型
  - [ ] 6.5.3 节奏型可视化展示（箭头 ↓↑ 或弦号序列）
  - [ ] 6.5.4 支持播放预览试听
  - [ ] 6.5.5 显示节奏型说明与适用场景
- [ ] 6.6 自定义节奏型功能
  - [ ] 6.6.1 添加"自定义节奏型"对话框
  - [ ] 6.6.2 输入模式切换（扫弦 / 分解）
  - [ ] 6.6.3 实时输入验证
  - [ ] 6.6.4 保存到 LocalStorage（`custom-rhythm-patterns`）
- [ ] 6.7 节奏型偏好管理
  - [ ] 6.7.1 创建 `useRhythmPatternPreferences` hook
  - [ ] 6.7.2 存储格式：`{ progressionId: { type: 'strum'|'arpeggio', patternId: string } }`
  - [ ] 6.7.3 切换走向时自动加载节奏型偏好
  - [ ] 6.7.4 集成到练习页面
- [ ] 6.8 节奏型与播放器集成
  - [ ] 6.8.1 在 `useProgressionPlayer` 的 `onStep` 回调中使用选定的节奏型
  - [ ] 6.8.2 替换现有的简单 `playStrum` / `playArpeggio` 调用
  - [ ] 6.8.3 验证节奏型播放效果

## 7. 测试与验证
- [ ] 7.1 单元测试：解析与验证函数
- [ ] 7.2 集成测试：自定义走向完整流程
- [ ] 7.3 手动测试：
  - [ ] 7.3.1 添加/编辑/删除自定义走向
  - [ ] 7.3.2 切换把位并验证音频正确
  - [ ] 7.3.3 切换节奏型并验证播放效果
  - [ ] 7.3.4 刷新页面后状态保持
  - [ ] 7.3.5 异常输入处理
- [ ] 7.4 性能测试：大量自定义走向和节奏型的加载与渲染
- [ ] 7.5 浏览器兼容性测试（Chrome、Safari、Firefox）

## 8. 文档与示例
- [ ] 8.1 更新 README（如需要）
- [ ] 8.2 添加使用示例与截图
- [ ] 8.3 用户指南：如何使用自定义走向、把位选择和节奏型
