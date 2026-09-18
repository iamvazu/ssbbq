import { getRedis } from './lib/redis.js';

const MENU_KEY = 'menu';

export const DEFAULT_MENU = [
  { name: 'Texas Chicken Steak Burger', category: 'Burgers', price: 350, tagline: 'Classic smoked chicken steak with Texas BBQ glaze' },
  { name: 'Pepper Garlic Chicken Steak Burger', category: 'Burgers', price: 350, tagline: 'Cracked black pepper, roasted garlic & cheese' },
  { name: 'Peri Peri Chicken Steak Burger', category: 'Burgers', price: 350, tagline: 'Spicy African bird\'s eye chili marination' },
  { name: 'BBQ Mixed Veg Burger', category: 'Burgers', price: 300, tagline: 'Grilled veg patty, smoked cheddar, BBQ drizzle' },
  { name: 'Texas Wings', category: 'Wings', price: 250, tagline: '6pcs crisp smoked wings in smoky honey BBQ' },
  { name: 'Peri Peri Wings', category: 'Wings', price: 250, tagline: '6pcs fiery tossed wings with lime zing' },
  { name: 'BBQ Spicy Wings', category: 'Wings', price: 250, tagline: '6pcs slow smoked wings in house hot sauce' },
  { name: 'BBQ Chicken Boneless', category: 'Wings', price: 350, tagline: 'Tender smoked boneless bites in sticky BBQ glaze' },
  { name: 'BBQ Veg Loaded Fries', category: 'Sides', price: 300, tagline: 'Crispy seasoned fries, melted cheese, grilled veg' },
  { name: 'BBQ Chicken Loaded Fries', category: 'Sides', price: 350, tagline: 'Crispy fries topped with pulled BBQ chicken & queso' },
  { name: 'BBQ Chicken & Nachos', category: 'Sides', price: 350, tagline: 'Warm tortilla chips, smoked chicken, salsa & cheese' },
  { name: 'BBQ Veg & Nachos', category: 'Sides', price: 300, tagline: 'Crispy tortilla chips, charred peppers, beans & cheese' }
];

export async function seedDefaultMenu(redis) {
  const seedItems = {};
  DEFAULT_MENU.forEach((it, idx) => {
    const id = 'm-' + (idx + 1) + '-' + Math.random().toString(36).slice(2, 7);
    seedItems[id] = {
      id,
      name: it.name,
      tagline: it.tagline || '',
      category: it.category,
      price: it.price,
      available: true,
      sortOrder: (idx + 1) * 10
    };
  });
  await redis.hset(MENU_KEY, seedItems);
  return Object.values(seedItems);
}

export default async function handler(req, res) {
  try {
    const redis = getRedis();

    if (req.method === 'GET') {
      const items = await redis.hgetall(MENU_KEY);
      let list = items ? Object.values(items) : [];

      // Auto-populate default products on first load if database is empty
      if (list.length === 0) {
        list = await seedDefaultMenu(redis);
      }

      list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      return res.status(200).json(list);
    }

    if (req.method === 'POST') {
      // Manual seed endpoint trigger
      if (req.query.seed === 'true' || (req.body && req.body.seed === true)) {
        const list = await seedDefaultMenu(redis);
        list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        return res.status(200).json(list);
      }

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
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
