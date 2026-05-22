import { put, list, del } from '@vercel/blob';

const BLOB_PREFIX = 'leaderboard-data-';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
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
    const existing = await fetch(`https://${process.env.VERCEL_URL}/api/data`).then(r => r.json());
    data = { ...existing, ...req.body };
  }

  // Write new blob with unique timestamped name — bypasses CDN cache on the old URL
  await put(`${BLOB_PREFIX}${Date.now()}.json`, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
  });

  // Clean up all previous blobs to avoid accumulation
  const { blobs } = await list({ prefix: BLOB_PREFIX });
  const sorted = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  if (sorted.length > 2) {
    await del(sorted.slice(2).map(b => b.url));
  }

  res.json({ ok: true });
}
