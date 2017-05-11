/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleNotFoundError = require('./ModuleNotFoundError');
import WebpackError = require('./WebpackError');

class EntryModuleNotFoundError extends WebpackError {
    details: string

    constructor(public error: ModuleNotFoundError) {
        super();
        this.name = 'EntryModuleNotFoundError';
        this.message = `Entry module not found: ${error}`;
        this.details = error.details;
        Error.captureStackTrace(this, this.constructor);
    }
}

export = EntryModuleNotFoundError;
