/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class ModuleWarning extends Error {
	constructor(module, warning) {
		super();
		Error.captureStackTrace(this, ModuleWarning);
		this.name = 'ModuleWarning';
		this.module = module;
		this.message = warning;
		this.warning = warning;
	}
}

export = ModuleWarning;
