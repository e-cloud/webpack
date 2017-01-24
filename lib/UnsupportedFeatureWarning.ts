/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Module = require('./Module')

class UnsupportedFeatureWarning extends Error {
    origin: Module
    name = 'UnsupportedFeatureWarning'

    constructor(public module: Module, public message: string) {
        super();
        if (Error.hasOwnProperty('captureStackTrace')) {
            Error.captureStackTrace(this, this.constructor);
        }
        this.origin = module;
    }
}

export = UnsupportedFeatureWarning;
