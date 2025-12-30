# 部署方案设计文档

## Context

当前应用是一个基于 Next.js 的吉他和弦练习 Web 应用,需要部署到用户的云服务器上。服务器上已托管其他网站,因此需要通过 Nginx 反向代理实现多站点共存,应用访问路径为 `https://rookiiie.top/play_chords`。

### 约束条件

- 域名 `rookiiie.top` 已托管多个网站,需要子路径部署
- 需要 HTTPS 支持
- 暂不使用 GitHub Actions,采用直接在服务器上部署的方式
- 服务器为 Linux 环境(假设 Ubuntu/Debian)
- 需要进程守护,确保应用持续运行

### 技术背景

- Next.js 16.1.1 支持 `basePath` 配置,可实现子路径部署
- Next.js SSR 应用需要 Node.js 运行时,不能简单导出为静态站点
- 应用使用客户端音频功能(SoundFont),需要正确配置静态资源路径

## Goals / Non-Goals

### Goals

- 实现自动化部署流程,减少手动操作
- 配置 HTTPS,确保安全访问
- 使用 PM2 管理 Node.js 进程,实现自动重启和日志管理
- 配置 Nginx 反向代理,支持子路径访问
- 提供清晰的部署文档和运维指南
- 脚本幂等性设计,可多次执行

### Non-Goals

- 不实现 CI/CD 流水线(后续可扩展)
- 不配置数据库(应用无需数据库)
- 不实现负载均衡(单服务器部署)
- 不实现容器化(裸机部署)
- 不配置 CDN(可后续优化)

## Decisions

### 1. 进程管理器选择: PM2

**决策**: 使用 PM2 作为 Node.js 进程管理器

**理由**:
- 自动重启:进程崩溃时自动恢复
- 日志管理:统一管理应用日志
- 零停机重载:支持 `pm2 reload` 实现平滑更新
- 生态成熟:广泛使用,文档完善
- 简单易用:配置简单,学习成本低

**替代方案**:
- `systemd`: 需要手动编写服务单元文件,对 Node.js 应用不够友好
- `forever`: 功能较少,不支持集群模式
- `docker + docker-compose`: 增加复杂度,与"裸机部署"需求不符

### 2. SSL 证书方案: Let's Encrypt + Certbot

**决策**: 使用 Certbot 自动申请和续期 Let's Encrypt 证书

**理由**:
- 免费:无成本
- 自动续期:通过 cron 任务自动续期,减少运维负担
- 信任度高:所有主流浏览器信任
- 集成简单:Certbot 与 Nginx 集成良好

**配置**:
- 证书存储路径:`/etc/letsencrypt/live/rookiiie.top/`
- 自动续期命令:`certbot renew`(每天自动执行)

### 3. Nginx 反向代理配置

**决策**: Nginx 作为反向代理,转发 `/play_chords` 请求到 Next.js 应用

**配置要点**:
```nginx
location /play_chords {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # 处理静态资源路径
    location ~* ^/play_chords/_next/static/ {
        proxy_pass http://localhost:3000;
        expires 1y;
        access_log off;
    }
}
```

**理由**:
- `proxy_pass` 不带路径,保留原始请求路径(包含 `/play_chords`)
- 设置正确的 HTTP 头,确保 Next.js 能识别原始请求信息
- WebSocket 支持(如需热重载)
- 静态资源缓存优化

### 4. Next.js basePath 配置

**决策**: 在 `next.config.ts` 中设置 `basePath: '/play_chords'`

**影响**:
- 所有路由自动添加 `/play_chords` 前缀
- 静态资源路径自动处理(`/_next/static/` → `/play_chords/_next/static/`)
- `<Link>` 组件、`router.push()` 等自动适配

**注意事项**:
- 需要重新构建应用才能生效
- 本地开发时也会带 `/play_chords` 前缀

### 5. 部署流程设计

**方案**: 采用"拉取代码 + 本地构建"模式

**流程**:
1. 在服务器上拉取最新代码(或通过 SCP 上传)
2. 安装生产依赖(`npm ci --production=false`)
3. 构建应用(`npm run build`)
4. 重启 PM2 进程(`pm2 reload ecosystem.config.js`)

**理由**:
- 简单直接,无需额外工具
- 构建产物在服务器上生成,避免本地环境差异
- 符合"暂不使用 GitHub Actions"的需求

**替代方案**:
- 本地构建 + 上传产物:需要确保本地环境一致,传输文件较多
- Git 自动部署:需要配置 Webhook,增加复杂度

### 6. 目录结构

```
/var/www/play_chords/          # 应用根目录
├── .next/                      # Next.js 构建产物
├── node_modules/               # 依赖包
├── public/                     # 静态资源(SoundFont 文件等)
├── src/                        # 源代码
├── ecosystem.config.js         # PM2 配置
├── next.config.ts              # Next.js 配置
├── package.json
└── deploy/                     # 部署脚本和配置
    ├── nginx/
    │   └── play_chords.conf    # Nginx 配置
    ├── init-server.sh          # 服务器初始化
    ├── deploy.sh               # 部署脚本
    ├── setup-ssl.sh            # SSL 配置
    ├── setup-nginx.sh          # Nginx 配置
    ├── README.md               # 部署文档
    └── OPERATIONS.md           # 运维文档
```

