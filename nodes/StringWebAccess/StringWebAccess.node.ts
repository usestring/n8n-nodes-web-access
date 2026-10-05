import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import * as page from './actions/page';
import { router } from './actions/router';
import * as site from './actions/site';
import * as web from './actions/web';

export class StringWebAccess implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'String Web Access',
		name: 'stringWebAccess',
		icon: {
			light: 'file:../../icons/stringWebAccess.svg',
			dark: 'file:../../icons/stringWebAccess.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Search the web, fetch any URL and map a site as clean, LLM-ready Markdown',
		defaults: {
			name: 'String Web Access',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'stringWebAccessApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'page',
				options: [
					{ name: 'Page', value: 'page' },
					{ name: 'Site', value: 'site' },
					{ name: 'Web', value: 'web' },
				],
			},
			...page.description,
			...site.description,
			...web.description,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await router.call(this);
	}
}
