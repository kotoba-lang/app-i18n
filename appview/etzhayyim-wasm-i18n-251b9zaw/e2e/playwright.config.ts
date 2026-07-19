import { defineConfig } from '@playwright/test';

const BASE_URL = process.env.I18N_BASE_URL ?? 'https://i18n.etzhayyim.com';

export default defineConfig({
	testDir: './tests',
	timeout: 30_000,
	retries: 1,
	use: {
		baseURL: BASE_URL,
		headless: true,
		trace: 'on-first-retry',
	},
	projects: [
		{ name: 'chromium', use: { browserName: 'chromium' } },
	],
});
