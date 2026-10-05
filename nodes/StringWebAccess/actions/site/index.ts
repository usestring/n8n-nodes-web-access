import type { INodeProperties } from 'n8n-workflow';

import * as map from './map.operation';

export { map };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'map',
		displayOptions: { show: { resource: ['site'] } },
		options: [
			{
				name: 'Map',
				value: 'map',
				description: 'Discover every URL on one site from a single starting point',
				action: 'Map a site',
			},
		],
	},
	...map.description,
];
