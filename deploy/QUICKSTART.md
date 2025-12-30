# 快速开始 - Play Chords 部署

这是一个快速部署指南,适合有经验的运维人员。详细说明请参考 [完整部署文档](./README.md)。

## 前置条件

- ✅ Ubuntu 20.04+ 服务器
- ✅ 域名 `rookiiie.top` DNS 已指向服务器 IP
- ✅ 服务器可访问 GitHub/GitLab 仓库
- ✅ 开放端口: 22, 80, 443

## 一键部署(首次)

在服务器上执行:

```bash
# 1. 克隆代码
cd /var/www
sudo git clone <your-repo-url> play_chords
cd play_chords

# 2. 初始化服务器(安装 Node.js, Nginx, PM2, Certbot)
sudo bash deploy/init-server.sh

# 3. 部署应用
bash deploy/deploy.sh

# 4. 配置 SSL 证书
sudo bash deploy/setup-ssl.sh

# 5. 配置 Nginx
sudo bash deploy/setup-nginx.sh

# 完成! 访问 https://rookiiie.top/play_chords
```

## 日常更新

```bash
cd /var/www/play_chords
bash deploy/deploy.sh
```

## 快速排查

```bash
# 查看应用状态
pm2 status
pm2 logs play-chords

# 查看 Nginx 状态
sudo nginx -t
sudo systemctl status nginx

# 测试访问
curl -I https://rookiiie.top/play_chords
```

## 常用命令

| 操作 | 命令 |
|------|------|
| 查看应用日志 | `pm2 logs play-chords` |
| 重启应用 | `pm2 reload play-chords` |
| 重载 Nginx | `sudo systemctl reload nginx` |
| 查看证书 | `sudo certbot certificates` |
| 更新代码 | `bash deploy/deploy.sh` |

## 目录结构

```
/var/www/play_chords/
├── deploy/                  # 部署脚本和配置
│   ├── init-server.sh       # 服务器初始化
│   ├── deploy.sh            # 应用部署
│   ├── setup-ssl.sh         # SSL 配置
│   ├── setup-nginx.sh       # Nginx 配置
│   ├── nginx/               
│   │   └── play_chords.conf # Nginx 配置模板
│   ├── README.md            # 完整部署文档
│   ├── OPERATIONS.md        # 运维操作手册
│   └── QUICKSTART.md        # 本文档
├── ecosystem.config.js      # PM2 配置
├── next.config.ts           # Next.js 配置(含 basePath)
└── ...
```

## 访问地址

- **生产环境**: https://rookiiie.top/play_chords
- **健康检查**: `curl https://rookiiie.top/play_chords`

## 获取帮助

- [完整部署文档](./README.md) - 详细步骤和故障排查
- [运维操作手册](./OPERATIONS.md) - 日常运维指南
- [PM2 文档](https://pm2.keymetrics.io/docs/)
- [Nginx 文档](https://nginx.org/en/docs/)

---

**需要详细说明?** 请参考 [deploy/README.md](./README.md)

