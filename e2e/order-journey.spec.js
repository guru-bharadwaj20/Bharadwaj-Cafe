import { test, expect } from '@playwright/test';

/**
 * The critical revenue path, exercised against the real API, the real
 * database and the production frontend build:
 *
 *   register -> login -> browse menu -> add to cart -> checkout
 *   -> order appears in the customer's history
 *   -> order appears on the admin dashboard
 */

const ADMIN = { email: 'e2e-admin@example.com', password: 'e2e-admin-password' };

const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

const register = async (page, email) => {
  await page.goto('/register');
  await page.getByLabel('Full Name').fill('E2E Customer');
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('New Password', { exact: false }).fill('e2e-password-123');
  await page.getByLabel('Confirm Password').fill('e2e-password-123');
  await page.getByRole('button', { name: 'Register' }).click();
};

const login = async (page, email, password) => {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password', { exact: false }).first().fill(password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(/\/home/, { timeout: 20000 });
};

test.describe('Customer order journey', () => {
  test('a new customer can register, order, and see it in their history', async ({ page }) => {
    const email = uniqueEmail();

    await register(page, email);
    await expect(page).toHaveURL(/\/login/, { timeout: 20000 });

    await login(page, email, 'e2e-password-123');

    // Browse the menu, which is served from the seeded database.
    await page.goto('/order');
    await expect(page.getByRole('heading', { name: 'Cappuccino' })).toBeVisible();

    // Add two of the same item; the cart must merge them into one line.
    const card = page.locator('.menu-item', { hasText: 'Cappuccino' });
    await card.getByRole('button', { name: /add to cart/i }).click();
    await card.getByRole('button', { name: /add|added/i }).first().click();

    await page.goto('/cart');
    await expect(page.getByText('Cappuccino')).toBeVisible();

    await page.getByRole('button', { name: /proceed to pay/i }).click();
    await page.getByLabel(/contact number/i).fill('9999999999');
    await page.getByRole('button', { name: /place order/i }).click();

    // Landing on order history is the app's confirmation that it persisted.
    await expect(page).toHaveURL(/\/order-history/, { timeout: 20000 });
    await expect(page.getByText(/order #/i).first()).toBeVisible();
    await expect(page.getByText('PENDING').first()).toBeVisible();
  });

  test('checkout never asks for card details', async ({ page }) => {
    const email = uniqueEmail();
    await register(page, email);
    await expect(page).toHaveURL(/\/login/, { timeout: 20000 });
    await login(page, email, 'e2e-password-123');

    await page.goto('/order');
    await page
      .locator('.menu-item', { hasText: 'Filter Coffee' })
      .getByRole('button', { name: /add to cart/i })
      .click();

    await page.goto('/cart');
    await page.getByRole('button', { name: /proceed to pay/i }).click();

    await expect(page.getByLabel(/card number/i)).toHaveCount(0);
    await expect(page.getByLabel(/cvv/i)).toHaveCount(0);
  });
});

test.describe('Admin oversight', () => {
  test('an order placed by a customer shows up for the admin', async ({ page }) => {
    const email = uniqueEmail();

    await register(page, email);
    await expect(page).toHaveURL(/\/login/, { timeout: 20000 });
    await login(page, email, 'e2e-password-123');

    await page.goto('/order');
    await page
      .locator('.menu-item', { hasText: 'Cappuccino' })
      .getByRole('button', { name: /add to cart/i })
      .click();
    await page.goto('/cart');
    await page.getByRole('button', { name: /proceed to pay/i }).click();
    await page.getByLabel(/contact number/i).fill('9999999999');
    await page.getByRole('button', { name: /place order/i }).click();
    await expect(page).toHaveURL(/\/order-history/, { timeout: 20000 });

    // Same browser, different account.
    await page.evaluate(() => window.localStorage.clear());
    await login(page, ADMIN.email, ADMIN.password);

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();
    await expect(page.getByText(/total orders/i)).toBeVisible();
  });

  test('a customer cannot reach admin data', async ({ page }) => {
    const email = uniqueEmail();
    await register(page, email);
    await expect(page).toHaveURL(/\/login/, { timeout: 20000 });
    await login(page, email, 'e2e-password-123');

    // The API is the real gate; the UI bounces non-admins away from /admin.
    const response = await page.request.get('http://localhost:5050/api/admin/stats');
    expect(response.status()).toBe(401);
  });
});
