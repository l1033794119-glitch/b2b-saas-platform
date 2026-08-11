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
    max_restarts: 5,
    min_uptime: '10s',
    kill_timeout: 10000,
    listen_timeout: 30000,
    wait_ready: true,
    autorestart: true,
    max_memory_restart: '1.5G',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
