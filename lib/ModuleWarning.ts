/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Module = require('./Module')

class ModuleWarning extends Error {
    constructor(public module: Module, public warning: string) {
        super();
        Error.captureStackTrace(this, ModuleWarning);
        this.name = 'ModuleWarning';
        this.message = warning;
    }
}

export = ModuleWarning;
