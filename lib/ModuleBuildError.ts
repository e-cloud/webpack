/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Module = require('./Module')

const loaderFlag = 'LOADER_EXECUTION';

class ModuleBuildError extends Error {
    details: string

    constructor(public module: Module, public err: Error) {
        super();
        Error.captureStackTrace(this, ModuleBuildError);
        this.name = 'ModuleBuildError';
        this.message = 'Module build failed: ';
        if (err !== null && typeof err === 'object') {
            if (typeof err.stack === 'string' && err.stack) {
                let stack = err.stack.split('\n');
                for (let i = 0; i < stack.length; i++) if (stack[i].includes(loaderFlag)) {
                    stack.length = i;
                }
                const stackStr = stack.join('\n');
                if (!err.hideStack) {
                    this.message += stackStr;
                }
                else {
                    this.details = stackStr;
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
    }
}

export = ModuleBuildError;
