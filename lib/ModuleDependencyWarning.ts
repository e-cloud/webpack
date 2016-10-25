/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class ModuleDependencyWarning extends Error {
	constructor(module, err, loc) {
		super();
		Error.captureStackTrace(this, ModuleDependencyWarning);
		this.name = 'ModuleDependencyWarning';
		this.message = `${loc.start.line}:${loc.start.column} `;
		this.details = err.stack;
		this.message += err.message;
		this.origin = this.module = module;
		this.error = err;
	}
}

export = ModuleDependencyWarning;
