/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Module = require('./Module')

class ModuleParseError extends Error {
    module: Module
    error: Error

    constructor(module, source, err) {
        super();
        Error.captureStackTrace(this, ModuleParseError);
        this.name = 'ModuleParseError';
        this.message = `Module parse failed: ${module.request} ${err.message}`;
        this.message += '\nYou may need an appropriate loader to handle this file type.';
        if (err.loc && typeof err.loc === 'object' && typeof err.loc.line === 'number') {
            const lineNumber = err.loc.line;
            if (/[\0\u0001\u0002\u0003\u0004\u0005\u0006\u0007]/.test(source)) {
                // binary file
                this.message += '\n(Source code omitted for this binary file)';
            }
            else {
                source = source.split('\n');
                this.message += `\n| ${source.slice(Math.max(0, lineNumber - 3), lineNumber + 2).join('\n| ')}`;
            }
        }
        else {
            this.message += `\n${err.stack}`;
        }
        this.module = module;
        this.error = err;
    }
}

export = ModuleParseError;
