#!/usr/bin/env node

const fs = require('fs');

// Check if a file was provided
if (process.argv.length < 3) {
  console.log('Usage: node convert-pem.js <path-to-pem-file>');
  process.exit(1);
}

// Read the PEM file
const pemPath = process.argv[2];
try {
  const pemContent = fs.readFileSync(pemPath, 'utf8');
  
  // Convert to a format suitable for environment variables
  // 1. Trim whitespace
  // 2. Replace actual newlines with escaped newlines
  const formattedKey = pemContent.trim().replace(/\r?\n/g, '\\n');
  
  console.log('Copy the following into your .env.local file:');
  console.log(`GITHUB_APP_PRIVATE_KEY="${formattedKey}"`);
} catch (error) {
  console.error('Error reading the PEM file:', error.message);
  process.exit(1);
} 