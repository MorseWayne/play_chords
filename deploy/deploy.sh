#!/bin/bash
###############################################################################
# Play Chords 部署脚本
# 用途: 更新代码、安装依赖、构建应用、重启服务
# 使用: bash deploy/deploy.sh
###############################################################################

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 配置项
APP_DIR="/var/www/play_chords"
PM2_APP_NAME="play-chords"
LOG_FILE="/tmp/deploy-$(date +%Y%m%d-%H%M%S).log"

# 记录日志
exec > >(tee -a "$LOG_FILE")
exec 2>&1

echo_info "============================================"
echo_info "Play Chords 部署脚本"
echo_info "时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo_info "日志文件: $LOG_FILE"
echo_info "============================================"
echo ""

###############################################################################
# 1. 检查当前目录
###############################################################################
echo_step "1/8 检查当前目录..."

# 如果不在应用目录,尝试切换
if [ "$(pwd)" != "$APP_DIR" ]; then
    if [ -d "$APP_DIR" ]; then
        echo_info "切换到应用目录: $APP_DIR"
        cd "$APP_DIR"
    else
        echo_error "应用目录不存在: $APP_DIR"
        echo_info "请先克隆代码: git clone <repo_url> $APP_DIR"
        exit 1
    fi
fi

echo_info "当前目录: $(pwd)"

###############################################################################
# 2. 备份当前版本(用于回滚)
###############################################################################
echo_step "2/8 记录当前 Git 版本..."

if [ -d ".git" ]; then
    CURRENT_COMMIT=$(git rev-parse HEAD)
    CURRENT_BRANCH=$(git branch --show-current)
    echo_info "当前分支: $CURRENT_BRANCH"
    echo_info "当前提交: $CURRENT_COMMIT"
else
    echo_warn "不是 Git 仓库,跳过版本记录"
fi

###############################################################################
# 3. 拉取最新代码
###############################################################################
echo_step "3/8 拉取最新代码..."

if [ -d ".git" ]; then
    echo_info "执行: git pull"
    git pull
    
    NEW_COMMIT=$(git rev-parse HEAD)
    if [ "$CURRENT_COMMIT" = "$NEW_COMMIT" ]; then
        echo_info "代码已是最新版本,无需更新"
    else
        echo_info "代码已更新: $CURRENT_COMMIT -> $NEW_COMMIT"
    fi
else
    echo_warn "不是 Git 仓库,跳过代码拉取"
    echo_info "如果是首次部署,请确保代码已正确放置在: $APP_DIR"
fi

###############################################################################
# 4. 智能增量安装依赖
###############################################################################
echo_step "4/8 检查并增量安装依赖..."

# 检查依赖文件是否有变化
NEED_INSTALL=false
DEPENDENCY_CHANGED=false

if [ -d ".git" ] && [ -n "$CURRENT_COMMIT" ] && [ -n "$NEW_COMMIT" ]; then
    # 检查 package.json 或 package-lock.json 是否有变化
    if git diff --name-only $CURRENT_COMMIT $NEW_COMMIT | grep -qE '^package(-lock)?\.json$'; then
        echo_info "检测到依赖文件有变化:"
        git diff --name-only $CURRENT_COMMIT $NEW_COMMIT | grep -E '^package(-lock)?\.json$' | while read file; do
            echo_info "  - $file"
        done
        DEPENDENCY_CHANGED=true
        NEED_INSTALL=true
    else
        echo_info "依赖文件无变化"
        NEED_INSTALL=false
    fi
else
    # 首次部署或无法确定变化时，检查 node_modules 是否存在
    if [ ! -d "node_modules" ]; then
        echo_info "node_modules 不存在,需要安装依赖"
        NEED_INSTALL=true
    else
        echo_info "node_modules 已存在，跳过安装"
        NEED_INSTALL=false
    fi
fi

