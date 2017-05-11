/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
'use strict';

import formatLocation = require('./formatLocation');
import Module = require('./Module')
import { SourceLocation } from 'estree'
import WebpackError = require('./WebpackError');

export = class ModuleDependencyError extends WebpackError {
    details: string
    origin: Module

    constructor(public module: Module, public error: Error, loc: SourceLocation) {
        super();
        this.name = 'ModuleDependencyError';

        this.message = `${ formatLocation(loc) } ${ error.message }`;
        this.details = error.stack.split('\n').slice(1).join('\n');
        this.origin = module;
        Error.captureStackTrace(this, this.constructor);
    }
};
