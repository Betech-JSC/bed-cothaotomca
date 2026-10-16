module.exports = {
  apps: [
    {
      name: 'cothaotomca-fe',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: '/var/www/bed-cothaotomca',
      instances: 2,
      exec_mode: 'cluster',
      listen_timeout: 10000,
      kill_timeout: 5000,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
