import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import {
	approveSitemapJob,
	collectSitemapUrls,
	isTerminal,
	stringApiRequest,
	waitForSitemapJob,
	type SitemapJob,
} from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. https://example.com',
		description: 'Where the crawl starts. It stays on this hostname.',
	},
	{
		displayName: 'Max Pages',
		name: 'maxPages',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 10000 },
		default: 10,
		description: 'Most pages the crawl may retrieve. Every page retrieved is billed.',
	},
	{
		displayName: 'Start Crawl',
		name: 'approve',
		type: 'boolean',
		default: true,
		description:
			'Whether to accept the quote and run the crawl. Turn this off to return the quoted page count and cost without retrieving anything.',
	},
	{
		displayName: 'Wait for Completion',
		name: 'waitForCompletion',
		type: 'boolean',
		default: true,
		description:
			'Whether to wait for the crawl to finish and return the URLs it found. Turn this off to return the job straight away and collect the URLs in a later step.',
		displayOptions: { show: { approve: [true] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Budget (USD)',
				name: 'budgetUsd',
				type: 'number',
				typeOptions: { minValue: 0.0001, numberPrecision: 4 },
				default: 0.05,
				description:
					'Spend ceiling for this crawl. It stops early rather than pass this, and the pages it already found stay readable.',
			},
			{
				displayName: 'Max Depth',
				name: 'maxDepth',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 2,
				description: 'How many links away from the starting URL the crawl may go',
			},
			{
				displayName: 'Max Wait Time (Seconds)',
				name: 'maxWaitSeconds',
				type: 'number',
				typeOptions: { minValue: 5 },
				default: 300,
				description:
					'How long to wait for the crawl before returning the job as still running',
			},
			{
				displayName: 'Path Prefix',
				name: 'pathPrefix',
				type: 'string',
				default: '',
				placeholder: 'e.g. /docs',
				description: 'Only crawl URLs whose path starts with this prefix',
			},
			{
				displayName: 'Use Sitemap',
				name: 'useSitemap',
				type: 'boolean',
				default: false,
				description:
					"Whether to also seed the crawl from the site's own sitemap.xml, which finds pages that no internal link points at. It costs one extra page.",
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['site'],
		operation: ['map'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

	const body: IDataObject = {
		url: this.getNodeParameter('url', itemIndex),
		maxPages: this.getNodeParameter('maxPages', itemIndex),
	};
	if (options.maxDepth !== undefined) {
		body.maxDepth = options.maxDepth;
	}
	if (options.pathPrefix !== undefined && options.pathPrefix !== '') {
		body.pathPrefix = options.pathPrefix;
	}
	if (options.budgetUsd !== undefined) {
		body.budgetUsd = options.budgetUsd;
	}
	if (options.useSitemap === true) {
		body.useSitemap = true;
	}

	const quoteResponse = await stringApiRequest(this, 'POST', '/sitemap', itemIndex, { body });
	const quote = quoteResponse.body as SitemapJob;

	// Nothing is crawled or charged until the quote is approved, so the quote
	// itself is the result when the operator has not asked for the crawl to start.
	if (this.getNodeParameter('approve', itemIndex) !== true) {
		return [{ json: quote as unknown as IDataObject, pairedItem: { item: itemIndex } }];
	}

	const approved = await approveSitemapJob(this, quote.jobId, itemIndex);

	if (this.getNodeParameter('waitForCompletion', itemIndex) !== true) {
		return [
			{
				json: { ...quote, ...approved } as unknown as IDataObject,
				pairedItem: { item: itemIndex },
			},
		];
	}

	const maxWaitSeconds = (options.maxWaitSeconds as number | undefined) ?? 300;
	const job = await waitForSitemapJob(this, quote.jobId, maxWaitSeconds, itemIndex);

	if (!isTerminal(job.status)) {
		return [
			{
				json: {
					...job,
					message: `The crawl is still running after ${maxWaitSeconds} seconds. Collect its URLs in a later step using this job ID.`,
				} as unknown as IDataObject,
				pairedItem: { item: itemIndex },
			},
		];
	}

	if (job.status === 'failed' || job.status === 'canceled') {
		return [{ json: job as unknown as IDataObject, pairedItem: { item: itemIndex } }];
	}

	// `completed` and `token_cap_exceeded` both leave the URLs found so far readable.
	const urls = await collectSitemapUrls(this, quote.jobId, itemIndex);

	return urls.map((url) => ({
		json: { jobId: quote.jobId, ...url },
		pairedItem: { item: itemIndex },
	}));
}
