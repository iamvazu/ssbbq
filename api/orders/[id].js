import { getRedis } from '../lib/redis.js';

const ORDERS_KEY = 'orders';
const VALID_STATUSES = ['placed', 'in_process', 'cooking_finished', 'delivered', 'cancelled'];

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing order id' });
  }

  try {
    const redis = getRedis();

    if (req.method === 'PATCH') {
      const existing = await redis.hget(ORDERS_KEY, id);
      if (!existing) return res.status(404).json({ error: 'Order not found' });

      const body = req.body || {};
      if (!VALID_STATUSES.includes(body.status)) {
        return res.status(400).json({ error: 'status must be one of: ' + VALID_STATUSES.join(', ') });
      }

      const updated = Object.assign({}, existing, { status: body.status, updatedAt: Date.now() });
      await redis.hset(ORDERS_KEY, { [id]: updated });
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      await redis.hdel(ORDERS_KEY, id);
      return res.status(200).json({ deleted: true, id });
    }

    res.setHeader('Allow', 'PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('orders/[id] handler error', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
