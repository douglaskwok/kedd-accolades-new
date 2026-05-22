#!/usr/bin/env node
// Usage: node push.js [path/to/file.json]
// Defaults to data.json. Reads UPDATE_SECRET and DEPLOY_URL from .env.local

import { readFileSync } from 'fs';
import { config } from 'dotenv';

config({ path: '.env.local' });

const file = process.argv[2] ?? 'data.json';
const url = process.env.DEPLOY_URL;
const secret = process.env.UPDATE_SECRET;

if (!url || !secret) {
  console.error('Missing DEPLOY_URL or UPDATE_SECRET in .env.local');
  process.exit(1);
}

const data = JSON.parse(readFileSync(file, 'utf8'));

const res = await fetch(`${url}/api/update`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${secret}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});

const json = await res.json();
if (!res.ok) {
  console.error('Failed:', res.status, json);
  process.exit(1);
}

console.log(`Pushed ${file} → ${url} ✓`);
