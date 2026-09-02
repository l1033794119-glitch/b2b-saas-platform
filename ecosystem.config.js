// PM2 部署配置 —— 服务器执行：pm2 start ecosystem.config.js && pm2 save
// 若 Node.js 不在系统 PATH，需加 --interpreter /path/to/bin/node
// 例：pm2 start ecosystem.config.js --interpreter /www/server/nodejs/v20.18.0/bin/node
module.exports = {
  apps: [{
    name: 'b2b-platform',
    cwd: __dirname,
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3000',
    interpreter: process.env.PM2_NODE_BIN || process.execPath,
    env: {
      NODE_ENV: 'production'
    },
    instances: 1,
    exec_mode: 'fork',
    max_restarts: 10,
    min_uptime: '15s',
    kill_timeout: 15000,
    listen_timeout: 60000,
    // ⚠️ 不要用 wait_ready: true — Next.js start 模式不发 process.send('ready')
    //   会导致 PM2 等 listen_timeout 后认定启动失败并循环杀进程
    wait_ready: false,
    autorestart: true,
    max_memory_restart: '1536M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
