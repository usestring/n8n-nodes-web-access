import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

export const outputFormatOptions: INodePropertyOptions[] = [
	{
		name: 'JSON',
		value: 'json',
		description: "An envelope with the destination's status, headers and body",
	},
	{ name: 'Markdown', value: 'markdown', description: 'Clean, LLM-ready Markdown' },
	{ name: 'Raw', value: 'raw', description: 'The original body, unchanged' },
];

export const customHeadersOption: INodeProperties = {
	displayName: 'Custom Headers',
	name: 'headers',
	type: 'fixedCollection',
	typeOptions: { multipleValues: true },
	placeholder: 'Add Header',
	default: {},
	description:
		'Headers to send to the destination. Cannot be combined with rendering JavaScript.',
	options: [
		{
			displayName: 'Header',
			name: 'header',
			values: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
					placeholder: 'e.g. Accept-Language',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
					placeholder: 'e.g. en-US',
				},
			],
		},
	],
};

export const countryCodeOption: INodeProperties = {
	displayName: 'Country Code',
	name: 'countryCode',
	type: 'string',
	default: '',
	placeholder: 'e.g. US',
	description:
		'Two-letter ISO 3166-1 country to route the request through, for pages that vary by location',
};

export const solveCaptchaOption: INodeProperties = {
	displayName: 'Solve CAPTCHA',
	name: 'solveCaptcha',
	type: 'boolean',
	default: true,
	description:
		'Whether to solve a CAPTCHA when the destination presents one. Turn this off to fail fast instead.',
};

export const ignoreCertificateErrorsOption: INodeProperties = {
	displayName: 'Ignore Certificate Errors',
	name: 'ignoreCertificateErrors',
	type: 'boolean',
	default: false,
	description:
		'Whether to accept an expired, self-signed or mismatched TLS certificate. This drops the guarantee that the response came from the destination, so leave it off for anything you act on as authoritative.',
};

export const markdownModeOption: INodeProperties = {
	displayName: 'Markdown Mode',
	name: 'markdownMode',
	type: 'options',
	default: 'full',
	description: 'How much of the page structure to keep when converting to Markdown',
	options: [
		{ name: 'Full', value: 'full', description: 'Keep the whole document' },
		{ name: 'Readable', value: 'readable', description: 'Keep the prose and drop fine structure' },
	],
};

export const mainContentOnlyOption: INodeProperties = {
	displayName: 'Main Content Only',
	name: 'mainContentOnly',
	type: 'boolean',
	default: false,
	description:
		'Whether to drop navigation, headers and footers and keep the body of the page',
};
