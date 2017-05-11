/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Dependency = require('./Dependency')
import Module = require('./Module')
import { ResolveError } from 'enhanced-resolve/lib/common-types'
import WebpackError = require('./WebpackError');

class ModuleNotFoundError extends WebpackError {
    details: string
    missing: string[]
    origin: Module

    constructor(public module: Module, public err: ResolveError, public dependencies: Dependency[]) {
        super();
        this.name = 'ModuleNotFoundError';
        this.message = `Module not found: ${err}`;
        this.details = err.details;
        this.missing = err.missing;
        this.origin = module;
        Error.captureStackTrace(this, this.constructor);
    }
}

export = ModuleNotFoundError;