## Risks / Trade-offs

### 风险 1: basePath 影响本地开发

**风险**: 设置 `basePath` 后,本地开发也需要通过 `http://localhost:3000/play_chords` 访问

**缓解**:
- 方案 A: 使用环境变量动态配置 `basePath`
  ```typescript
  const nextConfig: NextConfig = {
    basePath: process.env.NODE_ENV === 'production' ? '/play_chords' : '',
  };
  ```
- 方案 B: 开发时直接访问 `http://localhost:3000/play_chords`(推荐)
  - 与生产环境一致,避免路径问题
  - 心理成本低,习惯后无影响

**选择**: 方案 A(环境变量动态配置),保持开发体验

### 风险 2: 静态资源路径问题

**风险**: SoundFont 文件在 `public/soundfonts/` 下,basePath 可能影响加载

**缓解**:
- Next.js 会自动处理 `public/` 下的静态资源路径
- 如使用相对路径,需要确保代码中使用 Next.js 的资源加载方式
- 测试验证所有静态资源可正常加载

### 风险 3: 多站点 Nginx 配置冲突

**风险**: 域名上已有其他站点,配置可能冲突

**缓解**:
- 使用 `location /play_chords` 精确匹配子路径
- 不影响域名根路径和其他路径的配置
- 提供配置示例,说明如何整合到现有 Nginx 配置

### 风险 4: 证书续期失败

**风险**: Let's Encrypt 证书 90 天过期,自动续期可能失败

**缓解**:
- Certbot 默认会添加 cron 任务自动续期
- 证书有效期剩余 30 天时开始尝试续期,有充足缓冲时间
- 提供手动续期命令:`sudo certbot renew --force-renewal`
- 建议配置邮件提醒(Certbot 支持)

### 权衡 1: 裸机部署 vs 容器化

**选择**: 裸机部署

**理由**:
- 符合用户需求("暂时先不要配置 GitHub Actions,直接在服务器上裸机部署即可")
- 减少学习成本和工具依赖
- 单应用部署,容器化收益不明显

**后续优化**: 如需多环境部署或容器化,可引入 Docker

### 权衡 2: 单进程 vs 集群模式

**选择**: 单进程模式(PM2 `instances: 1`)

**理由**:
- 应用负载不高(个人项目)
- 减少资源消耗
- 简化日志和调试

**后续优化**: 如需高可用,可配置 PM2 集群模式(`instances: 'max'`)

## Migration Plan

### 首次部署步骤

1. **服务器准备**
   ```bash
   # 在服务器上执行
   bash deploy/init-server.sh
   ```
   - 安装 Node.js 18+、Nginx、PM2、Certbot
   - 配置防火墙(开放 80/443 端口)

2. **代码部署**
   ```bash
   # 在服务器上执行
   cd /var/www
   git clone <repo_url> play_chords
   cd play_chords
   bash deploy/deploy.sh
   ```

3. **配置 HTTPS**
   ```bash
   bash deploy/setup-ssl.sh
   ```

4. **配置 Nginx**
   ```bash
   bash deploy/setup-nginx.sh
   ```

### 日常更新流程

```bash
cd /var/www/play_chords
git pull
npm ci
npm run build
pm2 reload ecosystem.config.js
```

或使用一键脚本:
```bash
bash deploy/deploy.sh
```

### 回滚方案

```bash
# 回滚代码
git reset --hard <commit_hash>

# 重新构建和重启
npm run build
pm2 reload ecosystem.config.js
```

## Open Questions

1. **服务器具体信息**
   - 操作系统版本?(Ubuntu 20.04/22.04, Debian 11/12)
   - 是否已安装 Node.js?版本?
   - 是否已安装 Nginx?
   - 服务器 RAM 大小?(影响 PM2 配置)

2. **域名和 SSL**
   - 域名 DNS 是否已指向服务器 IP?
   - 是否需要配置 www 子域名?(如 www.rookiiie.top)
   - 是否已有 SSL 证书,还是需要新申请?

3. **代码传输方式**
   - 服务器是否可访问 Git 仓库?(如 GitHub/GitLab)
   - 如为私有仓库,是否需要配置 SSH Key?
   - 或通过 SCP/SFTP 上传代码?

4. **Nginx 现有配置**
   - 现有 Nginx 配置文件路径?(`/etc/nginx/sites-available/default` 或其他)
   - 是否需要合并配置,还是创建新的配置文件?

5. **环境变量**
   - 应用是否需要环境变量?(当前看起来不需要)
   - 如需要,如何管理敏感信息?

6. **监控和日志**
   - 是否需要配置日志滚动?(PM2 自带)
   - 是否需要配置监控告警?(可后续扩展)

