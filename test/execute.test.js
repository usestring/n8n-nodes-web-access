const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');

const dist = path.join(__dirname, '..', 'dist');
const { StringWebAccess } = require(path.join(dist, 'nodes/StringWebAccess/StringWebAccess.node.js'));

const BASE = 'https://request.usestring.ai/v1';

function context(parameters, respond, { continueOnFail = false } = {}) {
	const requests = [];
	const ctx = {
		getInputData: () => [{ json: {} }],
		getNode: () => ({
			id: 'node-1',
			name: 'String Web Access',
			type: 'stringWebAccess',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		getNodeParameter: (name, _itemIndex, fallback) => {
			if (name in parameters) return parameters[name];
			if (fallback !== undefined) return fallback;
			throw new Error(`unexpected parameter ${name}`);
		},
		continueOnFail: () => continueOnFail,
		helpers: {
			httpRequestWithAuthentication: async (credential, options) => {
				requests.push({ credential, ...options });
				return respond(options);
			},
		},
	};
	return { ctx, requests };
}

const run = async (ctx) => (await new StringWebAccess().execute.call(ctx))[0];

test('Page → Fetch posts the URL and options and shapes the Markdown reply', async () => {
	const { ctx, requests } = context(
		{
			resource: 'page',
			operation: 'fetch',
			url: 'https://example.com/a',
			format: 'markdown',
			options: { countryCode: 'US', mainContentOnly: true },
		},
		() => ({ body: '# A', headers: { 'x-status-code': '200' }, statusCode: 200 }),
	);

	const items = await run(ctx);

	assert.equal(requests.length, 1);
	assert.equal(requests[0].credential, 'stringWebAccessApi');
	assert.equal(requests[0].method, 'POST');
	assert.equal(requests[0].url, `${BASE}/fetch`);
	assert.equal(requests[0].json, false);
	assert.deepEqual(requests[0].body, {
		url: 'https://example.com/a',
		format: 'markdown',
		countryCode: 'US',
		mainContentOnly: true,
	});
	assert.deepEqual(items, [{ json: { statusCode: 200, markdown: '# A' }, pairedItem: { item: 0 } }]);
});

test('Page → Fetch refuses rendering JavaScript together with custom headers', async () => {
	const { ctx, requests } = context(
		{
			resource: 'page',
			operation: 'fetch',
			url: 'https://example.com',
			format: 'markdown',
			options: { executeJS: true, headers: { header: [{ name: 'Accept', value: 'text/html' }] } },
		},
		() => assert.fail('no request expected'),
	);

	await assert.rejects(run(ctx), /'Render JavaScript' and 'Custom Headers' cannot be used together/);
	assert.equal(requests.length, 0);
});

test('Page → Send Request sends the method and body and returns the JSON envelope', async () => {
	const envelope = { statusCode: 201, headers: {}, data: { id: 7 } };
	const { ctx, requests } = context(
		{
			resource: 'page',
			operation: 'sendRequest',
			url: 'https://example.com/api',
			method: 'PUT',
			body: '{"a":1}',
			format: 'json',
			options: {},
		},
		() => ({ body: envelope, headers: {}, statusCode: 200 }),
	);

	const items = await run(ctx);

	assert.equal(requests[0].json, true);
	assert.deepEqual(requests[0].body, {
		url: 'https://example.com/api',
		method: 'PUT',
		format: 'json',
		body: '{"a":1}',
	});
	assert.deepEqual(items, [{ json: envelope, pairedItem: { item: 0 } }]);
});

test('Web → Search emits one item per result up to the limit when simplified', async () => {
	const { ctx, requests } = context(
		{
			resource: 'web',
			operation: 'search',
			query: 'n8n',
			simple: true,
			options: { engine: 'brave', country: '', limit: 2 },
		},
		() => ({ body: { results: [{ url: 'a' }, { url: 'b' }, { url: 'c' }] }, headers: {}, statusCode: 200 }),
	);

	const items = await run(ctx);

	assert.equal(requests[0].url, `${BASE}/search`);
	assert.deepEqual(requests[0].body, { query: 'n8n', engine: 'brave' });
	assert.deepEqual(
		items.map((i) => i.json.url),
		['a', 'b'],
	);
});

test('Web → Search returns the whole response when not simplified', async () => {
	const payload = { results: [{ url: 'a' }], related: ['x'] };
	const { ctx } = context(
		{ resource: 'web', operation: 'search', query: 'n8n', simple: false, options: {} },
		() => ({ body: payload, headers: {}, statusCode: 200 }),
	);

	assert.deepEqual(await run(ctx), [{ json: payload, pairedItem: { item: 0 } }]);
});

test('Site → Map returns the quote without approving it when Start Crawl is off', async () => {
	const quote = { jobId: 'j1', status: 'awaiting_approval', estimatedPages: 4 };
	const { ctx, requests } = context(
		{
			resource: 'site',
			operation: 'map',
			url: 'https://example.com',
			maxPages: 4,
			approve: false,
			options: { pathPrefix: '/docs' },
		},
		() => ({ body: quote, headers: {}, statusCode: 200 }),
	);

	const items = await run(ctx);

	assert.equal(requests.length, 1);
	assert.deepEqual(requests[0].body, { url: 'https://example.com', maxPages: 4, pathPrefix: '/docs' });
	assert.deepEqual(items, [{ json: quote, pairedItem: { item: 0 } }]);
});

test('Site → Map approves the quote and returns the job when not waiting', async () => {
	const { ctx, requests } = context(
		{
			resource: 'site',
			operation: 'map',
			url: 'https://example.com',
			maxPages: 10,
			approve: true,
			waitForCompletion: false,
			options: {},
		},
		(options) =>
			options.url.endsWith('/approve')
				? { body: { jobId: 'j1', status: 'running' }, headers: {}, statusCode: 200 }
				: { body: { jobId: 'j1', status: 'awaiting_approval' }, headers: {}, statusCode: 200 },
	);

	const items = await run(ctx);

	assert.deepEqual(
		requests.map((r) => `${r.method} ${r.url}`),
		[`POST ${BASE}/sitemap`, `POST ${BASE}/sitemap/j1/approve`],
	);
	assert.deepEqual(items, [{ json: { jobId: 'j1', status: 'running' }, pairedItem: { item: 0 } }]);
});

test('an unsupported resource and operation pair is reported against its item', async () => {
	const { ctx } = context({ resource: 'page', operation: 'delete' }, () => assert.fail('no request expected'));

	await assert.rejects(run(ctx), /This node cannot run 'delete' on a page/);
});

test('Continue On Fail turns a failed item into an error item', async () => {
	const { ctx } = context(
		{
			resource: 'page',
			operation: 'fetch',
			url: 'https://example.com',
			format: 'markdown',
			options: { executeJS: true, headers: { header: [{ name: 'Accept', value: 'text/html' }] } },
		},
		() => assert.fail('no request expected'),
		{ continueOnFail: true },
	);

	const items = await run(ctx);

	assert.equal(items.length, 1);
	assert.match(items[0].json.error, /cannot be used together/);
	assert.deepEqual(items[0].pairedItem, { item: 0 });
});

test("an API key n8n's request helper rejects is explained, not reported as a bare 401", async () => {
	const { NodeApiError } = require('n8n-workflow');
	const { ctx } = context({ resource: 'web', operation: 'search', query: 'n8n', simple: true, options: {} }, () => {
		throw new NodeApiError(ctx.getNode(), { message: 'Request failed with status code 401', httpCode: '401' });
	});

	await assert.rejects(run(ctx), (error) => {
		assert.equal(error.message, 'String Web Access did not accept the API key');
		assert.match(error.description, /check the 'API Key' value/);
		return true;
	});
});

test('a rate-limited request is explained when the helper throws the raw HTTP error', async () => {
	const { ctx } = context({ resource: 'web', operation: 'search', query: 'n8n', simple: true, options: {} }, () => {
		const error = new Error('Request failed with status code 429');
		error.response = { status: 429, data: {} };
		throw error;
	});

	await assert.rejects(run(ctx), (error) => {
		assert.equal(error.message, 'String Web Access rate limit reached');
		return true;
	});
});
