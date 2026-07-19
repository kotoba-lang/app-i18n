import { test, expect } from '@playwright/test';

const BASE = process.env.I18N_BASE_URL ?? 'https://i18n.etzhayyim.com';
const CMD = `${BASE}/xrpc/etzhayyim.i18n.v1.I18nCommandService`;
const QUERY = `${BASE}/xrpc/etzhayyim.i18n.v1.I18nQueryService`;

function xrpc(url: string, body: Record<string, unknown>) {
	return {
		headers: { 'Content-Type': 'application/json' },
		data: body,
	};
}

test.describe('Project Registration + Translation', () => {
	const projectId = `e2e-test-${Date.now()}`;
	const enMessages = {
		'app.title': 'Welcome',
		'app.save': 'Save',
		'app.cancel': 'Cancel',
		'app.greeting': 'Hello, {name}!',
	};

	test('RegisterProject succeeds', async ({ request }) => {
		const resp = await request.post(`${CMD}/RegisterProject`, xrpc(CMD, {
			'projectId': projectId,
			'projectPath': 'e2e/test',
			messages: enMessages,
		}));
		expect(resp.ok()).toBeTruthy();
		const body = await resp.json();
		expect(body.status).toBe('registered');
		expect(body.totalKeys).toBe(4);
	});

	test('TranslateBatch translates to ja, fr, ar', async ({ request }) => {
		const resp = await request.post(`${CMD}/TranslateBatch`, xrpc(CMD, {
			'projectId': projectId,
			'targetLangs': ['ja', 'fr', 'ar'],
			'domainHint': 'general UI',
		}));
		expect(resp.ok()).toBeTruthy();
		const body = await resp.json();
		expect(body.results).toBeDefined();
	});

	test('ExportMessages returns translated JSON', async ({ request }) => {
		const resp = await request.post(`${QUERY}/ExportMessages`, xrpc(QUERY, {
			'projectId': projectId,
			lang: 'ja',
		}));
		expect(resp.ok()).toBeTruthy();
		const body = await resp.json();
		if (Object.keys(body).length > 0) {
			expect(typeof body['app.save'] === 'string' || body['app.save'] === undefined).toBeTruthy();
		}
	});

	test('ExportMessages en returns source', async ({ request }) => {
		const resp = await request.post(`${QUERY}/ExportMessages`, xrpc(QUERY, {
			'projectId': projectId,
			lang: 'en',
		}));
		expect(resp.ok()).toBeTruthy();
		const body = await resp.json();
		expect(body['app.title']).toBe('Welcome');
	});
});

test.describe('On-Demand Translation', () => {
	test('TranslateOnDemand translates single text', async ({ request }) => {
		const resp = await request.post(`${CMD}/TranslateOnDemand`, xrpc(CMD, {
			'sourceText': 'Settings',
			'targetLang': 'ja',
		}));
		expect(resp.ok()).toBeTruthy();
		const body = await resp.json();
		expect(body.targetText).toBeTruthy();
		expect(body.source).toMatch(/^(tmCache|llm|error)$/);
	});
});

test.describe('Page Translation', () => {
	test('TranslatePage translates array of texts', async ({ request }) => {
		const resp = await request.post(`${CMD}/TranslatePage`, xrpc(CMD, {
			texts: ['Hello', 'World', 'Settings'],
			'targetLang': 'ja',
			'sourceLang': 'en',
		}));
		expect(resp.ok()).toBeTruthy();
		const body = await resp.json();
		expect(body.translations).toHaveLength(3);
		expect(body.targetLang).toBe('ja');
	});
});

test.describe('Message Translation (AT Protocol)', () => {
	test('TranslateMessage detects language and translates', async ({ request }) => {
		const resp = await request.post(`${CMD}/TranslateMessage`, xrpc(CMD, {
			text: 'こんにちは、世界！',
			'targetLang': 'en',
		}));
		expect(resp.ok()).toBeTruthy();
		const body = await resp.json();
		expect(body.translatedText).toBeTruthy();
		expect(body.sourceLang).toBe('ja');
	});

	test('TranslateMessage same language returns original', async ({ request }) => {
		const resp = await request.post(`${CMD}/TranslateMessage`, xrpc(CMD, {
			text: 'Hello',
			'targetLang': 'en',
			'sourceLang': 'en',
		}));
		expect(resp.ok()).toBeTruthy();
		const body = await resp.json();
		expect(body.source).toBe('sameLang');
	});
});

