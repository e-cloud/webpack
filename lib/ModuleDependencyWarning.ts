/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Module = require('./Module')

class ModuleDependencyWarning extends Error {
    details: string
    origin: Module

    constructor(public module: Module, public error: Error, loc) {
        super();
        Error.captureStackTrace(this, ModuleDependencyWarning);
        this.name = 'ModuleDependencyWarning';
        this.message = `${loc.start.line}:${loc.start.column} `;
        this.details = error.stack;
        this.message += error.message;
        this.origin = module;
    }
}

export = ModuleDependencyWarning;
