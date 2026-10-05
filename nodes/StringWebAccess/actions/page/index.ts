import type { INodeProperties } from 'n8n-workflow';

import * as fetch from './fetch.operation';
import * as sendRequest from './sendRequest.operation';

export { fetch, sendRequest };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'fetch',
		displayOptions: { show: { resource: ['page'] } },
		options: [
			{
				name: 'Fetch',
				value: 'fetch',
				description: 'Retrieve a page as Markdown, JSON or its original body',
				action: 'Fetch a URL',
			},
			{
				name: 'Send Request',
				value: 'sendRequest',
				description: 'Send a POST, PUT or PATCH request to a URL and return the response',
				action: 'Send a request to a URL',
			},
		],
	},
	...fetch.description,
	...sendRequest.description,
];
