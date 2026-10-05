import type { IExecuteFunctions, INodeExecutionData, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import * as page from './page';
import * as site from './site';
import * as web from './web';

async function runOperation(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	switch (`${resource}:${operation}`) {
		case 'page:fetch':
			return await page.fetch.execute.call(this, itemIndex);
		case 'page:sendRequest':
			return await page.sendRequest.execute.call(this, itemIndex);
		case 'web:search':
			return await web.search.execute.call(this, itemIndex);
		case 'site:map':
			return await site.map.execute.call(this, itemIndex);
		default:
			throw new NodeOperationError(
				this.getNode(),
				`This node cannot run '${operation}' on a ${resource}`,
				{
					description:
						'Pick one of the listed operations for the chosen resource. If the workflow sets these with an expression, check that it produces a supported pair.',
					itemIndex,
				},
			);
	}
}

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const resource = this.getNodeParameter('resource', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;

			returnData.push(...(await runOperation.call(this, resource, operation, i)));
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: { error: (error as Error).message },
					pairedItem: { item: i },
				});
				continue;
			}

			// Validation and transport already raise node errors that carry a
			// description; anything else is an unexpected failure to wrap.
			const failure =
				error instanceof NodeApiError || error instanceof NodeOperationError
					? error
					: new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });

			throw failure;
		}
	}

	return [returnData];
}
