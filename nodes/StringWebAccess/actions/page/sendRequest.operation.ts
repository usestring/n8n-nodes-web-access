import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { applyFetchOptions } from '../../helpers/utils';
import { formatFetchResponse, stringApiRequest } from '../../transport';
import {
	countryCodeOption,
	customHeadersOption,
	ignoreCertificateErrorsOption,
	outputFormatOptions,
	solveCaptchaOption,
} from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. https://example.com/api/orders',
		description: 'The HTTP or HTTPS address to send the request to',
	},
	{
		displayName: 'Method',
		name: 'method',
		type: 'options',
		default: 'POST',
		description: 'The HTTP method to send',
		options: [
			{ name: 'PATCH', value: 'PATCH' },
			{ name: 'POST', value: 'POST' },
			{ name: 'PUT', value: 'PUT' },
		],
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		placeholder: 'e.g. {"sku":"A-1","quantity":2}',
		description:
			'The request body, sent to the destination as typed. Leave empty to send no body.',
	},
	{
		displayName: 'Output Format',
		name: 'format',
		type: 'options',
		default: 'json',
		description: 'The shape the response is returned in',
		options: outputFormatOptions,
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			countryCodeOption,
			customHeadersOption,
			ignoreCertificateErrorsOption,
			solveCaptchaOption,
		],
	},
];

const displayOptions = {
	show: {
		resource: ['page'],
		operation: ['sendRequest'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
	const format = this.getNodeParameter('format', itemIndex) as string;
	const requestBody = this.getNodeParameter('body', itemIndex) as string;

	const body: IDataObject = {
		url: this.getNodeParameter('url', itemIndex),
		method: this.getNodeParameter('method', itemIndex),
		format,
	};
	if (requestBody !== '') {
		body.body = requestBody;
	}
	applyFetchOptions(body, options);

	const response = await stringApiRequest(this, 'POST', '/fetch', itemIndex, {
		body,
		expectJson: format === 'json',
	});

	return [{ json: formatFetchResponse(response, format), pairedItem: { item: itemIndex } }];
}
