// One-time helper: populates your deployed app with your real menu so you
// don't have to type all 12 items by hand in the Menu tab.
//
// Usage:
//   node scripts/seed-menu.mjs https://your-app.vercel.app
//
// Safe to run more than once — it only ADDS items, so re-running creates
// duplicates rather than overwriting. Check the Menu tab first if unsure.

const baseUrl = process.argv[2];
if (!baseUrl) {
  console.error('Usage: node scripts/seed-menu.mjs https://your-app.vercel.app');
  process.exit(1);
}

const items = [
  { name: 'Texas Chicken Steak Burger', category: 'Burgers', price: 350 },
  { name: 'Pepper Garlic Chicken Steak Burger', category: 'Burgers', price: 350 },
  { name: 'Peri Peri Chicken Steak Burger', category: 'Burgers', price: 350 },
  { name: 'BBQ Mixed Veg Burger', category: 'Burgers', price: 300 },
  { name: 'Texas Wings', category: 'Wings', price: 250 },
  { name: 'Peri Peri Wings', category: 'Wings', price: 250 },
  { name: 'BBQ Spicy Wings', category: 'Wings', price: 250 },
  { name: 'BBQ Chicken Boneless', category: 'Wings', price: 350 },
  { name: 'BBQ Veg Loaded Fries', category: 'Sides', price: 300 },
  { name: 'BBQ Chicken Loaded Fries', category: 'Sides', price: 350 },
  { name: 'BBQ Chicken & Nachos', category: 'Sides', price: 350 },
  { name: 'BBQ Veg & Nachos', category: 'Sides', price: 300 }
];

async function main() {
  for (const item of items) {
    const res = await fetch(baseUrl.replace(/\/+$/, '') + '/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (res.ok) {
      console.log('Added:', item.name);
    } else {
      const body = await res.text();
      console.error('Failed:', item.name, res.status, body);
    }
  }
  console.log('Done. Check the Menu tab on your deployed app.');
}

main();
