import { list, put } from '@vercel/blob';
import { readFileSync } from 'fs';
import { join } from 'path';

const BLOB_PREFIX = 'leaderboard-data-';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const { blobs } = await list({ prefix: BLOB_PREFIX });

  if (blobs.length === 0) {
    const raw = readFileSync(join(process.cwd(), 'data.json'), 'utf8');
    await put(`${BLOB_PREFIX}${Date.now()}.json`, raw, { access: 'public', contentType: 'application/json' });
    return res.json(JSON.parse(raw));
  }

  // Try blobs newest-first; fall back to the previous one if the newest isn't propagated yet
  const sorted = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  for (const blob of sorted) {
    try {
      const response = await fetch(blob.url);
      if (!response.ok) continue;
      const text = await response.text();
      const data = JSON.parse(text);
      return res.json(data);
    } catch {
      continue;
    }
  }

  // All blobs failed — return seed data
  const raw = readFileSync(join(process.cwd(), 'data.json'), 'utf8');
  res.json(JSON.parse(raw));
}
