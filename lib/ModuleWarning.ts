/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class ModuleWarning extends Error {
    constructor(public module, public warning) {
        super();
        Error.captureStackTrace(this, ModuleWarning);
        this.name = 'ModuleWarning';
        this.message = warning;
    }
}

export = ModuleWarning;
