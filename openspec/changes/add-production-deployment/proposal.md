# Change: 添加生产环境部署能力

## Why

需要将吉他和弦练习应用部署到云服务器上,使用户可以通过 `https://rookiiie.top/play_chords` 访问应用。当前项目只有开发环境配置,缺少生产部署流程和配置。

## What Changes

- 创建部署脚本,实现一键部署到云服务器
- 配置 Nginx 反向代理,支持子路径访问(`/play_chords`)
- 配置 HTTPS(使用 Let's Encrypt 自动申请和续期证书)
- 配置 PM2 进程管理,确保应用持续运行
- 添加部署文档和运维指南
- 配置 Next.js 的 `basePath` 以支持子路径部署

## Impact

- **新增规范**: `deployment` - 生产环境部署流程与配置
- **影响代码**:
  - `next.config.ts` - 添加 basePath 配置
  - 新增 `deploy/` 目录 - 部署脚本和配置文件
  - 新增 `ecosystem.config.js` - PM2 配置
  - 更新 `package.json` - 添加部署相关脚本
- **外部依赖**:
  - Nginx (反向代理)
  - PM2 (进程管理)
  - Certbot (SSL 证书管理)
  - Node.js 18+ (运行环境)

