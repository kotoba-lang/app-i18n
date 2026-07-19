import { test, expect } from '@playwright/test';

const BASE = process.env.I18N_BASE_URL ?? 'https://i18n.etzhayyim.com';

test.describe('i18n App Health', () => {
	test('GET /health returns ok', async ({ request }) => {
		const resp = await request.get(`${BASE}/health`);
		expect(resp.ok()).toBeTruthy();
		const body = await resp.json();
		expect(body.status).toBe('ok');
	});

	test('GET /readyz returns ok', async ({ request }) => {
		const resp = await request.get(`${BASE}/readyz`);
		expect(resp.ok()).toBeTruthy();
	});
});
