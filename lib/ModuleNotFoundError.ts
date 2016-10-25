/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class ModuleNotFoundError extends Error {
	constructor(module, err, dependencies) {
		super();
		Error.captureStackTrace(this, ModuleNotFoundError);
		this.name = 'ModuleNotFoundError';
		this.message = `Module not found: ${err}`;
		this.details = err.details;
		this.missing = err.missing;
		this.module = module;
		this.origin = module;
		this.dependencies = dependencies;
		this.error = err;
	}
}

export = ModuleNotFoundError;
