/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class UnsupportedFeatureWarning extends Error {
    constructor(module, message) {
        super();
        Error.captureStackTrace(this, UnsupportedFeatureWarning);
        this.name = 'UnsupportedFeatureWarning';
        this.message = message;
        this.origin = this.module = module;
    }
}

export = UnsupportedFeatureWarning;
