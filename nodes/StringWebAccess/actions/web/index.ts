import type { INodeProperties } from 'n8n-workflow';

import * as search from './search.operation';

export { search };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'search',
		displayOptions: { show: { resource: ['web'] } },
		options: [
			{
				name: 'Search',
				value: 'search',
				description: 'Retrieve ranked organic results for a query',
				action: 'Search the web',
			},
		],
	},
	...search.description,
];
