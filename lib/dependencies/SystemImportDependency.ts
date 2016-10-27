/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');
import DepBlockHelpers = require('./DepBlockHelpers');
import WebpackMissingModule = require('./WebpackMissingModule');

class Template {
    apply(dep, source, outputOptions, requestShortener) {
        const depBlock = dep.block;
        const promise = DepBlockHelpers.getDepBlockPromise(depBlock, outputOptions, requestShortener, 'System.import');
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

class SystemImportDependency extends ModuleDependency {
    constructor(request, block) {
        super(request);
        this.block = block;
    }

    static Template = Template
}

SystemImportDependency.prototype.type = 'System.import';

export = SystemImportDependency;
