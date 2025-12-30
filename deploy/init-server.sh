#!/bin/bash
###############################################################################
# Play Chords 服务器初始化脚本
# 用途: 在全新的 Ubuntu 服务器上安装必要的软件和配置环境
# 使用: sudo bash deploy/init-server.sh
###############################################################################

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo_error "请使用 sudo 运行此脚本"
    exit 1
fi

echo_info "开始初始化服务器环境..."

###############################################################################
# 1. 更新系统包
###############################################################################
echo_info "更新系统包..."
apt-get update
apt-get upgrade -y

###############################################################################
# 2. 安装基础工具
###############################################################################
echo_info "安装基础工具..."
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    ufw \
    build-essential \
    software-properties-common

###############################################################################
# 3. 安装 Node.js(使用 NodeSource 仓库)
###############################################################################
echo_info "检查 Node.js 安装状态..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo_info "Node.js 已安装: $NODE_VERSION"
    
    # 检查版本是否满足要求(需要 v18+)
    NODE_MAJOR=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_MAJOR" -lt 18 ]; then
        echo_warn "Node.js 版本过低(需要 v18+),准备升级..."
        INSTALL_NODE=true
    else
        echo_info "Node.js 版本满足要求"
        INSTALL_NODE=false
    fi
else
    echo_info "Node.js 未安装,准备安装..."
    INSTALL_NODE=true
fi

if [ "$INSTALL_NODE" = true ]; then
    echo_info "安装 Node.js 20.x LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    echo_info "Node.js 安装完成: $(node -v)"
    echo_info "npm 版本: $(npm -v)"
fi

###############################################################################
# 4. 安装 PM2
###############################################################################
echo_info "检查 PM2 安装状态..."
if command -v pm2 &> /dev/null; then
    echo_info "PM2 已安装: $(pm2 -v)"
else
    echo_info "安装 PM2..."
    npm install -g pm2
    echo_info "PM2 安装完成: $(pm2 -v)"
fi

# 配置 PM2 开机自启
echo_info "配置 PM2 开机自启..."
pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER

# 创建 PM2 日志目录
mkdir -p /var/log/pm2
chown -R $SUDO_USER:$SUDO_USER /var/log/pm2

###############################################################################
# 5. 安装 Nginx
###############################################################################
echo_info "检查 Nginx 安装状态..."
if command -v nginx &> /dev/null; then
    echo_info "Nginx 已安装: $(nginx -v 2>&1)"
else
    echo_info "安装 Nginx..."
    apt-get install -y nginx
    echo_info "Nginx 安装完成"
fi

# 启动并启用 Nginx
systemctl enable nginx
systemctl start nginx
echo_info "Nginx 状态: $(systemctl is-active nginx)"

###############################################################################
# 6. 安装 Certbot(用于 Let's Encrypt SSL 证书)
###############################################################################
echo_info "检查 Certbot 安装状态..."
if command -v certbot &> /dev/null; then
    echo_info "Certbot 已安装: $(certbot --version 2>&1 | head -n1)"
else
    echo_info "安装 Certbot..."
    apt-get install -y certbot python3-certbot-nginx
    echo_info "Certbot 安装完成"
fi

###############################################################################
# 7. 配置防火墙(UFW)
###############################################################################
echo_info "配置防火墙规则..."

# 检查 UFW 状态
if ufw status | grep -q "Status: active"; then
    echo_info "UFW 防火墙已启用"
else
    echo_warn "UFW 防火墙未启用,准备配置..."
fi

# 允许 SSH(防止锁死)
ufw allow OpenSSH
ufw allow 22/tcp

# 允许 HTTP 和 HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# 启用防火墙(如果用户确认)
echo_warn "即将启用防火墙,请确保 SSH 端口已正确配置"
read -p "是否立即启用防火墙? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ufw --force enable
    echo_info "防火墙已启用"
    ufw status verbose
else
    echo_warn "防火墙未启用,请稍后手动执行: sudo ufw enable"
fi

###############################################################################
# 8. 创建应用目录
###############################################################################
APP_DIR="/var/www/play_chords"
echo_info "创建应用目录: $APP_DIR"

if [ -d "$APP_DIR" ]; then
    echo_warn "目录已存在: $APP_DIR"
else
    mkdir -p $APP_DIR
    chown -R $SUDO_USER:$SUDO_USER $APP_DIR
    echo_info "目录创建完成"
fi

###############################################################################
# 9. 创建 Certbot webroot 目录
###############################################################################
echo_info "创建 Certbot webroot 目录..."
mkdir -p /var/www/certbot
chown -R www-data:www-data /var/www/certbot

###############################################################################
# 总结
###############################################################################
echo_info "============================================"
echo_info "服务器初始化完成!"
echo_info "============================================"
echo_info "已安装的软件:"
echo_info "  - Node.js: $(node -v)"
echo_info "  - npm: $(npm -v)"
echo_info "  - PM2: $(pm2 -v)"
echo_info "  - Nginx: $(nginx -v 2>&1 | cut -d'/' -f2)"
echo_info "  - Certbot: $(certbot --version 2>&1 | head -n1 | cut -d' ' -f2)"
echo_info ""
echo_info "下一步:"
echo_info "  1. 克隆代码到 $APP_DIR"
echo_info "  2. 运行部署脚本: bash deploy/deploy.sh"
echo_info "  3. 配置 SSL 证书: bash deploy/setup-ssl.sh"
echo_info "  4. 配置 Nginx: bash deploy/setup-nginx.sh"
echo_info "============================================"

