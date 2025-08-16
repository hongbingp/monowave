#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Monowave Test Suite...\n');

async function runTests() {
  try {
    // Run unit tests
    console.log('📋 Running Unit Tests...');
    await runCommand('npm', ['run', 'test:unit'], { cwd: process.cwd() });
    
    // Run integration tests
    console.log('\n🔗 Running Integration Tests...');
    await runCommand('npm', ['run', 'test:integration'], { cwd: process.cwd() });
    
    // Run smart contract tests
    console.log('\n📜 Running Smart Contract Tests...');
    await runCommand('npm', ['run', 'test:contracts'], { cwd: process.cwd() });
    
    // Generate coverage report
    console.log('\n📊 Generating Coverage Report...');
    await runCommand('npm', ['run', 'test:coverage'], { cwd: process.cwd() });
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test execution interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test execution terminated');
  process.exit(0);
});

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };