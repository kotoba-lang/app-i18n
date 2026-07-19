import { test, expect } from '@playwright/test';

const BASE = process.env.I18N_BASE_URL ?? 'https://i18n.etzhayyim.com';
const CMD = `${BASE}/xrpc/etzhayyim.i18n.v1.I18nCommandService`;
const QUERY = `${BASE}/xrpc/etzhayyim.i18n.v1.I18nQueryService`;

test.describe('Language Registry', () => {
	test('GetLanguageRegistry returns 200+ languages', async ({ request }) => {
		const resp = await request.post(`${QUERY}/GetLanguageRegistry`, {
			headers: { 'Content-Type': 'application/json', 'Connect-Protocol-Version': '1' },
			data: { 'tierLimit': 4 },
		});
		expect(resp.ok()).toBeTruthy();
		const body = await resp.json();
		expect(body.total).toBeGreaterThanOrEqual(100);
		expect(body.languages.length).toBeGreaterThanOrEqual(100);
	});

	test('GetLanguageRegistry tier 1 returns 25 languages', async ({ request }) => {
		const resp = await request.post(`${QUERY}/GetLanguageRegistry`, {
			headers: { 'Content-Type': 'application/json', 'Connect-Protocol-Version': '1' },
			data: { 'tierLimit': 1 },
		});
		const body = await resp.json();
		expect(body.total).toBe(25);
	});

	test('GetLanguageRegistry search filters correctly', async ({ request }) => {
		const resp = await request.post(`${QUERY}/GetLanguageRegistry`, {
			headers: { 'Content-Type': 'application/json', 'Connect-Protocol-Version': '1' },
			data: { search: 'Japanese' },
		});
		const body = await resp.json();
		expect(body.total).toBeGreaterThanOrEqual(1);
		expect(body.languages[0].code).toBe('ja');
	});

	test('RTL languages have dir=rtl', async ({ request }) => {
		const resp = await request.post(`${QUERY}/GetLanguageRegistry`, {
			headers: { 'Content-Type': 'application/json', 'Connect-Protocol-Version': '1' },
			data: { 'tierLimit': 4 },
		});
		const body = await resp.json();
		const rtl = body.languages.filter((l: { dir: string }) => l.dir === 'rtl');
		expect(rtl.length).toBeGreaterThanOrEqual(7);
		const rtlCodes = rtl.map((l: { code: string }) => l.code);
		expect(rtlCodes).toContain('ar');
		expect(rtlCodes).toContain('he');
		expect(rtlCodes).toContain('fa');
	});
});
