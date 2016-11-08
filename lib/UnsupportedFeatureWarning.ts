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
        Error.captureStackTrace(this, UnsupportedFeatureWarning);
        this.origin = module;
    }
}

export = UnsupportedFeatureWarning;
