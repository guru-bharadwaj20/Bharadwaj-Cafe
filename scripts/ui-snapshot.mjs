/**
 * Visual-regression harness for the Tailwind migration.
 *
 * `node _uisnap.mjs baseline` captures the pre-migration look.
 * `node _uisnap.mjs after`    captures it again afterwards.
 * `node _uisnap.mjs diff`     reports per-page pixel deltas between the two.
 *
* Run `npm run ui:baseline` before a batch of changes, `npm run ui:after`
 * afterwards, then `npm run ui:diff`. Both servers must be running.
 */
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import fs from 'fs';
import path from 'path';

const MODE = process.argv[2] ?? 'baseline';
const ROOT = process.argv[3] ?? '.uisnap';
const APP = 'http://localhost:5173';
const API = 'http://localhost:5000/api';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

/**
 * Reveals UI that only exists after a click.
 *
 * The checkout form and the address form are behind buttons, so a plain
 * navigation captures the collapsed page and proves nothing about either. The
 * site header is fixed and swallows ordinary clicks, hence dispatchEvent.
 */
const expandCheckout = async (page) => {
  await page.locator('button:has-text("Proceed to Pay")').first().dispatchEvent('click');
  await page.waitForTimeout(700);
  await page.locator('#orderType').selectOption('delivery');
  // Typed values, so text/background contrast is captured rather than assumed.
  await page.fill('#customerPhone', '9876543210');
  await page.fill('#deliveryAddress', '12 MG Road, Bengaluru');
  await page.fill('#specialInstructions', 'Less sugar');
};

const expandAddressForm = async (page) => {
  await page.locator('button:has-text("Add New Address")').first().dispatchEvent('click');
  await page.waitForTimeout(700);
};

// Every route worth protecting, with whether it needs a signed-in user and an
// optional step to run before the screenshot.
const ROUTES = [
  ['landing', '/', false],
  ['login', '/login', false],
  ['register', '/register', false],
  ['forgot-password', '/forgot-password', false],
  ['home', '/home', true],
  ['about', '/about', true],
  ['order', '/order', true],
  ['merchandise', '/merchandise', true],
  ['contact', '/contact', true],
  ['cart', '/cart', true],
  ['cart-checkout', '/cart', true, expandCheckout],
  ['profile', '/profile', true],
  ['order-history', '/order-history', true],
  ['wishlist', '/wishlist', true],
  ['addresses', '/addresses', true],
  ['addresses-form', '/addresses', true, expandAddressForm],
  ['loyalty', '/loyalty', true],
  ['blog', '/blog', true],
];

const dir = (...p) => path.join(ROOT, ...p);
const ensure = (d) => fs.mkdirSync(d, { recursive: true });

/** Registers a throwaway customer and returns the session the app stores. */
const makeSession = async () => {
  const email = `uisnap${Date.now()}@example.com`;
  const password = 'password123';

  await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'UI Snapshot', email, password }),
  });

  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
};

/** Two real menu items, so the cart page has something in it to render. */
const sampleCart = async () => {
  const menu = await (await fetch(`${API}/menu`)).json();
  return menu.slice(0, 2).map((item, i) => ({ ...item, quantity: i + 1 }));
};

/**
 * Puts a couple of items on the wishlist.
 *
 * Without this the wishlist route only ever renders its empty state, so the
 * card, the remove button and the add-to-cart button go unchecked — which is
 * most of the page.
 */
const seedWishlist = async (token) => {
  const menu = await (await fetch(`${API}/menu`)).json();
  for (const item of menu.slice(0, 2)) {
    await fetch(`${API}/wishlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ menuItemId: item._id }),
    });
  }
};

/**
 * Saves two addresses, one of them the default.
 *
 * Without this the addresses route only renders "No saved addresses yet", so
 * the card, the default badge, the label row and the three action buttons —
 * most of the page — go unchecked. Two of them, because the default badge and
 * the "Set as Default" button only appear when there is something to compare.
 */
const seedAddresses = async (token) => {
  const base = {
    fullName: 'UI Snapshot',
    phone: '9876543210',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
  };
  const addresses = [
    {
      ...base,
      label: 'Home',
      addressLine1: '581, MG Road',
      landmark: 'Opposite the park',
      isDefault: true,
    },
    { ...base, label: 'Work', addressLine1: '12 Residency Road', addressLine2: 'Level 4' },
  ];
  for (const address of addresses) {
    await fetch(`${API}/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(address),
    });
  }
};

