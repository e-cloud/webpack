/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Module = require('./Module')
import { SourceLocation } from 'estree'
import formatLocation = require('./formatLocation')

class ModuleDependencyWarning extends Error {
    details: string
    origin: Module

    constructor(public module: Module, public error: Error, loc: SourceLocation | string) {
        super();
        if (Error.hasOwnProperty('captureStackTrace')) {
            Error.captureStackTrace(this, this.constructor);
        }
        this.name = 'ModuleDependencyWarning';
        this.message = `${formatLocation(loc)} ${error.message}`;
        this.details = error.stack.split('\n').slice(1).join('\n');
        this.origin = module;
    }
}

export = ModuleDependencyWarning;
