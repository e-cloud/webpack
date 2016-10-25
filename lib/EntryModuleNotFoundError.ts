/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class EntryModuleNotFoundError extends Error {
	constructor(err) {
		super();
		Error.captureStackTrace(this, EntryModuleNotFoundError);
		this.name = 'EntryModuleNotFoundError';
		this.message = `Entry module not found: ${err}`;
		this.details = err.details;
		this.error = err;
	}
}

export = EntryModuleNotFoundError;
