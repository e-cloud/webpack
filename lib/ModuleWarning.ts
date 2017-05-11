/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Module = require('./Module')
import { cleanUp } from './ErrorHelpers';
import WebpackError = require('./WebpackError');

class ModuleWarning extends WebpackError {
    details: string[]

    constructor(public module: Module, public warning: Error) {
        super();
        this.name = 'ModuleWarning';
        this.message = warning && typeof warning === 'object' && warning.message ? warning.message : warning;
        this.warning = warning;
        this.details = warning && typeof warning === 'object' && warning.stack
            ? cleanUp(warning.stack, this.message)
            : undefined;

        Error.captureStackTrace(this, this.constructor);
    }
}

export = ModuleWarning;
