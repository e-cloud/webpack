/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');
import DepBlockHelpers = require('./DepBlockHelpers');
import WebpackMissingModule = require('./WebpackMissingModule');
import RequestShortener = require('../RequestShortener')
import { ReplaceSource } from 'webpack-sources';
import { WebpackOutputOptions } from '../../typings/webpack-types';
import ImportDependenciesBlock = require('./ImportDependenciesBlock')

class Template {
    apply(
        dep: ImportDependency,
        source: ReplaceSource,
        outputOptions: WebpackOutputOptions,
        requestShortener: RequestShortener
    ) {
        const depBlock = dep.block;
        const promise = DepBlockHelpers.getDepBlockPromise(depBlock, outputOptions, requestShortener, 'import()');
        const comment = this.getOptionalComment(outputOptions.pathinfo, requestShortener.shorten(dep.request));

        const content = this.getContent(promise, dep, comment);
        source.replace(depBlock.range[0], depBlock.range[1] - 1, content);
    }

    getOptionalComment(pathinfo: boolean, shortenedRequest: string) {
        if (!pathinfo) {
            return '';
        }

        return `/*! ${shortenedRequest} */ `;
    }

    getContent(promise: string, dep: ImportDependency, comment: string) {
        if (promise && dep.module) {
            const stringifiedId = JSON.stringify(dep.module.id);
            return `${promise}.then(__webpack_require__.bind(null, ${comment}${stringifiedId}))`;
        }

        if (dep.module) {
            const stringifiedId = JSON.stringify(dep.module.id);
            return `new Promise(function(resolve) { resolve(__webpack_require__(${comment}${stringifiedId})); })`;
        }

        return WebpackMissingModule.promise(dep.request);
    }
}

class ImportDependency extends ModuleDependency {
    constructor(request: string, public block: ImportDependenciesBlock) {
        super(request);
    }

    get type() {
        return 'import()';
    }

    static Template = Template;
}

export = ImportDependency;
