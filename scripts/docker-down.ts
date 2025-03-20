#!/usr/bin/env bun

import { spawn } from 'node:child_process';

console.log('Stopping all Docker services...');

// Stop all services using docker-compose down
const dockerDown = spawn('docker-compose', ['down'], { stdio: 'inherit' });

dockerDown.on('close', (code) => {
  if (code !== 0) {
    console.error(`docker-compose down failed with exit code ${code}`);
    process.exit(code);
  }

  console.log('All services have been stopped.');
});
