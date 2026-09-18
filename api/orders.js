import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ORDERS_KEY = 'orders';
const COUNTER_KEY = 'order:counter';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const orders = await redis.hgetall(ORDERS_KEY);
      const list = orders ? Object.values(orders) : [];
      return res.status(200).json(list);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) {
        return res.status(400).json({ error: 'Order must include at least one item' });
      }
      const cleanItems = items.map((it) => ({
        id: String(it.id || ''),
        name: String(it.name || '').slice(0, 60),
        price: Number(it.price) || 0,
        qty: Math.max(1, Math.min(50, Number(it.qty) || 1))
      }));
      const total = cleanItems.reduce((sum, it) => sum + it.price * it.qty, 0);

      const orderNumber = await redis.incr(COUNTER_KEY);
      const id = (globalThis.crypto && globalThis.crypto.randomUUID)
        ? globalThis.crypto.randomUUID()
        : 'o-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      const now = Date.now();

      const order = {
        id,
        orderNumber,
        items: cleanItems,
        total,
        customerName: String(body.customerName || '').slice(0, 40),
        notes: String(body.notes || '').slice(0, 140),
        status: 'placed',
        createdAt: now,
        updatedAt: now
      };

      await redis.hset(ORDERS_KEY, { [id]: order });
      return res.status(201).json(order);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('orders handler error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
