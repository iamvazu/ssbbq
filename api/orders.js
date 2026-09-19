import { getRedis } from './lib/redis.js';

const ORDERS_KEY = 'orders';
const COUNTER_KEY = 'order:counter';

export default async function handler(req, res) {
  try {
    const redis = getRedis();

    if (req.method === 'GET') {
      const orders = await redis.hgetall(ORDERS_KEY);
      let list = orders ? Object.values(orders) : [];

      // Auto-purge the test orders (#135 'Vasu test' and #002 'Vasu') from Redis database
      const testIdsToDelete = [];
      list = list.filter((o) => {
        const num = Number(o.orderNumber);
        const name = String(o.customerName || '').trim().toLowerCase();
        const isTargetTest =
          num === 135 ||
          num === 2 ||
          name === 'vasu test' ||
          (name.includes('vasu') && (num === 135 || num === 2 || o.total === 350 || o.total === 950));

        if (isTargetTest && o.id) {
          testIdsToDelete.push(o.id);
          return false;
        }
        return true;
      });

      if (testIdsToDelete.length > 0) {
        for (const tid of testIdsToDelete) {
          try {
            await redis.hdel(ORDERS_KEY, tid);
          } catch (e) {
            console.error('Failed to auto-delete test order', tid, e);
          }
        }
      }

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

    if (req.method === 'DELETE') {
      // Support deleting test orders by query or body
      const { ids, orderNumbers } = req.query;
      const targetIds = [];

      if (ids) {
        ids.split(',').forEach((id) => targetIds.push(id.trim()));
      }

      if (orderNumbers) {
        const nums = orderNumbers.split(',').map((n) => Number(n.trim()));
        const all = await redis.hgetall(ORDERS_KEY);
        if (all) {
          Object.values(all).forEach((o) => {
            if (nums.includes(Number(o.orderNumber))) {
              targetIds.push(o.id);
            }
          });
        }
      }

      for (const tid of targetIds) {
        await redis.hdel(ORDERS_KEY, tid);
      }

      return res.status(200).json({ deleted: targetIds });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('orders handler error', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
