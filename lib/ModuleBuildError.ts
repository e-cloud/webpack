/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Module = require('./Module')
import { cutOffLoaderExecution } from './ErrorHelpers';
import WebpackError = require('./WebpackError');

class ModuleBuildError extends WebpackError {
    details: string

    constructor(public module: Module, public err: Error & { hideStack?: boolean }) {
        super();
        this.name = 'ModuleBuildError';
        this.message = 'Module build failed: ';
        if (err !== null && typeof err === 'object') {
            if (typeof err.stack === 'string' && err.stack) {
                const stack = cutOffLoaderExecution(err.stack);
                if (!err.hideStack) {
                    this.message += stack;
                }
                else {
                    this.details = stack;
                    if (typeof err.message === 'string' && err.message) {
                        this.message += err.message;
                    }
                    else {
                        this.message += err;
                    }
                }
            }
            else if (typeof err.message === 'string' && err.message) {
                this.message += err.message;
            }
            else {
                this.message += err;
            }
        }
        Error.captureStackTrace(this, this.constructor);
    }
}

export = ModuleBuildError;
