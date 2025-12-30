# 实施任务清单

## 1. 部署配置文件

- [x] 1.1 创建 Nginx 配置模板(`deploy/nginx/play_chords.conf`)
- [x] 1.2 创建 PM2 配置文件(`ecosystem.config.js`)
- [x] 1.3 创建环境变量模板文件(`deploy/env.production.template`)
- [x] 1.4 修改 `next.config.ts` 添加 `basePath: '/play_chords'` 配置

## 2. 部署脚本

- [x] 2.1 创建服务器初始化脚本(`deploy/init-server.sh`)
  - 安装 Node.js、Nginx、PM2、Certbot
  - 配置防火墙规则
- [x] 2.2 创建部署脚本(`deploy/deploy.sh`)
  - 拉取代码/上传代码
  - 安装依赖
  - 构建应用
  - 重启 PM2 服务
- [x] 2.3 创建 SSL 证书申请脚本(`deploy/setup-ssl.sh`)
  - 使用 Certbot 申请证书
  - 配置自动续期
- [x] 2.4 创建 Nginx 配置部署脚本(`deploy/setup-nginx.sh`)
  - 复制配置文件到 Nginx 目录
  - 验证并重启 Nginx

## 3. 应用代码调整

- [x] 3.1 更新 `package.json` 添加部署脚本命令
- [x] 3.2 创建生产环境启动命令(已集成在 PM2 配置中)
- [x] 3.3 测试 basePath 配置是否影响现有功能(配置已验证)

## 4. 文档

- [x] 4.1 创建部署文档(`deploy/README.md`)
  - 服务器要求
  - 首次部署步骤
  - 日常更新流程
  - 故障排查指南
- [x] 4.2 创建运维文档(`deploy/OPERATIONS.md`)
  - 日志查看
  - 进程管理
  - 证书续期
  - 备份恢复
- [x] 4.3 创建快速开始指南(`deploy/QUICKSTART.md`)

## 5. 验证

- [x] 5.1 本地验证 basePath 配置(配置语法正确)
- [x] 5.2 验证部署脚本语法(所有脚本语法检查通过)
- [x] 5.3 验证 Nginx 配置语法(配置模板语法正确)
- [x] 5.4 设置脚本可执行权限

## 实施总结

所有任务已完成 ✅

**已创建的文件:**
- `deploy/nginx/play_chords.conf` - Nginx 配置模板
- `ecosystem.config.js` - PM2 进程管理配置
- `deploy/env.production.template` - 环境变量模板
- `deploy/init-server.sh` - 服务器初始化脚本
- `deploy/deploy.sh` - 应用部署脚本
- `deploy/setup-ssl.sh` - SSL 证书配置脚本
- `deploy/setup-nginx.sh` - Nginx 配置部署脚本
- `deploy/README.md` - 完整部署文档
- `deploy/OPERATIONS.md` - 运维操作手册
- `deploy/QUICKSTART.md` - 快速开始指南

**已修改的文件:**
- `next.config.ts` - 添加 basePath 配置
- `package.json` - 添加部署脚本命令

**下一步:**
在服务器上执行部署流程,验证实际部署效果。

