# Play Chords 运维操作手册

本文档提供 Play Chords 应用的日常运维操作指南。

## 目录

- [进程管理](#进程管理)
- [日志管理](#日志管理)
- [SSL 证书管理](#ssl-证书管理)
- [Nginx 管理](#nginx-管理)
- [系统维护](#系统维护)
- [性能监控](#性能监控)
- [应急响应](#应急响应)

## 进程管理

### 查看进程状态

```bash
# 查看所有 PM2 进程
pm2 status

# 查看详细信息
pm2 describe play-chords

# 查看进程监控面板
pm2 monit
```

### 启动/停止/重启

```bash
# 启动应用
pm2 start ecosystem.config.js

# 停止应用
pm2 stop play-chords

# 重启应用(会有短暂停机)
pm2 restart play-chords

# 平滑重载(零停机,推荐)
pm2 reload play-chords

# 删除进程
pm2 delete play-chords
```

### 保存进程列表(开机自启)

```bash
# 保存当前进程列表
pm2 save

# 查看开机自启状态
pm2 startup

# 如需重新配置开机自启
pm2 unstartup
pm2 startup systemd
```

### 更新 PM2 配置

修改 `ecosystem.config.js` 后:

```bash
# 重新加载配置
pm2 reload ecosystem.config.js --update-env

# 或先删除再启动
pm2 delete play-chords
pm2 start ecosystem.config.js
pm2 save
```

## 日志管理

### 查看日志

```bash
# 实时查看所有日志
pm2 logs play-chords

# 查看最近 N 行
pm2 logs play-chords --lines 100

# 只看标准输出
pm2 logs play-chords --out

# 只看错误输出
pm2 logs play-chords --err

# 不显示旧日志,只看新日志
pm2 logs play-chords --nostream
```

### 日志文件位置

- **PM2 日志**: `/var/log/pm2/play-chords-*.log`
- **Nginx 访问日志**: `/var/log/nginx/access.log`
- **Nginx 错误日志**: `/var/log/nginx/error.log`
- **系统日志**: `/var/log/syslog`

### 清理日志

```bash
# 清空 PM2 日志
pm2 flush

# 清理旧的 Nginx 日志
sudo logrotate -f /etc/logrotate.d/nginx

# 手动压缩旧日志
sudo gzip /var/log/nginx/access.log.1
```

### 配置日志轮转

PM2 自带日志轮转,配置在 `ecosystem.config.js` 中。

如需自定义日志轮转,安装 pm2-logrotate:

```bash
pm2 install pm2-logrotate

# 配置日志轮转
pm2 set pm2-logrotate:max_size 10M        # 单个日志文件最大 10MB
pm2 set pm2-logrotate:retain 30           # 保留 30 个日志文件
pm2 set pm2-logrotate:compress true       # 压缩旧日志
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'  # 每天午夜轮转
```

## SSL 证书管理

### 查看证书状态

```bash
# 查看所有证书
sudo certbot certificates

# 查看特定域名证书
sudo certbot certificates -d rookiiie.top

# 查看证书有效期
sudo openssl x509 -in /etc/letsencrypt/live/rookiiie.top/cert.pem -noout -dates
```

### 手动续期证书

```bash
# 测试续期(不实际执行)
sudo certbot renew --dry-run

# 强制续期
sudo certbot renew --force-renewal

# 续期后重载 Nginx
sudo systemctl reload nginx
```

### 查看自动续期状态

```bash
# 查看 systemd timer 状态
sudo systemctl status certbot.timer

# 查看 timer 日志
sudo journalctl -u certbot.timer

# 查看上次续期日志
sudo journalctl -u certbot.service
```

### 撤销证书(如需更换域名)

```bash
# 撤销证书
sudo certbot revoke --cert-path /etc/letsencrypt/live/rookiiie.top/cert.pem

# 删除证书文件
sudo certbot delete --cert-name rookiiie.top

# 重新申请
sudo bash deploy/setup-ssl.sh
```

## Nginx 管理

### 查看 Nginx 状态

```bash
# 查看服务状态
sudo systemctl status nginx

# 测试配置文件语法
sudo nginx -t

# 查看 Nginx 版本和编译参数
nginx -V
```

### 重载/重启 Nginx

```bash
# 重载配置(推荐,不中断服务)
sudo systemctl reload nginx

# 重启服务(会短暂中断)
sudo systemctl restart nginx

# 停止服务
sudo systemctl stop nginx

# 启动服务
sudo systemctl start nginx
```

### 编辑配置

```bash
# 编辑主配置
sudo vim /etc/nginx/nginx.conf

# 编辑站点配置
sudo vim /etc/nginx/sites-available/rookiiie.top-play-chords

# 编辑后测试语法
sudo nginx -t

# 语法正确后重载
sudo systemctl reload nginx
```

### 查看 Nginx 日志

```bash
# 实时查看访问日志
sudo tail -f /var/log/nginx/access.log

# 实时查看错误日志
sudo tail -f /var/log/nginx/error.log

# 查看特定 IP 的访问记录
sudo grep "192.168.1.100" /var/log/nginx/access.log

# 统计访问量前 10 的 IP
sudo awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10

# 统计状态码分布
sudo awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn
```

### 临时禁用/启用站点

```bash
# 禁用站点
sudo rm /etc/nginx/sites-enabled/rookiiie.top-play-chords
sudo systemctl reload nginx

# 启用站点
sudo ln -s /etc/nginx/sites-available/rookiiie.top-play-chords /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

## 系统维护

### 更新系统包

```bash
# 更新包列表
sudo apt update

# 升级所有包
sudo apt upgrade -y

# 升级系统(包括内核)
sudo apt full-upgrade -y

# 清理不需要的包
sudo apt autoremove -y
sudo apt autoclean
```

### 更新 Node.js

```bash
# 查看当前版本
node -v

# 更新到最新 LTS 版本(如 v20.x)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# 验证版本
node -v
npm -v

# 重新构建应用
cd /var/www/play_chords
npm ci
NODE_ENV=production npm run build
pm2 reload play-chords
```

### 更新 PM2

```bash
# 更新 PM2
npm install -g pm2@latest

# 更新 PM2 内部进程(不重启应用)
pm2 update
```

### 磁盘空间管理

```bash
# 查看磁盘使用情况
df -h

# 查看目录大小
du -sh /var/www/play_chords
du -sh /var/log/*

# 查找大文件
sudo find / -type f -size +100M -exec ls -lh {} \;

# 清理 npm 缓存
npm cache clean --force

# 清理 PM2 日志
pm2 flush

# 清理系统日志
sudo journalctl --vacuum-time=7d  # 只保留 7 天内的日志
```

### 内存管理

```bash
# 查看内存使用
free -h

# 查看进程内存占用
top
# 或
htop

# 如内存不足,临时增加 swap(1GB)
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 持久化 swap(添加到 /etc/fstab)
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 性能监控

### PM2 监控

```bash
# 实时监控面板
pm2 monit

# 查看进程信息
pm2 info play-chords

# 查看 CPU 和内存使用
pm2 list
```

### 系统资源监控

```bash
# CPU 使用率
top
# 按 1 查看每个核心

# 内存使用
free -h

# 磁盘 I/O
iostat -x 1

# 网络流量
iftop
# 或
nload
```

### 应用性能分析

```bash
# 查看应用响应时间
curl -o /dev/null -s -w "Time: %{time_total}s\n" https://rookiiie.top/play_chords

# 使用 ab 进行压测
ab -n 1000 -c 10 https://rookiiie.top/play_chords

# 查看 Nginx 连接数
sudo netstat -an | grep :443 | wc -l
```

### 设置告警(可选)

使用 PM2 Plus 或 Uptime Robot 监控应用可用性:

- **PM2 Plus**: https://pm2.io/plus/
- **Uptime Robot**: https://uptimerobot.com/

## 应急响应

### 应用崩溃

```bash
# 1. 查看进程状态
pm2 status

# 2. 查看错误日志
pm2 logs play-chords --err --lines 100

# 3. 尝试重启
pm2 restart play-chords

# 4. 如仍无法启动,查看详细信息
pm2 describe play-chords

# 5. 检查端口占用
sudo netstat -tlnp | grep 3000

# 6. 如需回滚,执行
cd /var/www/play_chords
git log --oneline -n 10
git reset --hard <stable-commit-hash>
npm ci
NODE_ENV=production npm run build
pm2 reload play-chords
```

### 服务器负载过高

```bash
# 1. 查看负载
uptime

# 2. 查看 CPU 占用
top

# 3. 查找占用 CPU 的进程
ps aux | sort -rn -k 3 | head -10

# 4. 如是应用进程,临时限制 PM2 实例数
pm2 scale play-chords 1

# 5. 或重启应用
pm2 restart play-chords

# 6. 检查是否有攻击
sudo tail -f /var/log/nginx/access.log | grep -v "Mozilla"
```

### 磁盘空间不足

```bash
# 1. 查看磁盘使用
df -h

# 2. 查找大文件
sudo du -h / | sort -rh | head -20

# 3. 清理日志
pm2 flush
sudo journalctl --vacuum-time=3d
sudo rm /var/log/nginx/*.log.*.gz

# 4. 清理 npm 缓存和旧包
npm cache clean --force
sudo apt autoremove -y
sudo apt autoclean
```

### SSL 证书过期

```bash
# 1. 检查证书有效期
sudo certbot certificates

# 2. 手动续期
sudo certbot renew --force-renewal

# 3. 重载 Nginx
sudo systemctl reload nginx

# 4. 如续期失败,重新申请
sudo bash deploy/setup-ssl.sh
```

### Nginx 无法启动

```bash
# 1. 测试配置语法
sudo nginx -t

# 2. 查看错误日志
sudo tail -100 /var/log/nginx/error.log

# 3. 检查端口占用
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# 4. 如配置有误,恢复备份
sudo cp /etc/nginx/sites-available/rookiiie.top-play-chords.bak.* /etc/nginx/sites-available/rookiiie.top-play-chords
sudo nginx -t
sudo systemctl reload nginx
```

## 定期维护任务

### 每日

- [ ] 查看 PM2 进程状态: `pm2 status`
- [ ] 检查错误日志: `pm2 logs play-chords --err --lines 50`
- [ ] 查看 Nginx 错误日志: `sudo tail -50 /var/log/nginx/error.log`

### 每周

- [ ] 检查磁盘空间: `df -h`
- [ ] 检查内存使用: `free -h`
- [ ] 清理旧日志: `pm2 flush`
- [ ] 查看证书有效期: `sudo certbot certificates`

### 每月

- [ ] 更新系统包: `sudo apt update && sudo apt upgrade -y`
- [ ] 检查 SSL 证书自动续期: `sudo certbot renew --dry-run`
- [ ] 备份配置文件
- [ ] 查看系统负载趋势

### 每季度

- [ ] 更新 Node.js 到最新 LTS
- [ ] 更新 PM2: `npm install -g pm2@latest`
- [ ] 审查安全日志
- [ ] 测试备份恢复流程

## 常用命令速查

```bash
# === PM2 ===
pm2 status                      # 查看进程状态
pm2 logs play-chords           # 查看日志
pm2 restart play-chords        # 重启
pm2 reload play-chords         # 平滑重载
pm2 monit                      # 监控面板

# === Nginx ===
sudo nginx -t                  # 测试配置
sudo systemctl reload nginx    # 重载配置
sudo tail -f /var/log/nginx/error.log  # 查看错误日志

# === SSL ===
sudo certbot certificates      # 查看证书
sudo certbot renew            # 续期证书

# === 系统 ===
df -h                         # 磁盘使用
free -h                       # 内存使用
top                          # 进程监控
sudo systemctl status nginx   # Nginx 状态

# === 部署 ===
bash deploy/deploy.sh         # 部署更新
git pull && npm run build && pm2 reload play-chords  # 快速更新
```

## 紧急联系方式

- **开发团队**: [联系方式]
- **服务器提供商**: [联系方式]
- **域名注册商**: [联系方式]

## 相关资源

- [部署文档](./README.md)
- [PM2 文档](https://pm2.keymetrics.io/docs/)
- [Nginx 文档](https://nginx.org/en/docs/)
- [Certbot 文档](https://certbot.eff.org/docs/)

---

**保持应用稳定运行!** 💪

