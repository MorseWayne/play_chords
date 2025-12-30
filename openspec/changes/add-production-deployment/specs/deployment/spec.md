# Capability: Deployment (部署)

## ADDED Requirements

### Requirement: Nginx 反向代理配置

系统 SHALL 提供 Nginx 配置模板,支持通过子路径 `/play_chords` 访问应用,并正确转发请求到 Next.js 应用。

#### Scenario: 子路径访问

- **WHEN** 用户访问 `https://rookiiie.top/play_chords`
- **THEN** Nginx 将请求转发到 `http://localhost:3000/play_chords`
- **AND** 应用正常响应页面内容

#### Scenario: 静态资源加载

- **WHEN** 浏览器请求静态资源(如 `/_next/static/` 下的文件)
- **THEN** Nginx 正确转发请求到 Next.js 应用
- **AND** 设置合适的缓存头(如 1 年)

#### Scenario: WebSocket 支持

- **WHEN** 需要 WebSocket 连接(如开发模式热重载)
- **THEN** Nginx 配置支持 WebSocket 协议升级
- **AND** 连接可正常建立

### Requirement: HTTPS 配置

系统 SHALL 提供 SSL 证书自动申请和配置脚本,使用 Let's Encrypt 证书,并支持自动续期。

#### Scenario: 证书申请

- **WHEN** 执行 SSL 配置脚本
- **THEN** 使用 Certbot 自动申请 Let's Encrypt 证书
- **AND** 证书文件存储在 `/etc/letsencrypt/live/rookiiie.top/`
- **AND** Nginx 配置引用正确的证书路径

#### Scenario: 自动续期

- **WHEN** 证书有效期剩余少于 30 天
- **THEN** Certbot 自动尝试续期
- **AND** 续期成功后自动重载 Nginx 配置

#### Scenario: HTTPS 重定向

- **WHEN** 用户通过 HTTP 访问应用(如 `http://rookiiie.top/play_chords`)
- **THEN** Nginx 自动重定向到 HTTPS 版本
- **AND** 响应状态码为 301(永久重定向)

### Requirement: 进程管理

系统 MUST 使用 PM2 管理 Next.js 应用进程,确保应用持续运行、自动重启和日志管理。

#### Scenario: 应用启动

- **WHEN** 执行 PM2 启动命令
- **THEN** Next.js 应用以生产模式启动
- **AND** 监听 3000 端口
- **AND** PM2 记录进程信息

#### Scenario: 崩溃自动重启

- **WHEN** Node.js 进程因错误退出
- **THEN** PM2 自动重启进程
- **AND** 记录重启日志
- **AND** 应用在短时间内恢复服务

#### Scenario: 平滑重载

- **WHEN** 执行 `pm2 reload` 命令
- **THEN** PM2 启动新进程
- **AND** 等待新进程就绪后关闭旧进程
- **AND** 服务无中断

#### Scenario: 日志管理

- **WHEN** 应用运行时输出日志
- **THEN** PM2 将日志写入文件(`~/.pm2/logs/`)
- **AND** 支持通过 `pm2 logs` 查看实时日志
- **AND** 日志文件自动滚动,避免占用过多磁盘空间

### Requirement: 部署脚本

系统 MUST 提供自动化部署脚本,实现代码更新、依赖安装、构建和进程重启的一键执行。

#### Scenario: 首次部署

- **WHEN** 在全新服务器上执行初始化脚本
- **THEN** 自动安装 Node.js、Nginx、PM2、Certbot
- **AND** 配置防火墙规则(开放 80/443 端口)
- **AND** 创建必要的目录结构

#### Scenario: 代码更新部署

- **WHEN** 执行部署脚本
- **THEN** 拉取最新代码或上传代码到服务器
- **AND** 安装生产依赖(`npm ci`)
- **AND** 构建应用(`npm run build`)
- **AND** 重启 PM2 进程
- **AND** 验证应用正常运行

#### Scenario: 部署失败回滚

- **WHEN** 部署过程中构建失败
- **THEN** 脚本终止执行
- **AND** 保留旧版本应用继续运行
- **AND** 输出错误信息供排查

### Requirement: Next.js basePath 配置

系统 MUST 配置 Next.js 的 `basePath` 为 `/play_chords`,确保应用在子路径下正常运行。

#### Scenario: 生产环境 basePath

- **WHEN** 构建生产版本(`NODE_ENV=production`)
- **THEN** Next.js 使用 `basePath: '/play_chords'`
- **AND** 所有路由自动添加 `/play_chords` 前缀
- **AND** 静态资源路径自动调整

