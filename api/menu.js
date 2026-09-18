import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const MENU_KEY = 'menu';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const items = await redis.hgetall(MENU_KEY);
      const list = items ? Object.values(items) : [];
      return res.status(200).json(list);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const category = typeof body.category === 'string' ? body.category.trim() : '';
      const price = Number(body.price);
      const tagline = typeof body.tagline === 'string' ? body.tagline.trim() : '';

      if (!name || !category || !price || price <= 0) {
        return res.status(400).json({ error: 'name, category and a positive price are required' });
      }

      const id = (globalThis.crypto && globalThis.crypto.randomUUID)
        ? globalThis.crypto.randomUUID()
        : 'm-' + Date.now() + '-' + Math.random().toString(36).slice(2);

      const item = {
        id,
        name: name.slice(0, 60),
        tagline: tagline.slice(0, 80),
        category,
        price,
        available: true,
        sortOrder: Date.now()
      };

      await redis.hset(MENU_KEY, { [id]: item });
      return res.status(201).json(item);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('menu handler error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
