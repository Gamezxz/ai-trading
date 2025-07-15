#!/usr/bin/env node

// Test script to check environment variables
console.log('=== Environment Variables Test ===');

const envVars = {
  'AI_PROVIDER': process.env.AI_PROVIDER,
  'GROQ_API_KEY': process.env.GROQ_API_KEY,
  'ANTHROPIC_API_KEY': process.env.ANTHROPIC_API_KEY,
  'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
  'HUGGINGFACE_API_KEY': process.env.HUGGINGFACE_API_KEY,
  'OLLAMA_BASE_URL': process.env.OLLAMA_BASE_URL,
};

Object.entries(envVars).forEach(([key, value]) => {
  if (value) {
    console.log(`✅ ${key}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`❌ ${key}: NOT SET`);
  }
});

console.log('\n=== File Check ===');
const fs = require('fs');
const path = require('path');

const envFiles = ['.env.local', '.env', '.env.example'];
envFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}: EXISTS`);
  } else {
    console.log(`❌ ${file}: NOT FOUND`);
  }
});

console.log('\n=== Recommendations ===');
if (!process.env.GROQ_API_KEY && !process.env.ANTHROPIC_API_KEY) {
  console.log('🚀 Quick Setup: Get FREE Groq API key from https://console.groq.com/');
  console.log('   Add to .env.local: GROQ_API_KEY=gsk_your-key-here');
}
if (!process.env.AI_PROVIDER) {
  console.log('📝 Set AI_PROVIDER=groq in .env.local for automatic selection');
}