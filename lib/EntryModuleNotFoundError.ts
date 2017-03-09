/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleNotFoundError = require('./ModuleNotFoundError');

class EntryModuleNotFoundError extends Error {
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
