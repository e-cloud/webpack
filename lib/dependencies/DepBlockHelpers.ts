/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { WebpackOutputOptions } from '../../typings/webpack-types';
import RequestShortener = require('../RequestShortener')
import AsyncDependenciesBlock = require('../AsyncDependenciesBlock')

export function getLoadDepBlockWrapper(
    depBlock: AsyncDependenciesBlock,
    outputOptions: WebpackOutputOptions,
    requestShortener: RequestShortener,
    name: string
) {
    const promiseCode = getDepBlockPromise(depBlock, outputOptions, requestShortener, name);
    return [
        `${promiseCode}.then(`,
        ').catch(',
        ')'
    ];
}

export function getDepBlockPromise(
    depBlock: AsyncDependenciesBlock,
    outputOptions: WebpackOutputOptions,
    requestShortener: RequestShortener,
    name: string
) {
    if (depBlock.chunks) {
        const chunks = depBlock.chunks.filter(chunk => !chunk.hasRuntime() && chunk.id !== null);
        if (chunks.length === 1) {
            const chunk = chunks[0];
            return `__webpack_require__.e${asComment(name)}(${JSON.stringify(chunk.id)}${
                outputOptions.pathinfo && depBlock.chunkName
                    ? `/*! ${requestShortener.shorten(depBlock.chunkName)} */`
                    : ''
                }${asComment(depBlock.chunkReason)})`;
        }
        else if (chunks.length > 0) {
            return `Promise.all${asComment(name)}(${outputOptions.pathinfo && depBlock.chunkName
                ? '/*! ' + requestShortener.shorten(depBlock.chunkName) + ' */'
                : ''}[${chunks.map(chunk => `__webpack_require__.e(${JSON.stringify(chunk.id)})`).join(', ')}])`;
        }
    }
    return 'new Promise(function(resolve) { resolve(); })';
}

function asComment(str: string) {
    if (!str) {
        return '';
    }
    return `/* ${str} */`;
}
