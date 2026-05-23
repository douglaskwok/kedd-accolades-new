import { list, put } from '@vercel/blob';
import { readFileSync } from 'fs';
import { join } from 'path';

const BLOB_PREFIX = 'leaderboard-data-';

function readSeedData() {
  const raw = readFileSync(join(process.cwd(), 'data.json'), 'utf8');
  return { raw, json: JSON.parse(raw) };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  let blobs = [];
  try {
    const result = await list({ prefix: BLOB_PREFIX });
    blobs = result.blobs;
  } catch (error) {
    console.warn('Unable to list leaderboard blobs; using seed data.', error);
    return res.json(readSeedData().json);
  }

  if (blobs.length === 0) {
    const seed = readSeedData();
    try {
      await put(`${BLOB_PREFIX}${Date.now()}.json`, seed.raw, {
        access: 'public',
        contentType: 'application/json',
      });
    } catch (error) {
      console.warn('Unable to seed leaderboard blob; serving seed data only.', error);
    }
    return res.json(seed.json);
  }

  // Try blobs newest-first; fall back to the previous one if the newest is not propagated yet.
  const sorted = [...blobs].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
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

  // All blobs failed; return seed data.
  res.json(readSeedData().json);
}