#### Scenario: 开发环境无 basePath

- **WHEN** 本地开发模式(`NODE_ENV=development`)
- **THEN** Next.js 不使用 basePath(或使用空字符串)
- **AND** 通过 `http://localhost:3000` 直接访问

#### Scenario: 链接和路由正确性

- **WHEN** 应用内使用 `<Link>` 组件或 `router.push()`
- **THEN** 生成的 URL 自动包含 `/play_chords` 前缀(生产环境)
- **AND** 页面跳转正常工作

### Requirement: 部署文档

系统 MUST 提供详细的部署文档,包括服务器要求、部署步骤、日常维护和故障排查指南。

#### Scenario: 查看部署步骤

- **WHEN** 用户阅读 `deploy/README.md`
- **THEN** 文档包含清晰的分步部署指南
- **AND** 列出所有必需的服务器软件和版本要求
- **AND** 提供首次部署和日常更新的命令示例

#### Scenario: 故障排查

- **WHEN** 部署或运行过程中遇到问题
- **THEN** 文档提供常见问题的排查步骤
- **AND** 包含日志查看、进程检查、配置验证等命令

#### Scenario: 运维操作

- **WHEN** 用户阅读 `deploy/OPERATIONS.md`
- **THEN** 文档包含日常运维操作指南
- **AND** 覆盖日志管理、进程重启、证书续期、备份等操作
- **AND** 提供具体的命令示例

### Requirement: 环境变量管理(可选)

如应用需要环境变量,系统 SHALL 提供环境变量模板文件和加载机制。

#### Scenario: 环境变量模板

- **WHEN** 应用需要配置环境变量
- **THEN** 提供 `.env.production.example` 模板文件
- **AND** 文档说明如何复制并填写实际值
- **AND** `.env.production` 文件被 `.gitignore` 忽略

#### Scenario: PM2 加载环境变量

- **WHEN** PM2 启动应用
- **THEN** 从环境变量文件或 `ecosystem.config.js` 加载配置
- **AND** 应用可通过 `process.env` 访问变量

### Requirement: 脚本幂等性

部署脚本 MUST 支持多次执行而不产生副作用,确保安全性和可重复性。

#### Scenario: 重复执行初始化脚本

- **WHEN** 多次执行服务器初始化脚本
- **THEN** 检测已安装的软件,跳过重复安装
- **AND** 不覆盖现有配置文件(或提示用户确认)
- **AND** 脚本正常完成

#### Scenario: 重复执行 Nginx 配置脚本

- **WHEN** 多次执行 Nginx 配置部署脚本
- **THEN** 检查配置文件是否已存在
- **AND** 如已存在,提示用户是否覆盖或跳过
- **AND** 验证配置语法后重载 Nginx

### Requirement: 服务健康检查

部署脚本 SHALL 在部署完成后验证服务是否正常运行。

#### Scenario: PM2 进程检查

- **WHEN** 部署脚本完成
- **THEN** 检查 PM2 进程状态为 `online`
- **AND** 如进程异常,输出错误信息并退出

#### Scenario: HTTP 健康检查

- **WHEN** 部署脚本完成
- **THEN** 向 `http://localhost:3000/play_chords` 发送 HTTP 请求
- **AND** 验证响应状态码为 200
- **AND** 如请求失败,输出错误信息

#### Scenario: Nginx 配置验证

- **WHEN** 更新 Nginx 配置后
- **THEN** 执行 `nginx -t` 验证配置语法
- **AND** 如验证失败,不重载 Nginx 并输出错误

### Requirement: 安全加固

部署配置 SHALL 遵循安全最佳实践,减少攻击面。

#### Scenario: Nginx 安全头

- **WHEN** Nginx 响应请求
- **THEN** 添加安全相关 HTTP 头(如 `X-Frame-Options`, `X-Content-Type-Options`)
- **AND** 隐藏 Nginx 版本号

#### Scenario: 防火墙配置

- **WHEN** 初始化脚本配置防火墙
- **THEN** 只开放必要的端口(80, 443, SSH)
- **AND** 关闭其他端口
- **AND** 阻止非授权访问

#### Scenario: 文件权限

- **WHEN** 部署脚本创建文件和目录
- **THEN** 设置合适的文件权限(如 644 用于文件,755 用于目录)
- **AND** 应用文件归属于运行用户(非 root)

