/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Module = require('./Module')

class ModuleWarning extends Error {
    constructor(public module: Module, public warning: string) {
        super();
        this.name = 'ModuleWarning';
        this.message = warning;
        Error.captureStackTrace(this, this.constructor);
    }
}

export = ModuleWarning;
