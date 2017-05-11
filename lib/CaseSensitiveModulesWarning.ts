/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Module = require('./Module')
import WebpackError = require('./WebpackError');

class CaseSensitiveModulesWarning extends WebpackError {
    origin: Module
    module: Module

    constructor(modules: Module[]) {
        super();
        Object.setPrototypeOf(this, CaseSensitiveModulesWarning.prototype);
        this.name = 'CaseSensitiveModulesWarning';

        const sortedModules = this._sort(modules);
        const modulesList = this._moduleMessages(sortedModules);

        this.message = `There are multiple modules with names that only differ in casing.
This can lead to unexpected behavior when compiling on a filesystem with other case-semantic.
Use equal casing. Compare these module identifiers:
${modulesList}`;
        this.origin = this.module = sortedModules[0];
        Error.captureStackTrace(this, this.constructor);
    }

    _sort(modules: Module[]) {
        return modules.slice().sort((a, b) => {
            const aId = a.identifier();
            const bId = b.identifier();
            /* istanbul ignore next */
            if (aId < bId) return -1;
            /* istanbul ignore next */
            if (aId > bId) return 1;
            /* istanbul ignore next */
            return 0;
        });
    }

    _moduleMessages(modules: Module[]) {
        return modules.map((m) => {
            let message = `* ${m.identifier()}`;
            const validReasons = m.reasons.filter((reason) => reason.module);

            if (validReasons.length > 0) {
                message += `\n    Used by ${validReasons.length} module(s), i. e.`;
                message += `\n    ${validReasons[0].module.identifier()}`;
            }
            return message;
        }).join('\n');
    }
}

export = CaseSensitiveModulesWarning;
