/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class ModuleError extends Error {
    constructor(module, err) {
        super();
        Error.captureStackTrace(this, ModuleError);
        // todo: some other class use string properties in prototype, but here is not
        this.name = 'ModuleError';
        this.module = module;
        this.message = err;
        this.error = err;
    }
}

export = ModuleError;
