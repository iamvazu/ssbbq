import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const MENU_KEY = 'menu';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing item id' });
  }

  try {
    if (req.method === 'PATCH') {
      const existing = await redis.hget(MENU_KEY, id);
      if (!existing) return res.status(404).json({ error: 'Item not found' });

      const body = req.body || {};
      const patch = {};
      if (typeof body.name === 'string') patch.name = body.name.trim().slice(0, 60);
      if (typeof body.tagline === 'string') patch.tagline = body.tagline.trim().slice(0, 80);
      if (typeof body.category === 'string') patch.category = body.category.trim();
      if (body.price != null) patch.price = Number(body.price);
      if (typeof body.available === 'boolean') patch.available = body.available;

      const updated = Object.assign({}, existing, patch);
      await redis.hset(MENU_KEY, { [id]: updated });
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      await redis.hdel(MENU_KEY, id);
      return res.status(200).json({ deleted: true });
    }

    res.setHeader('Allow', 'PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('menu/[id] handler error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
