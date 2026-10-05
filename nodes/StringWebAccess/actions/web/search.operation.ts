import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { stringApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. automation',
		description: 'The search query to run',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		default: true,
		description:
			'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				placeholder: 'e.g. GB',
				description: 'Two-letter ISO 3166-1 country used to localize the results',
			},
			{
				displayName: 'Engine',
				name: 'engine',
				type: 'options',
				default: 'google',
				description: 'The search engine to query',
				options: [
					{ name: 'Brave', value: 'brave' },
					{ name: 'DuckDuckGo', value: 'duckduckgo' },
					{ name: 'Google', value: 'google' },
					{ name: 'Mojeek', value: 'mojeek' },
				],
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				placeholder: 'e.g. en',
				description: 'Language tag used to localize the results, such as "en" or "pt-br"',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['web'],
		operation: ['search'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
	const simple = this.getNodeParameter('simple', itemIndex) as boolean;

	const body: IDataObject = { query: this.getNodeParameter('query', itemIndex) };
	if (options.engine !== undefined) {
		body.engine = options.engine;
	}
	if (options.country !== undefined && options.country !== '') {
		body.country = options.country;
	}
	if (options.language !== undefined && options.language !== '') {
		body.language = options.language;
	}

	const response = await stringApiRequest(this, 'POST', '/search', itemIndex, { body });
	const payload = response.body as IDataObject;

	if (!simple) {
		return [{ json: payload, pairedItem: { item: itemIndex } }];
	}

	const limit = options.limit as number | undefined;
	const results = (payload.results ?? []) as IDataObject[];
	const trimmed = limit === undefined ? results : results.slice(0, limit);

	return trimmed.map((result) => ({ json: result, pairedItem: { item: itemIndex } }));
}
