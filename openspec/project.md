# Project Context

## Purpose

这是一个用于**练习吉他和弦**的 Web 应用，帮助用户学习和练习吉他和弦。

### 核心功能

- 和弦选择：根音 + 常用和弦类型（如 major/minor/7/maj7/sus4 等）
- 指法图展示：同一和弦支持多把位（Variant）切换
- 和弦试听：扫弦（Strum）与分解（Arpeggio）两种示例播放
- 逼真音色：使用 SoundFont 采样钢弦吉他（支持本地离线加载）

### 目标

- UI 简洁、现代、可扩展
- 核心逻辑清晰
- 后续可继续增加"转调/变调夹/节奏型/练习计划"等模块

## Tech Stack

### 前端框架与工具

- **Next.js 16.1.1**（App Router）
- **React 19.2.3** + **TypeScript 5**
- **Tailwind CSS 4**（样式方案）
- **Shadcn UI**（组件库基础）
- **Lucide Icons**（图标库）

### 和弦与音频相关

- **@tombatossals/chords-db**：和弦数据库（指法、把位、MIDI 音高）
- **@tombatossals/react-chords**：SVG 指法图渲染
- **soundfont-player**：SoundFont 采样音频播放
- **@tonaljs/tonal**：音乐理论工具库
- **tone**：音频调度库

### 开发工具

- **ESLint**：代码检查
- **PostCSS**：样式处理

## Project Conventions

### Code Style

- **语言**：TypeScript（严格模式）
- **命名规则**：
  - 组件：PascalCase（如 `ChordSelector.tsx`）
  - Hooks：camelCase with `use` prefix（如 `useAudio.ts`）
  - 工具函数：camelCase（如 `chords.ts`）
- **格式化**：使用 ESLint + Prettier 风格（自动格式化）
- **导入顺序**：
  1. React/Next.js 核心
  2. 第三方库
  3. 本地组件/hooks/工具
  4. 样式文件

### Architecture Patterns

#### 目录结构

```
src/
├── app/              # Next.js App Router 页面
│   └── page.tsx      # 主页面（整合选择器/指法图/播放控制）
├── components/       # React 组件
│   ├── ChordSelector.tsx       # 根音/和弦类型选择器
│   ├── ChordDisplay.tsx        # 指法图展示 + Variant 切换
│   └── PlaybackControls.tsx    # 音色加载 + 播放控制
├── hooks/            # 自定义 React Hooks
│   └── useAudio.ts   # 音频引擎封装（SoundFont 加载与调度）
└── lib/              # 工具函数与数据访问层
    └── chords.ts     # 和弦数据访问（key/suffix/positions）
```

#### 设计原则

- **组件职责单一**：每个组件只负责一个功能模块
- **逻辑与 UI 分离**：业务逻辑封装在 hooks 和 lib 中
- **数据驱动**：使用 `@tombatossals/chords-db` 作为数据源
- **渐进增强**：基础功能优先，扩展功能通过模块化添加

#### 数据流

1. 用户在 `ChordSelector` 选择根音 + 和弦类型
2. `page.tsx` 传递选中的 key 和 suffix 给 `ChordDisplay`
3. `ChordDisplay` 从 `chords.ts` 获取指法数据并渲染
4. `PlaybackControls` 使用 `useAudio` 加载音色并播放 MIDI 音高

### Testing Strategy

- 目前项目处于早期阶段，暂无测试框架
- **计划引入**：
  - **单元测试**：Jest + React Testing Library
  - **E2E 测试**：Playwright
  - **覆盖重点**：
    - 和弦数据解析逻辑
    - 音频播放调度
    - 用户交互流程

### Git Workflow

- **提交信息格式**（约定式提交，中文）：

  ```
  feat: 移动端显示优化
  
  1. 新增移动端固定操作栏组件
  2. 优化和弦播放控制逻辑
  3. 调整页面布局
  4. 提升用户体验
  ```

- **分支策略**：
  - `main`：生产分支（稳定版本）
  - `dev`：开发分支
  - `feature/*`：功能分支
  - `fix/*`：修复分支

## Domain Context

### 音乐理论基础

- **根音（Key）**：和弦的基础音（如 C、F#、Bb）
- **和弦类型（Suffix）**：和弦的性质（如 major、minor、7、maj7、sus4）
- **把位（Position）**：同一和弦在吉他指板上的不同演奏位置
- **MIDI 音高**：用数字表示音高（中央 C = 60）

### 吉他和弦数据结构

应用使用 `@tombatossals/chords-db/lib/guitar.json` 提供的数据：

- **key**：根音（如 `C` / `F#`）
- **suffix**：和弦类型（如 `major` / `m7`）
- **positions**：多个把位/指法变体，每个变体包含：
  - `frets`：每根弦的品位（`-1` 表示不弹）
  - `fingers`：指法编号
  - `barres`：横按信息
  - `baseFret`：基准品（用于高把位显示）
  - `midi`：该指法实际发声的 MIDI 音高列表（用于音频播放）

### 音频播放方式

- **扫弦（Strum）**：从低音弦到高音弦顺序播放，模拟吉他扫弦
- **分解（Arpeggio）**：按一定节奏分别弹奏和弦中的各个音

## Important Constraints

### 音频相关

- **浏览器限制**：需要用户手势（点击）才能启动音频播放
- **音色文件**：SoundFont 文件可能较大，首次加载需要时间
- **版权问题**：SoundFont 音源可能涉及版权，公开发布前需确认许可证

### 性能考虑

- **离线优先**：SoundFont 文件放在 `public/soundfonts/` 本地加载
- **回退策略**：本地加载失败时回退到在线 CDN

### 用户体验

- **响应式设计**：需支持桌面和移动端
- **加载状态**：音色加载时需显示加载提示

## External Dependencies

### 核心依赖

- **@tombatossals/chords-db**：和弦数据源（MIT License）
- **soundfont-player**：音频播放引擎

### UI 组件

- **Radix UI**：无障碍、无样式的组件基础
  - Dialog、Dropdown Menu、Select、Slider、Tabs 等

### 音频资源

- **SoundFont 文件**：存储在 `public/soundfonts/MusyngKite/`
- **默认乐器**：`acoustic_guitar_steel`
- **在线回退**：<https://gleitz.github.io/midi-js-soundfonts/（仅用于开发调试）>

## Future Extensions

### 计划功能

- **和弦搜索**：文本输入解析（如 `Cmaj7` → `{ key: 'C', suffix: 'maj7' }`）
- **转调/变调夹**：根据半音偏移映射根音
- **节奏型**：下扫/上扫 pattern（如 `D D U U D U`）
- **节拍器**：BPM 设置与循环播放
- **练习模式**：随机出题、计时、错题本
