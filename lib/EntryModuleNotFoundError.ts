/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class EntryModuleNotFoundError extends Error {
    details

    constructor(public error: Error & { details: string }) {
        super();
        Error.captureStackTrace(this, EntryModuleNotFoundError);
        this.name = 'EntryModuleNotFoundError';
        this.message = `Entry module not found: ${error}`;
        this.details = error.details;
    }
}

export = EntryModuleNotFoundError;
