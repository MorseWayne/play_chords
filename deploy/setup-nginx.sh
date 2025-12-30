#!/bin/bash
###############################################################################
# Play Chords Nginx 配置脚本
# 用途: 部署 Nginx 反向代理配置
# 使用: sudo bash deploy/setup-nginx.sh
###############################################################################

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

# 配置项
DOMAIN="rookiiie.top"
APP_DIR="/var/www/play_chords"
NGINX_AVAILABLE="/etc/nginx/sites-available/${DOMAIN}-play-chords"
NGINX_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}-play-chords"
SOURCE_CONFIG="${APP_DIR}/deploy/nginx/play_chords.conf"

echo_info "============================================"
echo_info "Nginx 配置部署"
echo_info "============================================"
echo_info "域名: $DOMAIN"
echo_info "应用路径: /play_chords"
echo ""

###############################################################################
# 1. 检查 Nginx 是否已安装
###############################################################################
echo_info "检查 Nginx 安装状态..."
if ! command -v nginx &> /dev/null; then
    echo_error "Nginx 未安装,请先运行: bash deploy/init-server.sh"
    exit 1
fi
echo_info "Nginx 版本: $(nginx -v 2>&1 | cut -d'/' -f2)"

###############################################################################
# 2. 检查 SSL 证书是否存在
###############################################################################
echo_info "检查 SSL 证书..."
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo_error "SSL 证书不存在!"
    echo_error "请先运行: sudo bash deploy/setup-ssl.sh"
    exit 1
fi
echo_info "SSL 证书存在 ✓"

###############################################################################
# 3. 检查应用是否正在运行
###############################################################################
echo_info "检查应用状态..."
if pm2 describe play-chords > /dev/null 2>&1; then
    PM2_STATUS=$(pm2 describe play-chords 2>/dev/null | grep "status" | awk '{print $4}')
    if [ "$PM2_STATUS" = "online" ]; then
        echo_info "应用正在运行 ✓"
    else
        echo_warn "应用未运行,状态: $PM2_STATUS"
        echo_warn "请先部署应用: bash deploy/deploy.sh"
    fi
else
    echo_warn "PM2 进程不存在"
    echo_warn "请先部署应用: bash deploy/deploy.sh"
fi

###############################################################################
# 4. 备份现有配置
###############################################################################
if [ -f "$NGINX_AVAILABLE" ]; then
    BACKUP_FILE="${NGINX_AVAILABLE}.bak.$(date +%Y%m%d-%H%M%S)"
    echo_info "备份现有配置: $BACKUP_FILE"
    cp "$NGINX_AVAILABLE" "$BACKUP_FILE"
fi

###############################################################################
# 5. 复制配置文件
###############################################################################
echo_info "部署 Nginx 配置..."

if [ ! -f "$SOURCE_CONFIG" ]; then
    echo_error "配置文件不存在: $SOURCE_CONFIG"
    exit 1
fi

# 复制配置文件
cp "$SOURCE_CONFIG" "$NGINX_AVAILABLE"
echo_info "配置文件已复制到: $NGINX_AVAILABLE"

###############################################################################
# 6. 检查是否需要合并配置
###############################################################################
echo ""
echo_warn "重要提示:"
echo_warn "此配置文件包含 rookiiie.top 域名的完整配置"
echo_warn "如果该域名已有其他网站,你需要手动合并配置"
echo ""
echo_info "当前配置文件: $NGINX_AVAILABLE"
echo_info "你可以编辑此文件,添加其他网站的 location 配置"
echo ""
read -p "是否立即编辑配置文件? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ${EDITOR:-vim} "$NGINX_AVAILABLE"
fi

###############################################################################
# 7. 验证配置语法
###############################################################################
echo_info "验证 Nginx 配置语法..."
nginx -t

if [ $? -eq 0 ]; then
    echo_info "配置语法正确 ✓"
else
    echo_error "配置语法错误!"
    echo_error "请检查配置文件: $NGINX_AVAILABLE"
    exit 1
fi

###############################################################################
# 8. 启用配置
###############################################################################
echo_info "启用 Nginx 配置..."

# 创建符号链接
ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
echo_info "配置已启用"

###############################################################################
# 9. 重载 Nginx
###############################################################################
echo_info "重载 Nginx..."
systemctl reload nginx

if [ $? -eq 0 ]; then
    echo_info "Nginx 重载成功 ✓"
else
    echo_error "Nginx 重载失败!"
    exit 1
fi

###############################################################################
# 10. 测试访问
###############################################################################
echo_info "等待服务就绪(3秒)..."
sleep 3

echo_info "测试 HTTPS 访问..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/play_chords || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo_info "访问测试成功: $HTTP_STATUS ✓"
else
    echo_warn "访问测试返回: $HTTP_STATUS"
    echo_warn "请手动检查: https://$DOMAIN/play_chords"
fi

###############################################################################
# 总结
###############################################################################
echo ""
echo_info "============================================"
echo_info "Nginx 配置完成!"
echo_info "============================================"
echo_info "配置文件:"
echo_info "  - 源文件: $NGINX_AVAILABLE"
echo_info "  - 链接: $NGINX_ENABLED"
echo_info ""
echo_info "访问地址:"
echo_info "  - https://$DOMAIN/play_chords"
echo_info ""
echo_info "常用命令:"
echo_info "  - 测试配置: sudo nginx -t"
echo_info "  - 重载配置: sudo systemctl reload nginx"
echo_info "  - 查看日志: sudo tail -f /var/log/nginx/access.log"
echo_info "  - 编辑配置: sudo vim $NGINX_AVAILABLE"
echo_info ""
echo_info "如需合并其他网站配置,请编辑:"
echo_info "  $NGINX_AVAILABLE"
echo_info "============================================"

