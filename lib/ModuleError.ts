/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Module = require('./Module')
import { cleanUp } from './ErrorHelpers';
import WebpackError = require('./WebpackError');

class ModuleError extends WebpackError {
    name: string;
    message: string;
    error: Error
    details: string[]

    constructor(public module: Module, public  err: Error) {
        super();
        // todo: some other class use string properties in prototype, but here is not
        this.name = 'ModuleError';
        this.message = err && typeof err === 'object' && err.message ? err.message : err;
        this.error = err;
        this.details = err && typeof err === 'object' && err.stack ? cleanUp(err.stack, this.message) : undefined;
        Error.captureStackTrace(this, this.constructor);
    }
}

export = ModuleError;