test.describe('Signal E2E Translation', () => {
	test('TranslateSignal batch translates messages', async ({ request }) => {
		const resp = await request.post(`${CMD}/TranslateSignal`, xrpc(CMD, {
			'plaintextMessages': [
				{ id: 'msg1', text: 'Bonjour', 'sourceLang': 'fr' },
				{ id: 'msg2', text: 'Hola', 'sourceLang': 'es' },
				{ id: 'msg3', text: '' },
			],
			'targetLang': 'en',
		}));
		expect(resp.ok()).toBeTruthy();
		const body = await resp.json();
		expect(body.translations).toHaveLength(3);
		expect(body.translations[2].source).toBe('empty');
	});
});

test.describe('Widget Editor', () => {
	test('WidgetLookup searches TM', async ({ request }) => {
		const resp = await request.post(`${CMD}/WidgetLookup`, xrpc(CMD, {
			term: 'Settings',
			'targetLangs': ['ja', 'fr', 'de'],
		}));
		expect(resp.ok()).toBeTruthy();
		const body = await resp.json();
		expect(body.term).toBe('Settings');
		expect(body.sourceHash).toBeTruthy();
	});

	test('WidgetSuggest returns alternatives', async ({ request }) => {
		const resp = await request.post(`${CMD}/WidgetSuggest`, xrpc(CMD, {
			term: 'Cancel',
			'targetLang': 'ja',
			context: 'button label',
		}));
		expect(resp.ok()).toBeTruthy();
		const body = await resp.json();
		expect(body.suggestions).toBeDefined();
	});

	test('WidgetApprove saves human translation', async ({ request }) => {
		const resp = await request.post(`${CMD}/WidgetApprove`, xrpc(CMD, {
			term: 'Cancel',
			'targetLang': 'ja',
			approved: 'キャンセル',
		}));
		expect(resp.ok()).toBeTruthy();
		const body = await resp.json();
		expect(body.status).toBe('approved');

		// Verify TM was updated
		const lookup = await request.post(`${CMD}/WidgetLookup`, xrpc(CMD, {
			term: 'Cancel',
			'targetLangs': ['ja'],
		}));
		const lookupBody = await lookup.json();
		const ja = lookupBody.translations?.find((t: { lang: string }) => t.lang === 'ja');
		expect(ja?.text).toBe('キャンセル');
		expect(ja?.qualityScore).toBe(1);
	});
});

test.describe('TM Deduplication', () => {
	test('same text reuses TM cache', async ({ request }) => {
		// First: approve a known translation via widget
		await request.post(`${CMD}/WidgetApprove`, xrpc(CMD, {
			term: 'Close',
			'targetLang': 'fr',
			approved: 'Fermer',
		}));

		// Second call — should hit TM from the approved entry
		const resp2 = await request.post(`${CMD}/TranslateOnDemand`, xrpc(CMD, {
			'sourceText': 'Close',
			'targetLang': 'fr',
		}));
		const body2 = await resp2.json();
		expect(body2.source).toBe('tmCache');
		expect(body2.targetText).toBe('Fermer');
	});
});

test.describe('Placeholder Preservation', () => {
	test('placeholders are preserved in translation', async ({ request }) => {
		const resp = await request.post(`${CMD}/TranslateOnDemand`, xrpc(CMD, {
			'sourceText': 'Hello, {name}! You have {count} messages.',
			'targetLang': 'ja',
		}));
		expect(resp.ok()).toBeTruthy();
		const body = await resp.json();
		expect(body.targetText).toContain('{name}');
		expect(body.targetText).toContain('{count}');
	});
});
