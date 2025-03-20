#!/usr/bin/env bun

import { existsSync } from 'fs';
import { spawn } from 'child_process';

// Ensure .env file exists
if (!existsSync('.env')) {
  console.error('Error: .env file not found. Please create one based on .env.example.');
  process.exit(1);
}

console.log('Starting all services using docker-compose...');

// Start all services using docker-compose
const dockerUp = spawn('docker-compose', ['up', '-d'], { stdio: 'inherit' });

dockerUp.on('close', (code) => {
  if (code !== 0) {
    console.error(`docker-compose up failed with exit code ${code}`);
    process.exit(code);
  }

  // Display running services
  const dockerPs = spawn('docker-compose', ['ps'], { stdio: 'inherit' });
  
  dockerPs.on('close', () => {
    console.log('');
    console.log('Services are now running:');
    console.log('- Bitte AI: http://localhost:3000');
  });
}); 