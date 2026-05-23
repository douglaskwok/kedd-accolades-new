import { put, list, del } from '@vercel/blob';

const BLOB_PREFIX = 'leaderboard-data-';

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

async function fetchExistingData(req) {
  const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? process.env.VERCEL_URL;
  if (!host) throw new Error('Unable to resolve deployment host for PATCH');

  const protocol = req.headers['x-forwarded-proto'] ?? 'https';
  const response = await fetch(`${protocol}://${host}/api/data`);
  if (!response.ok) throw new Error(`Unable to load existing data: HTTP ${response.status}`);
  return response.json();
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.UPDATE_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let data = req.body;

  if (req.method === 'PATCH') {
    // Merge top-level keys into existing data
    try {
      const existing = await fetchExistingData(req);
      data = { ...existing, ...req.body };
    } catch (error) {
      console.error('Unable to patch leaderboard data.', error);
      return res.status(500).json({ error: 'Unable to load existing data' });
    }
  }

  // Write new blob with unique timestamped name — bypasses CDN cache on the old URL
  try {
    await put(`${BLOB_PREFIX}${Date.now()}.json`, JSON.stringify(data), {
      access: 'public',
      contentType: 'application/json',
    });
  } catch (error) {
    console.error('Unable to write leaderboard data blob.', error);
    return res.status(500).json({ error: 'Unable to write data' });
  }

  // Clean up all previous blobs to avoid accumulation
  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX });
    const sorted = [...blobs].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    if (sorted.length > 2) {
      await del(sorted.slice(2).map(b => b.url));
    }
  } catch (error) {
    console.warn('Saved leaderboard data, but old blob cleanup failed.', error);
  }

  res.json({ ok: true });
}
