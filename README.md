# Smoke Signal BBQ — Order System (Vercel build)

Order-taking + kitchen dashboard for the Smoke Signal BBQ stall, built to run
on your own Vercel account instead of inside Claude.

- **Order** — menu grid, cart, checkout.
- **Kitchen** — live board: Placed → Cooking → Delivered, plus a cancelled log.
- **Menu** — add, edit, price, or 86 (sold-out) any item — no code needed.
- **History** — every order, searchable, with totals and a CSV export.

Every screen talks to the same small backend, so an order placed on one
phone shows up on every other phone/tablet within a few seconds.

## How this differs from the Claude version

The Claude.ai artifact used Claude's built-in live database. Outside
Claude there's no such thing, so this build uses a tiny serverless API
(in `/api`) backed by **Upstash Redis** (a free-tier friendly database
available right from the Vercel dashboard). Two practical differences:

- **Polling, not push.** The app re-checks the server every 3–5 seconds
  instead of getting instant pushes. For a food counter this is not
  noticeable, but it isn't quite real-time.
- **No access control.** Anyone with the link can place orders, edit the
  menu, and change order status — there's no login. That's fine for a
  one-day event on a link you only share with your own team; don't make
  the URL public.

## 1. Get the code onto GitHub (or skip and use the CLI — step 3)

Create a new GitHub repo and push this folder to it, or use the Vercel CLI
directly from this folder without GitHub at all:

```bash
npm install -g vercel
vercel
```

## 2. Add a Redis database

1. Go to your project on [vercel.com](https://vercel.com) → **Storage** tab.
2. Click **Create Database** → choose **Upstash** → **Redis**.
3. Connect it to this project. Vercel adds the `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN` environment variables automatically.
   (If your dashboard instead shows a generic "Marketplace" flow, search
   the storage marketplace for **Upstash** and connect a Redis database
   the same way — the env var names are what matter, and the app reads
   exactly those two.)

If you'd rather set it up yourself: create a free database at
[upstash.com](https://upstash.com), then add `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` (from the Upstash console) as Environment
Variables on your Vercel project (Settings → Environment Variables).

## 3. Deploy

From this folder:

```bash
vercel --prod
```

(Or just connect the GitHub repo in the Vercel dashboard — every push
redeploys automatically.)

## 4. Load your menu

Your database starts empty. Either:

- Open the deployed app → **Menu** tab → **+ Add item**, and type in your
  12 items, or
- Run the seed script once from your computer (fills in the same menu
  that was in the Claude version — Texas/Peri Peri/Pepper Garlic burgers,
  four wings, four loaded fries/nachos):

  ```bash
  node scripts/seed-menu.mjs https://your-app.vercel.app
  ```

  Re-running it adds duplicates rather than overwriting, so only run it
  once (or clear the menu in the Menu tab first).

## Local development

```bash
npm install
vercel dev
```

`vercel dev` reads `.env.local` for the two Upstash variables — copy
`.env.example` to `.env.local` and fill them in first.

## Project layout

```
index.html            the whole app: order page, kitchen board, menu, history
manifest.json          PWA manifest — lets phones "install" it to the home screen
sw.js                   minimal offline shell (never caches live order/menu data)
icon-*.png, apple-touch-icon.png, favicon-32.png   your logo, cropped from the menu photo
api/menu.js             GET list / POST create a menu item
api/menu/[id].js        PATCH update / DELETE a menu item
api/orders.js           GET list / POST place an order (assigns the order number)
api/orders/[id].js      PATCH change an order's status
scripts/seed-menu.mjs   optional one-time helper to load your real menu
```

## Notes

- **Order numbers** are assigned by an atomic counter in Redis (`INCR`), so
  two staff placing orders at the same instant can never get the same
  number.
- **CSV export** (History tab) downloads straight from the browser — no
  server involved.
- The cart in progress is saved to that device's `localStorage` only, so a
  half-finished order survives an accidental refresh but isn't shared
  across devices (as intended — only *placed* orders are shared).
- Want real-time push instead of polling later? Swap the `/api` handlers
  for a small WebSocket/SSE service, or add Pusher/Ably — the frontend's
  `refreshMenu()` / `refreshOrders()` functions are the only place that
  would need to change.
