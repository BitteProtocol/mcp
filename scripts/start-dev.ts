#!/usr/bin/env bun

import { existsSync } from 'fs';
import { spawn } from 'child_process';
import { join } from 'path';

// Check if .env file exists
if (!existsSync('.env')) {
  console.error('Error: .env file not found. Please create one based on .env.example.');
  process.exit(1);
}

// Service configurations
const services = [
  {
    name: 'bitte-ai',
    dir: 'packages/bitte-ai',
    port: 3000,
  },
];

// Array to store child processes
const processes = [];

// Function to handle process termination
function cleanup() {
  console.log('\nStopping all services...');
  for (const proc of processes) {
    proc.kill();
  }
  process.exit(0);
}

// Set up trap for script termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start all services
console.log('Starting all services...\n');

// Start each service
for (const service of services) {
  console.log(`Starting ${service.name} on port ${service.port}...`);

  const proc = spawn('bun', ['run', 'dev'], {
    cwd: join(process.cwd(), service.dir),
    env: { ...process.env, PORT: service.port.toString() },
    stdio: 'pipe',
  });

  // Store the process
  processes.push(proc);

  // Handle standard output
  proc.stdout.on('data', (data) => {
    console.log(`[${service.name}] ${data.toString().trim()}`);
  });

  // Handle standard error
  proc.stderr.on('data', (data) => {
    console.error(`[${service.name}] ${data.toString().trim()}`);
  });

  // Handle process exit
  proc.on('close', (code) => {
    console.log(`[${service.name}] process exited with code ${code}`);
  });
}

console.log('\nAll services started:');
for (const service of services) {
  console.log(`- ${service.name}: http://localhost:${service.port}`);
}

console.log('\nPress Ctrl+C to stop all services.');

// This keeps the script running
process.stdin.resume();
