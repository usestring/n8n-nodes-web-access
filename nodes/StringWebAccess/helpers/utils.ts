import type { IDataObject } from 'n8n-workflow';

type HeaderEntry = { name: string; value: string };

export function buildHeaders(options: IDataObject): IDataObject | undefined {
	const collection = options.headers as { header?: HeaderEntry[] } | undefined;
	const entries = collection?.header ?? [];

	const headers: IDataObject = {};
	for (const entry of entries) {
		if (entry.name !== '') {
			headers[entry.name] = entry.value;
		}
	}

	return Object.keys(headers).length === 0 ? undefined : headers;
}

/**
 * Copies the shared /fetch options onto a request body, leaving out anything
 * the operator did not set so the API's own defaults apply.
 */
export function applyFetchOptions(body: IDataObject, options: IDataObject): void {
	const headers = buildHeaders(options);
	if (headers !== undefined) {
		body.headers = headers;
	}
	if (options.countryCode !== undefined && options.countryCode !== '') {
		body.countryCode = options.countryCode;
	}
	if (options.solveCaptcha !== undefined) {
		body.solveCaptcha = options.solveCaptcha;
	}
	if (options.ignoreCertificateErrors === true) {
		body.ignoreCertificateErrors = true;
	}
	if (options.executeJS === true) {
		body.executeJS = true;
	}
	if (options.markdownMode !== undefined) {
		body.markdownMode = options.markdownMode;
	}
	if (options.mainContentOnly !== undefined) {
		body.mainContentOnly = options.mainContentOnly;
	}
}
