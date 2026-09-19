import { getRedis } from './lib/redis.js';

const ORDERS_KEY = 'orders';
const COUNTER_KEY = 'order:counter';

export default async function handler(req, res) {
  try {
    const redis = getRedis();

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

    if (req.method === 'PATCH') {
      const body = req.body || {};
      const { ids, status, itemName, fromStatus, toStatus } = body;
      const validStatuses = ['placed', 'in_process', 'cooking_finished', 'delivered', 'cancelled'];

      const targetStatus = status || toStatus;
      if (!targetStatus || !validStatuses.includes(targetStatus)) {
        return res.status(400).json({ error: 'Valid target status is required: ' + validStatuses.join(', ') });
      }

      const all = await redis.hgetall(ORDERS_KEY);
      if (!all) return res.status(200).json({ updated: 0 });

      const updates = {};
      let updateCount = 0;
      const now = Date.now();

      if (Array.isArray(ids) && ids.length > 0) {
        ids.forEach((id) => {
          if (all[id]) {
            updates[id] = Object.assign({}, all[id], { status: targetStatus, updatedAt: now });
            updateCount++;
          }
        });
      } else if (itemName) {
        const needle = String(itemName).trim().toLowerCase();
        Object.values(all).forEach((o) => {
          if (fromStatus && o.status !== fromStatus) return;
          const hasItem = (o.items || []).some((it) => String(it.name || '').trim().toLowerCase() === needle || String(it.id || '') === itemName);
          if (hasItem) {
            updates[o.id] = Object.assign({}, o, { status: targetStatus, updatedAt: now });
            updateCount++;
          }
        });
      } else if (fromStatus) {
        Object.values(all).forEach((o) => {
          if (o.status === fromStatus) {
            updates[o.id] = Object.assign({}, o, { status: targetStatus, updatedAt: now });
            updateCount++;
          }
        });
      }

      if (updateCount > 0) {
        await redis.hset(ORDERS_KEY, updates);
      }

      return res.status(200).json({ updated: updateCount, status: targetStatus });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('orders handler error', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