const capture = async () => {
  const outDir = dir(MODE);
  ensure(outDir);

  const session = await makeSession();
  const cart = await sampleCart();
  await seedWishlist(session.token);
  await seedAddresses(session.token);
  const browser = await chromium.launch();
  const problems = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });

    // Seed auth + cart before any app code runs, so protected routes render
    // on first paint instead of redirecting to /login.
    await context.addInitScript(
      ([s, c]) => {
        localStorage.setItem('userInfo', JSON.stringify(s));
        localStorage.setItem('token', s.token);
        localStorage.setItem('cart', JSON.stringify(c));
      },
      [session, cart]
    );

    const page = await context.newPage();
    page.on('pageerror', (e) => problems.push(`${vp.name} pageerror: ${e.message}`));

    for (const [name, route, , expand] of ROUTES) {
      try {
        await page.goto(`${APP}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
        // Settle animations and any post-mount fetches.
        await page.waitForTimeout(1400);
        if (expand) {
          await expand(page);
          await page.waitForTimeout(600);
        }
        await page.evaluate(() => window.scrollTo(0, 0));

        // Two sources of false positives, both measured: capturing before the
        // webfonts land shifts every glyph a pixel or two and lights up the
        // whole page, and a field left focused blinks a caret that lands in
        // roughly half the screenshots.
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => document.activeElement?.blur());
        await page.waitForTimeout(150);
        await page.screenshot({
          path: path.join(outDir, `${name}-${vp.name}.png`),
          fullPage: true,
        });
        process.stdout.write(`  ${name}-${vp.name}\n`);
      } catch (err) {
        problems.push(`${name}-${vp.name}: ${err.message}`);
      }
    }
    await context.close();
  }

  await browser.close();
  console.log(`\ncaptured into ${outDir}`);
  if (problems.length) console.log('problems:\n' + problems.join('\n'));
};

const diff = () => {
  const a = dir('baseline');
  const b = dir('after');
  const outDir = dir('diff');
  ensure(outDir);

  const files = fs.readdirSync(a).filter((f) => f.endsWith('.png'));
  const rows = [];

  for (const file of files) {
    const bp = path.join(b, file);
    if (!fs.existsSync(bp)) {
      rows.push({ file, status: 'MISSING AFTER', pct: null });
      continue;
    }

    const img1 = PNG.sync.read(fs.readFileSync(path.join(a, file)));
    const img2 = PNG.sync.read(fs.readFileSync(bp));

    if (img1.width !== img2.width || img1.height !== img2.height) {
      rows.push({
        file,
        status: `SIZE ${img1.width}x${img1.height} -> ${img2.width}x${img2.height}`,
        pct: null,
      });
      continue;
    }

    const out = new PNG({ width: img1.width, height: img1.height });
    const changed = pixelmatch(img1.data, img2.data, out.data, img1.width, img1.height, {
      threshold: 0.12,
    });
    const pct = (changed / (img1.width * img1.height)) * 100;
    if (pct > 0.05) fs.writeFileSync(path.join(outDir, file), PNG.sync.write(out));
    rows.push({ file, status: 'ok', pct });
  }

  rows.sort((x, y) => (y.pct ?? 999) - (x.pct ?? 999));
  console.log('\npage'.padEnd(36) + 'changed');
  console.log('-'.repeat(52));
  for (const r of rows) {
    const val = r.pct === null ? r.status : `${r.pct.toFixed(2)}%`;
    console.log(r.file.padEnd(36) + val);
  }
};

if (MODE === 'diff') diff();
else await capture();
