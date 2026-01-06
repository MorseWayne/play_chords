/**
 * PM2 配置文件
 * 用于管理 Play Chords Next.js 应用进程
 * 
 * 使用方法:
 *   启动: pm2 start ecosystem.config.js
 *   重启: pm2 restart ecosystem.config.js
 *   停止: pm2 stop ecosystem.config.js
 *   重载: pm2 reload ecosystem.config.js (零停机)
 *   查看日志: pm2 logs play-chords
 */

module.exports = {
  apps: [
    {
      name: 'play-chords',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/play_chords',
      instances: 1, // 单实例模式,如需高可用可改为 'max'
      exec_mode: 'fork', // fork 模式,集群模式用 'cluster'
      
      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 10000,
      },
      
      // 自动重启配置
      autorestart: true,
      max_restarts: 10, // 最大重启次数
      min_uptime: '10s', // 最小运行时间,避免频繁重启
      max_memory_restart: '500M', // 内存超限自动重启
      
      // 日志配置
      error_file: '/var/log/pm2/play-chords-error.log',
      out_file: '/var/log/pm2/play-chords-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      combine_logs: true,
      merge_logs: true,
      
      // 时间配置
      time: true,
      
      // 监听文件变化(生产环境建议关闭)
      watch: false,
      
      // 忽略监听的文件
      ignore_watch: [
        'node_modules',
        '.next',
        'logs',
        '*.log',
      ],
      
      // 进程管理
      kill_timeout: 5000, // 强制杀死前等待时间(毫秒)
      wait_ready: true, // 等待应用发送 'ready' 信号
      listen_timeout: 10000, // 等待就绪的超时时间
      
      // 实例关闭前执行清理
      shutdown_with_message: false,
    },
  ],
};

