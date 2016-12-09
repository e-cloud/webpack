/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');
import DepBlockHelpers = require('./DepBlockHelpers');
import WebpackMissingModule = require('./WebpackMissingModule');
import RequestShortener = require('../RequestShortener')
import { WebpackOutputOptions } from '../../typings/webpack-types'
import { ReplaceSource } from 'webpack-sources'
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
        let comment = '';
        if (outputOptions.pathinfo) {
            comment = `/*! ${requestShortener.shorten(dep.request)} */ `;
        }
        if (promise && dep.module) {
            source.replace(depBlock.range[0], depBlock.range[1] - 1, `${promise}.then(__webpack_require__.bind(null, ${comment}${JSON.stringify(dep.module.id)}))`);
        }
        else if (dep.module) {
            source.replace(depBlock.range[0], depBlock.range[1] - 1, `Promise.resolve(__webpack_require__(${comment}${JSON.stringify(dep.module.id)}))`);
        }
        else {
            source.replace(depBlock.range[0], depBlock.range[1] - 1, WebpackMissingModule.promise(dep.request));
        }
    }
}

class ImportDependency extends ModuleDependency {
    constructor(request: string, public block: ImportDependenciesBlock) {
        super(request);
    }

    static Template = Template
}

ImportDependency.prototype.type = 'import()';

export = ImportDependency;
