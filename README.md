## 项目概述

这是一个用于**练习吉他和弦**的 Web 应用，支持：

- **和弦选择**：根音 + 常用和弦类型（如 major/minor/7/maj7/sus4 等）
- **指法图展示**：同一和弦支持多把位（Variant）切换
- **和弦试听**：扫弦（Strum）与分解（Arpeggio）两种示例播放
- **更逼真的音色**：使用 **SoundFont 采样钢弦吉他**（支持本地离线加载）

> 目标：UI 简洁、现代、可扩展；核心逻辑清晰，后续可继续增加“转调/变调夹/节奏型/练习计划”等模块。

### 技术栈

- **框架**：Next.js（App Router）+ React + TypeScript
- **样式**：Tailwind CSS
- **组件库**：Shadcn UI + Lucide Icons
- **和弦数据**：`@tombatossals/chords-db`（包含指法、把位、MIDI 音高）
- **指法图渲染**：`@tombatossals/react-chords`（SVG）
- **音频播放**：`soundfont-player`（SoundFont 采样）

### 目录结构（核心）

- `src/app/page.tsx`：主页面，整合选择器/指法图/播放控制
- `src/lib/chords.ts`：和弦数据访问层（key/suffix/positions）
- `src/components/ChordSelector.tsx`：根音/和弦类型选择
- `src/components/ChordDisplay.tsx`：指法图展示 + Variant 切换
- `src/components/PlaybackControls.tsx`：加载音色 + 播放扫弦/分解
- `src/hooks/useAudio.ts`：音频引擎（SoundFont 加载与调度）
- `public/soundfonts/`：本地 SoundFont 音源文件（离线/内网可用）

### 数据模型说明

应用使用 `@tombatossals/chords-db/lib/guitar.json` 提供的数据：

- **key**：根音（如 `C` / `F#`）
- **suffix**：和弦类型（如 `major` / `m7`）
- **positions**：多个把位/指法变体，每个变体包含：
  - `frets`：每根弦的品位（`-1` 表示不弹）
  - `fingers`：指法编号
  - `barres`：横按信息
  - `baseFret`：基准品（用于高把位显示）
  - `midi`：该指法实际发声的 MIDI 音高列表（用于音频播放）

### 音频方案（逼真钢弦吉他）

当前使用 `soundfont-player` 加载钢弦吉他音色并播放 MIDI 音高：

- **默认乐器**：`acoustic_guitar_steel`
- **优先本地加载**：`/public/soundfonts/MusyngKite/acoustic_guitar_steel-mp3.js`
- **回退策略**：本地加载失败时，会回退到在线 SoundFont（用于开发调试/容灾）

> 重要：SoundFont/采样音源可能涉及版权与再分发限制。若用于公开发布，请确认音色文件的许可证允许分发。

## 开发与运行

### 1) 安装依赖

```bash
npm install
```

### 2) 启动开发服务器

```bash
npm run dev
```

然后用浏览器打开 `http://localhost:3000`。

### 3) 生产构建

```bash
npm run build
```

## 扩展点建议

### 和弦搜索/转调（计划）

- **文本搜索**：输入 `Cmaj7` / `F#m7` 解析为 `{ key, suffix }`
- **转调/变调夹**：根据半音偏移对 `key` 做映射，并保持 `suffix` 不变
- **转位与分解**：可基于 `positions` 或通过音高集合推导不同 voicing

### 更真实的“节奏型”

目前“扫弦/分解”是简单的时间偏移调度；可以进一步加入：

- 下扫/上扫 pattern（例如 `D D U U D U`）
- 节拍器（BPM）与循环播放
- 练习模式：随机出题、计时、错题本

## 常见问题（Troubleshooting）

### 1) 点击播放没声音

- 浏览器需要用户手势才能启动音频；请先点一次“加载真实钢弦吉他音色”
- 若仍无声，检查浏览器是否静音、是否阻止自动播放

### 2) 音色加载慢/失败

- 首次加载会解码采样文件，可能需要几秒
- 如网络受限，建议确保本地文件存在：`public/soundfonts/MusyngKite/acoustic_guitar_steel-mp3.js`

## 部署

本项目为标准 Next.js 应用，可部署到 Vercel/自建服务器等。
