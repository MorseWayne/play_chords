# Play Chords 部署文档

本文档介绍如何将 Play Chords 应用部署到生产服务器。

## 目录

- [服务器要求](#服务器要求)
- [首次部署](#首次部署)
- [日常更新](#日常更新)
- [故障排查](#故障排查)
- [回滚操作](#回滚操作)

## 服务器要求

### 硬件要求

- **CPU**: 1 核心或以上
- **内存**: 1GB RAM 或以上(推荐 2GB+)
- **磁盘**: 10GB 可用空间或以上
- **网络**: 稳定的互联网连接

### 软件要求

- **操作系统**: Ubuntu 20.04+ 或 Debian 11+
- **Node.js**: 18.x 或 20.x LTS
- **Nginx**: 1.18+ 或更高版本
- **PM2**: 最新版本
- **Certbot**: 用于 SSL 证书管理

### 网络要求

- 域名 `rookiiie.top` 的 DNS A 记录指向服务器 IP
- 防火墙开放端口:
  - `22` (SSH)
  - `80` (HTTP,用于证书验证)
  - `443` (HTTPS)

## 首次部署

### 步骤 1: 服务器初始化

在服务器上执行初始化脚本,安装所有必需的软件:

```bash
# SSH 登录到服务器
ssh user@your-server-ip

# 克隆代码到服务器(如果尚未克隆)
cd /var/www
sudo git clone https://github.com/your-username/your-repo.git play_chords
cd play_chords

# 运行初始化脚本
sudo bash deploy/init-server.sh
```

**脚本会自动执行:**
- 更新系统包
- 安装 Node.js 20.x LTS
- 安装 PM2 进程管理器
- 安装 Nginx 反向代理
- 安装 Certbot SSL 证书工具
- 配置防火墙规则
- 创建必要的目录

**注意事项:**
- 脚本需要 root 权限,请使用 `sudo` 运行
- 执行时会提示是否启用防火墙,请确认 SSH 端口已正确配置
- 首次运行可能需要 5-10 分钟,请耐心等待

### 步骤 2: 部署应用

```bash
# 进入应用目录
cd /var/www/play_chords

# 运行部署脚本
bash deploy/deploy.sh
```

**脚本会自动执行:**
- 拉取最新代码(如果是 Git 仓库)
- 安装生产依赖
- 构建 Next.js 应用
- 启动 PM2 进程
- 执行健康检查

**预期输出:**
```
[INFO] 部署完成!
[INFO] 应用名称: play-chords
[INFO] 进程状态: online
[INFO] 访问地址: https://rookiiie.top/play_chords
```

### 步骤 3: 配置 SSL 证书

```bash
# 运行 SSL 配置脚本
sudo bash deploy/setup-ssl.sh
```

**脚本会自动执行:**
- 使用 Certbot 申请 Let's Encrypt 证书
- 配置自动续期(90 天有效期,提前 30 天自动续期)
- 设置续期后自动重载 Nginx

**注意事项:**
- 确保域名 DNS 已正确解析到服务器 IP
- 需要输入邮箱地址用于证书通知
- 证书申请需要访问 HTTP 80 端口

### 步骤 4: 配置 Nginx 反向代理

```bash
# 运行 Nginx 配置脚本
sudo bash deploy/setup-nginx.sh
```

**脚本会自动执行:**
- 部署 Nginx 配置文件
- 验证配置语法
- 启用配置并重载 Nginx
- 测试 HTTPS 访问

**注意事项:**
- 如果域名上已有其他网站,脚本会提示是否需要编辑配置
- 可以手动编辑 `/etc/nginx/sites-available/rookiiie.top-play-chords` 合并配置

### 步骤 5: 验证部署

访问应用并验证功能:

```bash
# 检查 PM2 进程状态
pm2 status

# 查看应用日志
pm2 logs play-chords

# 检查 Nginx 状态
sudo systemctl status nginx

# 测试 HTTPS 访问
curl -I https://rookiiie.top/play_chords
```

在浏览器中访问: **https://rookiiie.top/play_chords**

## 日常更新

当代码有更新时,执行以下步骤:

### 方式 1: 使用部署脚本(推荐)

```bash
cd /var/www/play_chords
bash deploy/deploy.sh
```

### 方式 2: 手动更新

```bash
cd /var/www/play_chords

# 拉取最新代码
git pull

# 安装依赖(如有新增)
npm ci

# 构建应用
NODE_ENV=production npm run build

# 重启 PM2 进程(零停机)
pm2 reload ecosystem.config.js

# 查看日志确认运行正常
pm2 logs play-chords --lines 50
```

## 故障排查

### 问题 1: 应用无法访问

**症状:** 浏览器显示 502 Bad Gateway 或连接超时

**排查步骤:**

1. 检查 PM2 进程状态
```bash
pm2 status
pm2 logs play-chords --lines 100
```

2. 检查应用是否监听 3000 端口
```bash
sudo netstat -tlnp | grep 3000
# 或
sudo ss -tlnp | grep 3000
```

3. 检查 Nginx 配置
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

4. 检查防火墙
```bash
sudo ufw status
```

**解决方案:**
- 如果进程停止: `pm2 restart play-chords`
- 如果配置错误: 编辑配置后 `sudo nginx -t && sudo systemctl reload nginx`
- 如果端口被占用: 查找并停止占用进程

### 问题 2: SSL 证书错误

**症状:** 浏览器显示证书无效或过期

**排查步骤:**

1. 检查证书状态
```bash
sudo certbot certificates
```

2. 检查证书文件是否存在
```bash
ls -la /etc/letsencrypt/live/rookiiie.top/
```

3. 检查自动续期状态
```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

**解决方案:**
- 手动续期: `sudo certbot renew --force-renewal`
- 重新申请: `sudo bash deploy/setup-ssl.sh`
- 重载 Nginx: `sudo systemctl reload nginx`

### 问题 3: 静态资源加载失败

**症状:** 页面样式错误,JavaScript 不工作

**排查步骤:**

1. 打开浏览器开发者工具,查看网络请求
2. 检查 basePath 配置
```bash
cat next.config.ts
```

3. 检查 Nginx 配置中的静态资源路径
```bash
sudo cat /etc/nginx/sites-available/rookiiie.top-play-chords | grep "_next"
```

**解决方案:**
- 确认 `next.config.ts` 中 `basePath` 为 `/play_chords`
- 重新构建: `NODE_ENV=production npm run build && pm2 reload play-chords`
- 清除浏览器缓存

### 问题 4: 构建失败

**症状:** `npm run build` 报错

**排查步骤:**

1. 查看完整错误信息
```bash
NODE_ENV=production npm run build
```

2. 检查 Node.js 版本
```bash
node -v  # 应为 v18+ 或 v20+
```

3. 清除缓存重试
```bash
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

**解决方案:**
- TypeScript 错误: 修复代码后重新构建
- 依赖问题: `rm -rf node_modules && npm ci`
- 内存不足: 临时增加 swap 或升级服务器配置

### 问题 5: PM2 进程频繁重启

**症状:** `pm2 status` 显示重启次数不断增加

**排查步骤:**

1. 查看错误日志
```bash
pm2 logs play-chords --err --lines 100
```

2. 检查系统资源
```bash
free -h  # 内存
df -h    # 磁盘
top      # CPU 使用率
```

**解决方案:**
- 根据日志修复代码错误
- 增加内存限制: 编辑 `ecosystem.config.js` 中的 `max_memory_restart`
- 检查端口冲突: `sudo netstat -tlnp | grep 3000`

## 回滚操作

如果新版本有问题,可以快速回滚到上一个版本:

### 方式 1: Git 回滚

```bash
cd /var/www/play_chords

# 查看提交历史
git log --oneline -n 10

# 回滚到指定版本
git reset --hard <commit-hash>

# 重新构建和重启
npm ci
NODE_ENV=production npm run build
pm2 reload ecosystem.config.js
```

### 方式 2: 使用备份

如果部署前做了备份:

```bash
cd /var/www
sudo mv play_chords play_chords.broken
sudo mv play_chords.backup play_chords
cd play_chords
pm2 reload ecosystem.config.js
```

## 性能优化

### 启用 PM2 集群模式(可选)

编辑 `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'play-chords',
    instances: 'max',  // 使用所有 CPU 核心
    exec_mode: 'cluster',  // 集群模式
    // ... 其他配置
  }]
};
```

重启应用:
```bash
pm2 reload ecosystem.config.js
```

### 配置 Nginx 缓存(可选)

编辑 Nginx 配置,添加缓存相关指令。详见 `deploy/nginx/play_chords.conf`。

## 日志管理

### PM2 日志

```bash
# 实时查看日志
pm2 logs play-chords

# 查看最近 100 行
pm2 logs play-chords --lines 100

# 只看错误日志
pm2 logs play-chords --err

# 清空日志
pm2 flush
```

日志位置: `/var/log/pm2/play-chords-*.log`

### Nginx 日志

```bash
# 访问日志
sudo tail -f /var/log/nginx/access.log

# 错误日志
sudo tail -f /var/log/nginx/error.log
```

## 备份策略

### 代码备份

使用 Git 版本控制,定期推送到远程仓库。

### 配置文件备份

```bash
# 备份 Nginx 配置
sudo cp /etc/nginx/sites-available/rookiiie.top-play-chords \
       /root/backups/nginx-$(date +%Y%m%d).conf

# 备份 PM2 配置
cp ecosystem.config.js /root/backups/ecosystem-$(date +%Y%m%d).js
```

### 自动备份脚本(可选)

创建定时任务:
```bash
sudo crontab -e
```

添加:
```
# 每天凌晨 2 点备份配置文件
0 2 * * * /var/www/play_chords/deploy/backup.sh
```

## 安全建议

1. **定期更新系统和软件**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **配置 SSH 密钥登录,禁用密码登录**
   编辑 `/etc/ssh/sshd_config`:
   ```
   PasswordAuthentication no
   ```

3. **限制 SSH 登录用户**
   ```
   AllowUsers your-username
   ```

4. **定期查看日志,监控异常访问**

5. **启用 fail2ban 防止暴力破解**
   ```bash
   sudo apt install fail2ban
   ```

## 监控和告警(可选)

### 使用 PM2 Plus(免费版)

```bash
pm2 link <secret_key> <public_key>
pm2 install pm2-logrotate
```

### 使用 Uptime Robot

免费监控服务,定期检查网站可用性: https://uptimerobot.com

## 相关文档

- [运维文档](./OPERATIONS.md) - 日常运维操作指南
- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [PM2 文档](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx 文档](https://nginx.org/en/docs/)
- [Let's Encrypt 文档](https://letsencrypt.org/docs/)

## 获取帮助

如遇到问题:

1. 查看本文档的[故障排查](#故障排查)部分
2. 查看应用日志: `pm2 logs play-chords`
3. 查看 Nginx 日志: `sudo tail -f /var/log/nginx/error.log`
4. 搜索相关错误信息
5. 联系开发团队

---

**祝你部署顺利!** 🚀

