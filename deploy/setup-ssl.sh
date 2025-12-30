#!/bin/bash
###############################################################################
# Play Chords SSL 证书配置脚本
# 用途: 使用 Let's Encrypt 自动申请和配置 SSL 证书
# 使用: sudo bash deploy/setup-ssl.sh
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
EMAIL="admin@${DOMAIN}"  # 修改为你的邮箱地址

echo_info "============================================"
echo_info "Let's Encrypt SSL 证书配置"
echo_info "============================================"
echo_info "域名: $DOMAIN"
echo ""

###############################################################################
# 1. 检查 Certbot 是否已安装
###############################################################################
echo_info "检查 Certbot 安装状态..."
if ! command -v certbot &> /dev/null; then
    echo_error "Certbot 未安装,请先运行: bash deploy/init-server.sh"
    exit 1
fi
echo_info "Certbot 版本: $(certbot --version 2>&1 | head -n1)"

###############################################################################
# 2. 检查证书是否已存在
###############################################################################
echo_info "检查证书状态..."
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo_warn "证书已存在: /etc/letsencrypt/live/$DOMAIN"
    echo_warn "证书信息:"
    certbot certificates -d "$DOMAIN" 2>/dev/null || true
    echo ""
    read -p "是否强制续期/重新申请证书? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        FORCE_RENEW=true
    else
        echo_info "跳过证书申请,使用现有证书"
        FORCE_RENEW=false
    fi
else
    echo_info "证书不存在,准备申请新证书"
    FORCE_RENEW=false
fi

###############################################################################
# 3. 确保 Nginx 正在运行
###############################################################################
echo_info "检查 Nginx 状态..."
if systemctl is-active --quiet nginx; then
    echo_info "Nginx 正在运行"
else
    echo_warn "Nginx 未运行,尝试启动..."
    systemctl start nginx
fi

###############################################################################
# 4. 创建临时 Nginx 配置(用于 HTTP-01 验证)
###############################################################################
echo_info "配置 Nginx 用于证书验证..."

# 备份现有配置(如果存在)
if [ -f "/etc/nginx/sites-available/$DOMAIN" ]; then
    cp "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-available/${DOMAIN}.bak.$(date +%Y%m%d-%H%M%S)"
fi

# 创建临时配置
cat > /etc/nginx/sites-available/temp-certbot.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name rookiiie.top;

    # Let's Encrypt 验证路径
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # 临时允许其他请求(可选)
    location / {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF

# 启用临时配置
ln -sf /etc/nginx/sites-available/temp-certbot.conf /etc/nginx/sites-enabled/

# 测试配置
echo_info "测试 Nginx 配置..."
nginx -t

# 重载 Nginx
systemctl reload nginx
echo_info "Nginx 配置已更新"

###############################################################################
# 5. 申请 SSL 证书
###############################################################################
if [ "$FORCE_RENEW" = false ] && [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo_info "使用现有证书,跳过申请"
else
    echo_info "申请 Let's Encrypt 证书..."
    echo_warn "请确保域名 $DOMAIN 已正确解析到本服务器 IP"
    echo ""
    
    # 提示用户输入邮箱
    read -p "请输入用于证书通知的邮箱地址 [$EMAIL]: " INPUT_EMAIL
    if [ -n "$INPUT_EMAIL" ]; then
        EMAIL=$INPUT_EMAIL
    fi
    
    echo_info "使用邮箱: $EMAIL"
    echo_info "开始申请证书..."
    
    # 申请证书(使用 webroot 方式)
    if [ "$FORCE_RENEW" = true ]; then
        certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email "$EMAIL" \
            --agree-tos \
            --no-eff-email \
            --force-renewal \
            -d "$DOMAIN"
    else
        certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email "$EMAIL" \
            --agree-tos \
            --no-eff-email \
            -d "$DOMAIN"
    fi
    
    if [ $? -eq 0 ]; then
        echo_info "证书申请成功!"
    else
        echo_error "证书申请失败!"
        echo_error "请检查:"
        echo_error "  1. 域名 DNS 是否正确解析到本服务器"
        echo_error "  2. 防火墙是否允许 80 端口"
        echo_error "  3. Nginx 是否正常运行"
        exit 1
    fi
fi

###############################################################################
# 6. 配置自动续期
###############################################################################
echo_info "配置证书自动续期..."

# Certbot 在 Ubuntu 上默认会创建 systemd timer
# 检查 timer 状态
if systemctl is-enabled --quiet certbot.timer; then
    echo_info "Certbot 自动续期已启用"
else
    echo_warn "Certbot 自动续期未启用,手动启用..."
    systemctl enable certbot.timer
    systemctl start certbot.timer
fi

# 显示 timer 状态
systemctl status certbot.timer --no-pager | head -n 10

# 添加续期后重载 Nginx 的 hook
RENEW_HOOK_DIR="/etc/letsencrypt/renewal-hooks/deploy"
mkdir -p "$RENEW_HOOK_DIR"

cat > "$RENEW_HOOK_DIR/reload-nginx.sh" << 'EOF'
#!/bin/bash
# 证书续期后自动重载 Nginx
systemctl reload nginx
EOF

chmod +x "$RENEW_HOOK_DIR/reload-nginx.sh"
echo_info "已配置证书续期后自动重载 Nginx"

###############################################################################
# 7. 测试自动续期
###############################################################################
echo_info "测试证书自动续期(dry run)..."
certbot renew --dry-run

if [ $? -eq 0 ]; then
    echo_info "自动续期测试通过 ✓"
else
    echo_warn "自动续期测试失败,请检查配置"
fi

###############################################################################
# 8. 清理临时配置
###############################################################################
echo_info "清理临时配置..."
rm -f /etc/nginx/sites-enabled/temp-certbot.conf
rm -f /etc/nginx/sites-available/temp-certbot.conf

###############################################################################
# 总结
###############################################################################
echo ""
echo_info "============================================"
echo_info "SSL 证书配置完成!"
echo_info "============================================"
echo_info "证书路径:"
echo_info "  - 证书: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo_info "  - 私钥: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo_info ""
echo_info "证书信息:"
certbot certificates -d "$DOMAIN" 2>/dev/null | grep -A5 "Certificate Name" || true
echo ""
echo_info "自动续期:"
echo_info "  - 状态: $(systemctl is-enabled certbot.timer)"
echo_info "  - 检查: systemctl status certbot.timer"
echo_info ""
echo_info "手动续期命令:"
echo_info "  sudo certbot renew --force-renewal"
echo_info ""
echo_info "下一步:"
echo_info "  运行 Nginx 配置脚本: sudo bash deploy/setup-nginx.sh"
echo_info "============================================"

