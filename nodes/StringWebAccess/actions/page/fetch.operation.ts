import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError, updateDisplayOptions } from 'n8n-workflow';

import { applyFetchOptions, buildHeaders } from '../../helpers/utils';
import { formatFetchResponse, stringApiRequest } from '../../transport';
import {
	countryCodeOption,
	customHeadersOption,
	ignoreCertificateErrorsOption,
	mainContentOnlyOption,
	markdownModeOption,
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
		placeholder: 'e.g. https://example.com/article',
		description: 'The HTTP or HTTPS address of the page to retrieve',
	},
	{
		displayName: 'Output Format',
		name: 'format',
		type: 'options',
		default: 'markdown',
		description: 'The shape the page is returned in',
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
			mainContentOnlyOption,
			markdownModeOption,
			{
				displayName: 'Render JavaScript',
				name: 'executeJS',
				type: 'boolean',
				default: false,
				description:
					'Whether to load the page in a browser first, for content that is drawn by script. Cannot be combined with custom headers.',
			},
			solveCaptchaOption,
		],
	},
];

const displayOptions = {
	show: {
		resource: ['page'],
		operation: ['fetch'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
	const format = this.getNodeParameter('format', itemIndex) as string;

	if (options.executeJS === true && buildHeaders(options) !== undefined) {
		throw new NodeOperationError(
			this.getNode(),
			"'Render JavaScript' and 'Custom Headers' cannot be used together",
			{
				description:
					'A browser-rendered fetch sends its own headers. Remove the custom headers, or turn off "Render JavaScript" to send them.',
				itemIndex,
			},
		);
	}

	const body: IDataObject = { url: this.getNodeParameter('url', itemIndex), format };
	applyFetchOptions(body, options);

	const response = await stringApiRequest(this, 'POST', '/fetch', itemIndex, {
		body,
		expectJson: format === 'json',
	});

	return [{ json: formatFetchResponse(response, format), pairedItem: { item: itemIndex } }];
}