# 执行增量依赖安装（利用本地缓存）
if [ "$NEED_INSTALL" = true ]; then
    echo_info "使用增量安装策略（保留现有依赖，仅安装缺失项）..."
    
    # 配置 npm 使用本地缓存优先策略
    export NPM_CONFIG_LOGLEVEL=warn        # 减少日志输出
    export NPM_CONFIG_PROGRESS=false       # 关闭进度条（减少输出）
    export NPM_CONFIG_PREFER_OFFLINE=true  # 优先使用离线缓存
    export NPM_CONFIG_NO_AUDIT=true        # 跳过安全审计
    export NPM_CONFIG_NO_FUND=true         # 跳过赞助信息
    
    # 可选：使用国内镜像加速（取消下面注释即可启用）
    # export NPM_CONFIG_REGISTRY=https://registry.npmmirror.com
    
    echo_info "开始增量安装依赖..."
    if NODE_ENV=production npm install; then
        echo_info "依赖安装成功 ✓"
    else
        echo_error "依赖安装失败"
        echo_error "请检查 package.json 配置或网络连接"
        exit 1
    fi
else
    echo_info "跳过依赖安装，复用现有 node_modules"
fi

# 显示 node_modules 大小（用于监控）
if [ -d "node_modules" ]; then
    NODE_MODULES_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1)
    echo_info "node_modules 大小: $NODE_MODULES_SIZE"
fi

###############################################################################
# 5. 构建应用
###############################################################################
echo_step "5/8 构建 Next.js 应用..."

echo_info "执行: NODE_ENV=production npm run build"
NODE_ENV=production npm run build

if [ $? -eq 0 ]; then
    echo_info "构建成功!"
else
    echo_error "构建失败!"
    echo_error "部署中止,旧版本应用继续运行"
    exit 1
fi

###############################################################################
# 6. 检查 PM2 进程状态
###############################################################################
echo_step "6/8 检查 PM2 进程状态..."

if pm2 describe "$PM2_APP_NAME" > /dev/null 2>&1; then
    echo_info "PM2 进程 '$PM2_APP_NAME' 已存在"
    PM2_EXISTS=true
else
    echo_warn "PM2 进程 '$PM2_APP_NAME' 不存在"
    PM2_EXISTS=false
fi

###############################################################################
# 7. 重启/启动应用
###############################################################################
echo_step "7/8 重启应用..."

if [ "$PM2_EXISTS" = true ]; then
    echo_info "执行平滑重载: pm2 reload $PM2_APP_NAME"
    pm2 reload ecosystem.config.js --update-env
else
    echo_info "首次启动: pm2 start ecosystem.config.js"
    pm2 start ecosystem.config.js
fi

# 保存 PM2 进程列表(用于开机自启)
pm2 save

echo_info "应用已重启"

###############################################################################
# 8. 健康检查
###############################################################################
echo_step "8/8 健康检查..."

# 等待应用启动
echo_info "等待应用启动(5秒)..."
sleep 5

# 检查 PM2 进程状态
PM2_STATUS=$(pm2 describe "$PM2_APP_NAME" 2>/dev/null | grep "status" | awk '{print $4}')
if [ "$PM2_STATUS" = "online" ]; then
    echo_info "PM2 进程状态: online ✓"
else
    echo_error "PM2 进程状态异常: $PM2_STATUS"
    echo_error "查看日志: pm2 logs $PM2_APP_NAME"
    exit 1
fi

# HTTP 健康检查
echo_info "执行 HTTP 健康检查..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/play_chords || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo_info "HTTP 健康检查通过: $HTTP_STATUS ✓"
else
    echo_warn "HTTP 健康检查失败: $HTTP_STATUS"
    echo_warn "这可能是正常的(如果还未配置 Nginx 反向代理)"
    echo_warn "请检查应用日志: pm2 logs $PM2_APP_NAME"
fi

###############################################################################
# 总结
###############################################################################
echo ""
echo_info "============================================"
echo_info "部署完成!"
echo_info "============================================"
echo_info "应用信息:"
echo_info "  - 应用名称: $PM2_APP_NAME"
echo_info "  - 进程状态: $PM2_STATUS"
echo_info "  - 访问地址: https://rookiiie.top/play_chords"
echo_info ""
echo_info "常用命令:"
echo_info "  - 查看日志: pm2 logs $PM2_APP_NAME"
echo_info "  - 查看状态: pm2 status"
echo_info "  - 重启应用: pm2 restart $PM2_APP_NAME"
echo_info "  - 停止应用: pm2 stop $PM2_APP_NAME"
echo_info ""
echo_info "部署日志已保存: $LOG_FILE"
echo_info "============================================"

