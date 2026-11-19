import { test, expect } from '@playwright/test';
for (const role of ['buyer', 'seller']) {
  test(`${role} signup saves selected role and opens the correct screen`, async ({ page }) => {
    let account = null;
    await page.route(/^https:\/\/(images\.unsplash\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//, route => route.abort());
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/user/register') {
        const body = route.request().postDataJSON(); expect(body.role).toBe(role);
        account = { name: body.name, email: body.email, role: body.role };
        return route.fulfill({ json: { success: true, user: account } });
      }
      if (path === '/api/user/is-Auth') return route.fulfill({ status: account ? 200 : 401, json: { success: !!account, user: account } });
      if (path === '/api/seller/is-Auth') return route.fulfill({ status: account?.role === 'seller' ? 200 : 403, json: { success: account?.role === 'seller', seller: account } });
      await route.fulfill({ json: { success: true, products: [], orders: [], cartItems: [] } });
    });
    await page.goto('/?signup=1');
    await page.getByLabel('Account role').selectOption(role);
    await page.getByLabel('Your name').fill('Test Account');
    await page.getByLabel('Email address').fill('account@example.test');
    await page.getByLabel('Password', { exact: true }).fill('test-password');
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    if (role === 'seller') {
      await expect(page).toHaveURL(/\/seller$/);
      await expect(page.getByRole('heading', { name: 'Seller dashboard' })).toBeVisible();
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Seller dashboard' })).toBeVisible();
    } else {
      await expect(page.getByRole('button', { name: 'My account', exact: true })).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(new URL(page.url()).pathname).toBe('/');
    }
  });
}
